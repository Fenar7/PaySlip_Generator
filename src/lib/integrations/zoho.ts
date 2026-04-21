import "server-only";

import { db } from "@/lib/db";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  mergeIntegrationConfig,
} from "@/lib/integrations/secrets";

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

  const existing = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId, provider: "zoho" } },
    select: { config: true },
  });
  const connectedAt = new Date().toISOString();

  await db.orgIntegration.upsert({
    where: { orgId_provider: { orgId, provider: "zoho" } },
    create: {
      orgId,
      provider: "zoho",
      accessToken: encryptIntegrationSecret(tokens.access_token),
      refreshToken: encryptIntegrationSecret(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      externalOrgId,
      config: mergeIntegrationConfig(undefined, {
        connectedAt,
        disconnectedAt: null,
        connectionStatus: "connected",
        credentialVersion: "encrypted_v1",
        lastSyncStatus: "connected",
        lastSyncError: null,
      }),
      isActive: true,
    },
    update: {
      accessToken: encryptIntegrationSecret(tokens.access_token),
      refreshToken: encryptIntegrationSecret(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      externalOrgId,
      config: mergeIntegrationConfig(existing?.config, {
        connectedAt,
        disconnectedAt: null,
        connectionStatus: "connected",
        credentialVersion: "encrypted_v1",
        lastSyncStatus: "connected",
        lastSyncError: null,
      }),
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
    return decryptIntegrationSecret(integration.accessToken);
  }

  const { clientId, clientSecret } = getClientCredentials();

  const res = await fetch(ZOHO_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decryptIntegrationSecret(integration.refreshToken),
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
      accessToken: encryptIntegrationSecret(tokens.access_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      config: mergeIntegrationConfig(integration.config, {
        credentialVersion: "encrypted_v1",
        lastTokenRefreshAt: new Date().toISOString(),
        lastSyncError: null,
      }),
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

  const syncStartedAt = new Date();
  await db.orgIntegration.update({
    where: { orgId_provider: { orgId, provider: "zoho" } },
    data: {
      config: mergeIntegrationConfig(integration.config, {
        connectionStatus: "connected",
        disconnectedAt: null,
        lastSyncAttemptAt: syncStartedAt.toISOString(),
        lastSyncStatus: "running",
        lastSyncError: null,
      }),
    },
  });

  const invoices = await db.invoice.findMany({
    where: { organizationId: orgId, status: "ISSUED" },
    include: {
      lineItems: true,
      customer: true,
    },
  });

  let synced = 0;
  const failedInvoices: string[] = [];

  try {
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
        failedInvoices.push(inv.invoiceNumber);
        const errBody = await res.text();
        console.error(`Zoho sync failed for ${inv.invoiceNumber}:`, errBody);
      }
    }
  } catch (error) {
    await db.orgIntegration.update({
      where: { orgId_provider: { orgId, provider: "zoho" } },
      data: {
        config: mergeIntegrationConfig(integration.config, {
          lastSyncAttemptAt: syncStartedAt.toISOString(),
          lastSyncStatus: "failed",
          lastSyncError: error instanceof Error ? error.message : "Zoho sync failed",
        }),
      },
    });
    throw error;
  }

  await db.orgIntegration.update({
    where: { orgId_provider: { orgId, provider: "zoho" } },
    data: {
      lastSyncAt: new Date(),
      config: mergeIntegrationConfig(integration.config, {
        lastSyncAttemptAt: syncStartedAt.toISOString(),
        lastSyncStatus:
          failedInvoices.length === 0
            ? "success"
            : synced > 0
              ? "partial_success"
              : "failed",
        lastSyncError:
          failedInvoices.length > 0
            ? `Failed invoices: ${failedInvoices.slice(0, 5).join(", ")}`
            : null,
        syncedCount: synced,
        attemptedCount: invoices.length,
      }),
    },
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
      `${ZOHO_REVOKE_URL}?token=${decryptIntegrationSecret(integration.refreshToken)}`,
      { method: "POST" }
    );
  } catch {
    // Best-effort revocation
  }

  await db.orgIntegration.update({
    where: { orgId_provider: { orgId, provider: "zoho" } },
    data: {
      isActive: false,
      config: mergeIntegrationConfig(integration.config, {
        connectionStatus: "disconnected",
        disconnectedAt: new Date().toISOString(),
      }),
    },
  });
}
