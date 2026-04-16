import "server-only";
import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { decryptGatewaySecret } from "@/lib/crypto/gateway-secrets";

export interface RazorpayOrgConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mode: "test" | "live";
}

/**
 * Retrieve and decrypt the Razorpay configuration for an organisation.
 * Returns null if the org has not connected Razorpay.
 */
export async function getOrgRazorpayConfig(orgId: string): Promise<RazorpayOrgConfig | null> {
  const integration = await db.orgIntegration.findUnique({
    where: { orgId_provider: { orgId, provider: "razorpay" } },
    select: { accessToken: true, refreshToken: true, config: true, isActive: true },
  });

  if (!integration || !integration.isActive) return null;

  try {
    const config = integration.config as { keyId?: string; mode?: string } | null;
    const keyId = config?.keyId ?? "";
    const mode = (config?.mode === "live" ? "live" : "test") as "test" | "live";
    const keySecret = decryptGatewaySecret(integration.accessToken);
    const webhookSecret = decryptGatewaySecret(integration.refreshToken);
    return { keyId, keySecret, webhookSecret, mode };
  } catch {
    return null;
  }
}

/**
 * Get a Razorpay SDK instance for the given organisation.
 * Throws if the org has not configured Razorpay.
 */
export async function getOrgRazorpayClient(orgId: string): Promise<Razorpay> {
  const config = await getOrgRazorpayConfig(orgId);
  if (!config) {
    throw new Error("Razorpay is not configured for this organisation.");
  }
  return new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
}

/**
 * Get the webhook secret for an organisation identified by its Razorpay account ID.
 * Used during webhook signature verification to find the right org.
 */
export async function getOrgConfigByRazorpayAccountId(
  razorpayAccountId: string
): Promise<(RazorpayOrgConfig & { orgId: string }) | null> {
  const integration = await db.orgIntegration.findFirst({
    where: {
      provider: "razorpay",
      isActive: true,
      config: { path: ["razorpayAccountId"], equals: razorpayAccountId },
    },
    select: {
      orgId: true,
      accessToken: true,
      refreshToken: true,
      config: true,
    },
  });

  if (!integration) return null;

  try {
    const config = integration.config as { keyId?: string; mode?: string } | null;
    const keyId = config?.keyId ?? "";
    const mode = (config?.mode === "live" ? "live" : "test") as "test" | "live";
    const keySecret = decryptGatewaySecret(integration.accessToken);
    const webhookSecret = decryptGatewaySecret(integration.refreshToken);
    return { orgId: integration.orgId, keyId, keySecret, webhookSecret, mode };
  } catch {
    return null;
  }
}
