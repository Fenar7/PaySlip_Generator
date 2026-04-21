import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/crypto/gateway-secrets", () => ({
  encryptGatewaySecret: vi.fn((value: string) => `enc:${value}`),
  decryptGatewaySecret: vi.fn((value: string) => `dec:${value}`),
}));

import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  isEncryptedIntegrationSecret,
  mergeIntegrationConfig,
  sanitizeIntegrationSyncError,
} from "../secrets";

describe("isEncryptedIntegrationSecret", () => {
  it("detects v2 GCM format (v2:24hex:ct:32hex)", () => {
    // 24 hex chars = 12-byte IV, 32 hex chars = 16-byte auth tag, any-length ct
    const v2 = `v2:${"a".repeat(24)}:deadbeef:${"b".repeat(32)}`;
    expect(isEncryptedIntegrationSecret(v2)).toBe(true);
  });

  it("rejects v2 with wrong IV length", () => {
    const bad = `v2:${"a".repeat(20)}:deadbeef:${"b".repeat(32)}`;
    expect(isEncryptedIntegrationSecret(bad)).toBe(false);
  });

  it("rejects v2 with wrong tag length", () => {
    const bad = `v2:${"a".repeat(24)}:deadbeef:${"b".repeat(28)}`;
    expect(isEncryptedIntegrationSecret(bad)).toBe(false);
  });

  it("detects legacy v1 CBC format (32hex:ct)", () => {
    const v1 = `${"a".repeat(32)}:abcdef1234`;
    expect(isEncryptedIntegrationSecret(v1)).toBe(true);
  });

  it("rejects v1 with wrong IV length", () => {
    const bad = `${"a".repeat(28)}:abcdef`;
    expect(isEncryptedIntegrationSecret(bad)).toBe(false);
  });

  it("rejects plaintext tokens", () => {
    expect(isEncryptedIntegrationSecret("ya29.a0AfH6SMB...")).toBe(false);
    expect(isEncryptedIntegrationSecret("plain-refresh-token")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isEncryptedIntegrationSecret("")).toBe(false);
  });
});

describe("integration secret encrypt/decrypt helpers", () => {
  it("preserves legacy plaintext tokens (passthrough for not-yet-backfilled rows)", () => {
    expect(decryptIntegrationSecret("legacy-plaintext-token")).toBe(
      "legacy-plaintext-token",
    );
  });

  it("decrypts v1 CBC encrypted tokens using the shared gateway utility", () => {
    const v1 = `${"0".repeat(32)}:abcdef`;
    expect(decryptIntegrationSecret(v1)).toBe(`dec:${"0".repeat(32)}:abcdef`);
  });

  it("decrypts v2 GCM encrypted tokens using the shared gateway utility", () => {
    const v2 = `v2:${"a".repeat(24)}:deadbeef:${"b".repeat(32)}`;
    expect(decryptIntegrationSecret(v2)).toBe(`dec:${v2}`);
  });

  it("encrypts new integration tokens with the shared gateway utility", () => {
    expect(encryptIntegrationSecret("fresh-token")).toBe("enc:fresh-token");
  });
});

describe("mergeIntegrationConfig", () => {
  it("merges sync diagnostics into existing config", () => {
    expect(
      mergeIntegrationConfig(
        { connectedAt: "2026-04-21T00:00:00.000Z", syncedCount: 2 },
        { lastSyncStatus: "partial_success", attemptedCount: 5 },
      ),
    ).toEqual({
      connectedAt: "2026-04-21T00:00:00.000Z",
      syncedCount: 2,
      lastSyncStatus: "partial_success",
      attemptedCount: 5,
    });
  });

  it("merges auth_expired status into existing config", () => {
    const result = mergeIntegrationConfig(
      { connectionStatus: "connected", lastSyncStatus: "success" },
      {
        lastSyncStatus: "auth_expired",
        lastSyncError: "QuickBooks access token could not be refreshed. Please reconnect.",
      },
    );
    expect(result.lastSyncStatus).toBe("auth_expired");
    expect(result.connectionStatus).toBe("connected");
  });

  it("handles null/undefined current config gracefully", () => {
    expect(mergeIntegrationConfig(null, { lastSyncStatus: "failed" })).toEqual({
      lastSyncStatus: "failed",
    });
    expect(mergeIntegrationConfig(undefined, { syncedCount: 0 })).toEqual({
      syncedCount: 0,
    });
  });
});

describe("sanitizeIntegrationSyncError", () => {
  it("returns the knownSafeMessage when provided", () => {
    expect(
      sanitizeIntegrationSyncError(new Error("provider internal error"), "3 invoice(s) failed to sync."),
    ).toBe("3 invoice(s) failed to sync.");
  });

  it("returns generic fallback for unknown errors from catch blocks", () => {
    expect(sanitizeIntegrationSyncError(new Error("timeout fetching https://api.provider.com/auth?secret=xyz"))).toBe(
      "Sync failed due to an unexpected error.",
    );
  });

  it("returns generic fallback for non-Error thrown values", () => {
    expect(sanitizeIntegrationSyncError("string error")).toBe(
      "Sync failed due to an unexpected error.",
    );
  });

  it("returns generic fallback when no message provided at all", () => {
    expect(sanitizeIntegrationSyncError(undefined)).toBe(
      "Sync failed due to an unexpected error.",
    );
  });
});
