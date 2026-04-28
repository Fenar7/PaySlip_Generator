import {
  decryptGatewaySecret,
  encryptGatewaySecret,
} from "@/lib/crypto/gateway-secrets";

export type IntegrationConfig = {
  connectionStatus?: "connected" | "disconnected";
  connectedAt?: string;
  disconnectedAt?: string | null;
  credentialVersion?: "encrypted_v1" | "encrypted_v2";
  lastTokenRefreshAt?: string;
  lastSyncAttemptAt?: string;
  lastSyncStatus?:
    | "connected"
    | "running"
    | "success"
    | "partial_success"
    | "failed"
    | "auth_expired";
  lastSyncError?: string | null;
  syncedCount?: number;
  attemptedCount?: number;
};

export function encryptIntegrationSecret(secret: string): string {
  return encryptGatewaySecret(secret);
}

export function decryptIntegrationSecret(stored: string): string {
  return isEncryptedIntegrationSecret(stored)
    ? decryptGatewaySecret(stored)
    : stored;
}

export function normalizeIntegrationConfig(config: unknown): IntegrationConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }

  return { ...(config as Record<string, unknown>) } as IntegrationConfig;
}

export function mergeIntegrationConfig(
  current: unknown,
  patch: Partial<IntegrationConfig>,
): IntegrationConfig {
  return {
    ...normalizeIntegrationConfig(current),
    ...patch,
  };
}

export function isEncryptedIntegrationSecret(value: string): boolean {
  if (value.startsWith("v2:")) {
    // v2 GCM: v2:<iv_24hex>:<ciphertext_hex>:<tag_32hex>
    const parts = value.split(":");
    const ivHex = parts[1];
    const ciphertextHex = parts[2];
    const tagHex = parts[3];
    const extra = parts[4];
    return (
      extra === undefined &&
      typeof ivHex === "string" &&
      typeof ciphertextHex === "string" &&
      typeof tagHex === "string" &&
      /^[0-9a-f]{24}$/i.test(ivHex) &&
      /^[0-9a-f]+$/i.test(ciphertextHex) &&
      ciphertextHex.length > 0 &&
      /^[0-9a-f]{32}$/i.test(tagHex)
    );
  }
  // Legacy v1 CBC: <iv_32hex>:<ciphertext_hex>
  const colonIdx = value.indexOf(":");
  if (colonIdx === -1) return false;
  const ivHex = value.slice(0, colonIdx);
  const rest = value.slice(colonIdx + 1);
  return (
    /^[0-9a-f]{32}$/i.test(ivHex) &&
    /^[0-9a-f]+$/i.test(rest) &&
    rest.length > 0 &&
    !rest.includes(":")
  );
}

/**
 * Sanitizes a sync error message before storing it in the integration config.
 * Provider raw errors must not be stored or surfaced to users — they may contain
 * internal URLs, tokens, or other provider-specific details.
 *
 * Pass `knownSafeMessage` when the caller has already constructed a safe user-facing
 * message (e.g. "3 invoice(s) failed to sync."). For catch-block errors, always
 * use the generic fallback; specific details are logged server-side only.
 */
export function sanitizeIntegrationSyncError(
  error: unknown,
  knownSafeMessage?: string,
): string {
  if (knownSafeMessage) return knownSafeMessage;
  return "Sync failed due to an unexpected error.";
}
