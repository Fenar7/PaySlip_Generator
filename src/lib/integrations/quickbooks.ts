import "server-only";

import { db } from "@/lib/db";

const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_API_BASE = "https://quickbooks.api.intuit.com/v3";
const QB_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

function getClientCredentials() {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("QuickBooks OAuth credentials not configured");
  }
  return { clientId, clientSecret, redirectUri };
}

export function getAuthUrl(state: string): string {
  const { clientId, redirectUri } = getClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state,
  });
  return `${QB_AUTH_URL}?${params.toString()}`;
}

export async function handleCallback(
  orgId: string,
  code: string,
  realmId: string
): Promise<void> {
  const { clientId, clientSecret, redirectUri } = getClientCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QuickBooks token exchange failed: ${body}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await db.orgIntegration.upsert({
    where: { orgId_provider: { orgId, provider: "quickbooks" } },
    create: {
      orgId,
      provider: "quickbooks",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      externalOrgId: realmId,
      isActive: true,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      externalOrgId: realmId,
      isActive: true,
    },
  });
}

export async function refreshTokenIfNeeded(orgId: string): Promise<string> {
  const integration = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId, provider: "quickbooks" } },
  });

  if (!integration || !integration.isActive) {
    throw new Error("QuickBooks integration not found or inactive");
  }

  // Refresh if token expires within 5 minutes
  const fiveMinutes = 5 * 60 * 1000;
  if (integration.tokenExpiresAt.getTime() - Date.now() > fiveMinutes) {
    return integration.accessToken;
  }

  const { clientId, clientSecret } = getClientCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: integration.refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error("QuickBooks token refresh failed");
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await db.orgIntegration.update({
    where: { orgId_provider: { orgId, provider: "quickbooks" } },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return tokens.access_token;
}

export async function syncInvoices(orgId: string): Promise<{ synced: number }> {
  const accessToken = await refreshTokenIfNeeded(orgId);

  const integration = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId, provider: "quickbooks" } },
  });

  if (!integration?.externalOrgId) {
    throw new Error("QuickBooks realm ID not found");
  }

  const invoices = await db.invoice.findMany({
    where: { organizationId: orgId, status: "ISSUED" },
    include: {
      lineItems: true,
      customer: true,
    },
  });

  let synced = 0;

  for (const inv of invoices) {
    const qbInvoice = {
      Line: inv.lineItems.map((item, idx) => ({
        LineNum: idx + 1,
        Amount: item.amount,
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { name: item.description },
          Qty: item.quantity,
          UnitPrice: item.unitPrice,
          TaxCodeRef: { value: item.taxRate > 0 ? "TAX" : "NON" },
        },
        Description: item.description,
      })),
      CustomerRef: {
        name: inv.customer?.name ?? "Cash Customer",
      },
      DocNumber: inv.invoiceNumber,
      TxnDate: inv.invoiceDate,
      TotalAmt: inv.totalAmount,
    };

    const res = await fetch(
      `${QB_API_BASE}/company/${integration.externalOrgId}/invoice?minorversion=65`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(qbInvoice),
      }
    );

    if (res.ok) {
      synced++;
    } else {
      const errBody = await res.text();
      console.error(`QuickBooks sync failed for ${inv.invoiceNumber}:`, errBody);
    }
  }

  await db.orgIntegration.update({
    where: { orgId_provider: { orgId, provider: "quickbooks" } },
    data: { lastSyncAt: new Date() },
  });

  return { synced };
}

export async function disconnect(orgId: string): Promise<void> {
  const integration = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId, provider: "quickbooks" } },
  });

  if (!integration) return;

  const { clientId, clientSecret } = getClientCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    await fetch(QB_REVOKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({ token: integration.refreshToken }),
    });
  } catch {
    // Best-effort revocation
  }

  await db.orgIntegration.update({
    where: { orgId_provider: { orgId, provider: "quickbooks" } },
    data: { isActive: false },
  });
}
