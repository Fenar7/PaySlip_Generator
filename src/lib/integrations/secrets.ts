import {
  decryptGatewaySecret,
  encryptGatewaySecret,
} from "@/lib/crypto/gateway-secrets";

export type IntegrationConfig = {
  connectionStatus?: "connected" | "disconnected";
  connectedAt?: string;
  disconnectedAt?: string | null;
  credentialVersion?: "encrypted_v1";
  lastTokenRefreshAt?: string;
  lastSyncAttemptAt?: string;
  lastSyncStatus?: "connected" | "running" | "success" | "partial_success" | "failed";
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
  const [ivHex, ciphertextHex, extra] = value.split(":");
  return (
    !extra &&
    typeof ivHex === "string" &&
    typeof ciphertextHex === "string" &&
    /^[0-9a-f]{32}$/i.test(ivHex) &&
    /^[0-9a-f]+$/i.test(ciphertextHex) &&
    ciphertextHex.length > 0
  );
}
