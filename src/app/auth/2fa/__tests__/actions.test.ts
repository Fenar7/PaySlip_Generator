import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
    passkeyCredential: {
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(),
}));

vi.mock("@/lib/passkey/server", () => ({
  verifyAuthentication: vi.fn(),
}));

vi.mock("@/lib/passkey/db", () => ({
  getPasskeysForUser: vi.fn(),
  getPasskeyByCredentialId: vi.fn(),
  updatePasskeyCounter: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}));

import {
  verifyRecoveryChallenge,
  verifyPasskeyChallenge,
  getMfaFactors,
} from "../actions";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getPasskeysForUser, getPasskeyByCredentialId } from "@/lib/passkey/db";
import { verifyAuthentication } from "@/lib/passkey/server";
import { logAudit } from "@/lib/audit";

const mockSupabaseServer = vi.mocked(createSupabaseServer);

function mockUser(userId: string) {
  mockSupabaseServer.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TOTP_SESSION_SECRET", "test-secret-32-bytes-long-xxxxx");
  vi.stubEnv("NODE_ENV", "test");
});

describe("verifyRecoveryChallenge", () => {
  // SHA-256 hash of "ABCD1234ABCD1234" (findRecoveryCodeIndex uppercases input)
  const HASHED_CODE_1 = "d570d84da822effb3ed3110581c9ae1f537e1bc3b31fbaee7bc249c9c1fee4fa";
  // SHA-256 hash of "EFGH5678EFGH5678"
  const HASHED_CODE_2 = "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae";

  it("allows recovery codes for passkey-only users who have recovery codes", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: false,
      passkeyEnabled: true,
      recoveryCodes: [HASHED_CODE_1, HASHED_CODE_2],
    } as any);

    const result = await verifyRecoveryChallenge("abcd1234abcd1234", "/app/dashboard");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.codesRemaining).toBe(1);
    }
  });

  it("allows recovery codes for TOTP users", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      passkeyEnabled: false,
      recoveryCodes: [HASHED_CODE_1],
    } as any);

    const result = await verifyRecoveryChallenge("abcd1234abcd1234", "/app/dashboard");
    expect(result.success).toBe(true);
  });

  it("rejects recovery codes when user has no MFA enabled", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: false,
      passkeyEnabled: false,
      recoveryCodes: [HASHED_CODE_1],
    } as any);

    const result = await verifyRecoveryChallenge("abcd1234abcd1234", "/app/dashboard");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("MFA is not enabled");
    }
  });

  it("rejects when no recovery codes are available", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      passkeyEnabled: false,
      recoveryCodes: [],
    } as any);

    const result = await verifyRecoveryChallenge("abcd1234abcd1234", "/app/dashboard");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No recovery codes available");
    }
  });
});

describe("verifyPasskeyChallenge", () => {
  it("audits failed passkey challenge", async () => {
    mockUser("user_1");
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue({
      id: "pk_1",
      credentialId: "cred_1",
      publicKey: Buffer.from([1, 2, 3]),
      counter: BigInt(0),
      userId: "user_1",
    } as any);
    vi.mocked(verifyAuthentication).mockResolvedValue({
      verified: false,
    } as any);
    vi.mocked(db.member.findFirst).mockResolvedValue({ organizationId: "org_1" } as any);

    const result = await verifyPasskeyChallenge({
      id: "cred_1",
      rawId: "raw_1",
      response: {} as any,
      clientExtensionResults: {},
      type: "public-key",
    }, "/app/dashboard");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Passkey verification failed");
    }
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "passkey.challenge_failed",
        entityType: "PasskeyCredential",
        entityId: "pk_1",
      })
    );
  });
});

describe("getMfaFactors", () => {
  it("returns correct factors for passkey-only user", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: false,
      recoveryCodes: [],
    } as any);
    vi.mocked(getPasskeysForUser).mockResolvedValue([
      { id: "pk_1", credentialId: "cred_1" },
    ] as any);

    const result = await getMfaFactors();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hasPasskey).toBe(true);
      expect(result.data.hasTotp).toBe(false);
      expect(result.data.hasRecoveryCodes).toBe(false);
    }
  });
});
