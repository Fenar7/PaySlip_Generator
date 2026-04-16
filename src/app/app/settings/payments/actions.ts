"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { encryptGatewaySecret, decryptGatewaySecret } from "@/lib/crypto/gateway-secrets";
import { revalidatePath } from "next/cache";
import Razorpay from "razorpay";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export interface RazorpayConfigInput {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mode: "test" | "live";
}

export interface RazorpayConfigView {
  keyId: string;
  mode: "test" | "live";
  isActive: boolean;
  lastSyncAt: string | null;
  /** Masked secret — never returns plaintext */
  keySecretMasked: string;
}

/**
 * Save or update Razorpay gateway configuration for the org.
 * Secrets are AES-256-CBC encrypted before storage.
 */
export async function saveRazorpayConfig(
  input: RazorpayConfigInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireRole("admin");

    const { keyId, keySecret, webhookSecret, mode } = input;
    if (!keyId.trim() || !keySecret.trim() || !webhookSecret.trim()) {
      return { success: false, error: "Key ID, Key Secret, and Webhook Secret are all required." };
    }
    if (!keyId.startsWith("rzp_")) {
      return { success: false, error: "Key ID must start with 'rzp_'." };
    }

    const encryptedKeySecret = encryptGatewaySecret(keySecret.trim());
    const encryptedWebhookSecret = encryptGatewaySecret(webhookSecret.trim());

    const integration = await db.orgIntegration.upsert({
      where: { orgId_provider: { orgId: ctx.orgId, provider: "razorpay" } },
      create: {
        orgId: ctx.orgId,
        provider: "razorpay",
        accessToken: encryptedKeySecret,
        refreshToken: encryptedWebhookSecret,
        tokenExpiresAt: new Date("2099-01-01"),
        config: { keyId: keyId.trim(), mode },
        isActive: true,
      },
      update: {
        accessToken: encryptedKeySecret,
        refreshToken: encryptedWebhookSecret,
        config: { keyId: keyId.trim(), mode },
        isActive: true,
        lastSyncAt: new Date(),
      },
      select: { id: true },
    });

    revalidatePath("/app/settings/payments");
    return { success: true, data: { id: integration.id } };
  } catch (err) {
    console.error("[saveRazorpayConfig]", err);
    return { success: false, error: "Failed to save gateway configuration." };
  }
}

/**
 * Retrieve the Razorpay config for the current org.
 * Never returns decrypted secrets — only masked display values.
 */
export async function getRazorpayConfig(): Promise<ActionResult<RazorpayConfigView | null>> {
  try {
    const ctx = await requireRole("admin");

    const integration = await db.orgIntegration.findUnique({
      where: { orgId_provider: { orgId: ctx.orgId, provider: "razorpay" } },
      select: {
        accessToken: true,
        config: true,
        isActive: true,
        lastSyncAt: true,
      },
    });

    if (!integration) return { success: true, data: null };

    const config = integration.config as { keyId?: string; mode?: string } | null;
    const keyId = config?.keyId ?? "";
    const mode = (config?.mode === "live" ? "live" : "test") as "test" | "live";

    // Mask: reveal first 8 chars, replace rest with asterisks
    let keySecretMasked = "••••••••";
    try {
      const decrypted = decryptGatewaySecret(integration.accessToken);
      if (decrypted.length > 8) {
        keySecretMasked = decrypted.slice(0, 8) + "••••••••";
      }
    } catch {
      // Could not decrypt — show generic mask
    }

    return {
      success: true,
      data: {
        keyId,
        mode,
        isActive: integration.isActive,
        lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
        keySecretMasked,
      },
    };
  } catch (err) {
    console.error("[getRazorpayConfig]", err);
    return { success: false, error: "Failed to retrieve gateway configuration." };
  }
}

/**
 * Test the Razorpay connection by making a lightweight API call to verify credentials.
 */
export async function testRazorpayConnection(): Promise<ActionResult<{ accountId: string }>> {
  try {
    const ctx = await requireRole("admin");

    const integration = await db.orgIntegration.findUnique({
      where: { orgId_provider: { orgId: ctx.orgId, provider: "razorpay" } },
      select: { accessToken: true, config: true, isActive: true },
    });

    if (!integration) {
      return { success: false, error: "Razorpay is not configured." };
    }

    const config = integration.config as { keyId?: string } | null;
    const keyId = config?.keyId ?? "";
    const keySecret = decryptGatewaySecret(integration.accessToken);

    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });

    // Lightweight credentials check — fetch account info
    const account = await (client as unknown as { accounts: { fetch: () => Promise<{ id: string }> } }).accounts.fetch();

    // Store the account ID for webhook routing
    await db.orgIntegration.update({
      where: { orgId_provider: { orgId: ctx.orgId, provider: "razorpay" } },
      data: {
        config: { ...(integration.config as object), razorpayAccountId: account.id },
        lastSyncAt: new Date(),
      },
    });

    revalidatePath("/app/settings/payments");
    return { success: true, data: { accountId: account.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Connection test failed: ${message}` };
  }
}

/**
 * Disconnect Razorpay from this org.
 */
export async function deleteRazorpayConfig(): Promise<ActionResult<void>> {
  try {
    const ctx = await requireRole("admin");

    await db.orgIntegration.updateMany({
      where: { orgId: ctx.orgId, provider: "razorpay" },
      data: { isActive: false },
    });

    revalidatePath("/app/settings/payments");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[deleteRazorpayConfig]", err);
    return { success: false, error: "Failed to disconnect gateway." };
  }
}
