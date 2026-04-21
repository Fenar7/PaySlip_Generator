import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/crypto/gateway-secrets", () => ({
  encryptGatewaySecret: vi.fn((value: string) => `enc:${value}`),
  decryptGatewaySecret: vi.fn((value: string) => `dec:${value}`),
}));

import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
  mergeIntegrationConfig,
} from "../secrets";

describe("integration secret helpers", () => {
  it("preserves legacy plaintext tokens while encrypted backfills catch up", () => {
    expect(decryptIntegrationSecret("legacy-plaintext-token")).toBe(
      "legacy-plaintext-token",
    );
  });

  it("decrypts encrypted tokens using the shared gateway secret utility", () => {
    expect(
      decryptIntegrationSecret(
        "0123456789abcdef0123456789abcdef:abcdef",
      ),
    ).toBe("dec:0123456789abcdef0123456789abcdef:abcdef");
  });

  it("encrypts new integration tokens with the shared gateway secret utility", () => {
    expect(encryptIntegrationSecret("fresh-token")).toBe("enc:fresh-token");
  });

  it("merges sync diagnostics into existing integration config safely", () => {
    expect(
      mergeIntegrationConfig(
        {
          connectedAt: "2026-04-21T00:00:00.000Z",
          syncedCount: 2,
        },
        {
          lastSyncStatus: "partial_success",
          attemptedCount: 5,
        },
      ),
    ).toEqual({
      connectedAt: "2026-04-21T00:00:00.000Z",
      syncedCount: 2,
      lastSyncStatus: "partial_success",
      attemptedCount: 5,
    });
  });
});
