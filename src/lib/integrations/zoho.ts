import "server-only";

import { db } from "@/lib/db";

const ZOHO_AUTH_URL = "https://accounts.zoho.in/oauth/v2/auth";
const ZOHO_TOKEN_URL = "https://accounts.zoho.in/oauth/v2/token";
const ZOHO_API_BASE = "https://www.zohoapis.in/books/v3";
const ZOHO_REVOKE_URL = "https://accounts.zoho.in/oauth/v2/token/revoke";

function getClientCredentials() {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const redirectUri = process.env.ZOHO_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Zoho OAuth credentials not configured");
  }
  return { clientId, clientSecret, redirectUri };
}

export function getAuthUrl(state: string): string {
  const { clientId, redirectUri } = getClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "ZohoBooks.invoices.CREATE,ZohoBooks.invoices.READ",
    state,
    access_type: "offline",
    prompt: "consent",
  });
  return `${ZOHO_AUTH_URL}?${params.toString()}`;
}

export async function handleCallback(
  orgId: string,
  code: string
): Promise<void> {
  const { clientId, clientSecret, redirectUri } = getClientCredentials();

  const res = await fetch(ZOHO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoho token exchange failed: ${body}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Fetch Zoho organization ID
  const orgsRes = await fetch(`${ZOHO_API_BASE}/organizations`, {
    headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` },
  });

  let externalOrgId: string | null = null;
  if (orgsRes.ok) {
    const orgsData = (await orgsRes.json()) as {
      organizations?: { organization_id: string }[];
    };
    externalOrgId = orgsData.organizations?.[0]?.organization_id ?? null;
  }

  await db.orgIntegration.upsert({
    where: { orgId_provider: { orgId, provider: "zoho" } },
    create: {
      orgId,
      provider: "zoho",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      externalOrgId,
      isActive: true,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      externalOrgId,
      isActive: true,
    },
  });
}

export async function refreshTokenIfNeeded(orgId: string): Promise<string> {
  const integration = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId, provider: "zoho" } },
  });

  if (!integration || !integration.isActive) {
    throw new Error("Zoho integration not found or inactive");
  }

  const fiveMinutes = 5 * 60 * 1000;
  if (integration.tokenExpiresAt.getTime() - Date.now() > fiveMinutes) {
    return integration.accessToken;
  }

  const { clientId, clientSecret } = getClientCredentials();

  const res = await fetch(ZOHO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: integration.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error("Zoho token refresh failed");
  }

  const tokens = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  await db.orgIntegration.update({
    where: { orgId_provider: { orgId, provider: "zoho" } },
    data: {
      accessToken: tokens.access_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return tokens.access_token;
}

export async function syncInvoices(orgId: string): Promise<{ synced: number }> {
  const accessToken = await refreshTokenIfNeeded(orgId);

  const integration = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId, provider: "zoho" } },
  });

  if (!integration?.externalOrgId) {
    throw new Error("Zoho organization ID not found");
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
    const zohoInvoice = {
      customer_name: inv.customer?.name ?? "Cash Customer",
      invoice_number: inv.invoiceNumber,
      date: inv.invoiceDate,
      line_items: inv.lineItems.map((item) => ({
        name: item.description,
        description: item.description,
        quantity: item.quantity,
        rate: item.unitPrice,
        tax_percentage: item.taxRate,
        discount: item.discount,
      })),
    };

    const res = await fetch(
      `${ZOHO_API_BASE}/invoices?organization_id=${integration.externalOrgId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ invoice: zohoInvoice }),
      }
    );

    if (res.ok) {
      synced++;
    } else {
      const errBody = await res.text();
      console.error(`Zoho sync failed for ${inv.invoiceNumber}:`, errBody);
    }
  }

  await db.orgIntegration.update({
    where: { orgId_provider: { orgId, provider: "zoho" } },
    data: { lastSyncAt: new Date() },
  });

  return { synced };
}

export async function disconnect(orgId: string): Promise<void> {
  const integration = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId, provider: "zoho" } },
  });

  if (!integration) return;

  try {
    await fetch(
      `${ZOHO_REVOKE_URL}?token=${integration.refreshToken}`,
      { method: "POST" }
    );
  } catch {
    // Best-effort revocation
  }

  await db.orgIntegration.update({
    where: { orgId_provider: { orgId, provider: "zoho" } },
    data: { isActive: false },
  });
}
