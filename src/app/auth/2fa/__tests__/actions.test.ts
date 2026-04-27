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
  createSupabaseAdmin: vi.fn(),
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

vi.mock("@/lib/totp", () => ({
  verifyTotpCode: vi.fn(),
  decryptTotpSecret: vi.fn(),
  findRecoveryCodeIndex: vi.fn(),
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
  verifyTotpChallenge,
  getMfaFactors,
} from "../actions";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getPasskeysForUser, getPasskeyByCredentialId, updatePasskeyCounter } from "@/lib/passkey/db";
import { verifyAuthentication } from "@/lib/passkey/server";
import { logAudit } from "@/lib/audit";
import { verifyTotpCode, decryptTotpSecret, findRecoveryCodeIndex } from "@/lib/totp";

const mockSupabaseServer = vi.mocked(createSupabaseServer);
const mockSupabaseAdmin = vi.mocked(createSupabaseAdmin);

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
  mockSupabaseAdmin.mockResolvedValue({
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  } as any);
});

describe("verifyTotpChallenge", () => {
  it("returns callback URL after successful TOTP verification", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      totpSecret: "encrypted_secret",
    } as any);
    vi.mocked(decryptTotpSecret).mockReturnValue("plain_secret");
    vi.mocked(verifyTotpCode).mockReturnValue(true);

    const result = await verifyTotpChallenge("123456", "/onboarding");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callbackUrl).toBe("/onboarding");
    }
  });

  it("rejects invalid TOTP code and returns error", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      totpSecret: "encrypted_secret",
    } as any);
    vi.mocked(decryptTotpSecret).mockReturnValue("plain_secret");
    vi.mocked(verifyTotpCode).mockReturnValue(false);

    const result = await verifyTotpChallenge("000000", "/onboarding");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid code. Please try again.");
    }
  });

  it("rejects when TOTP is not configured", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: false,
      totpSecret: null,
    } as any);

    const result = await verifyTotpChallenge("000000", "/onboarding");
    expect(result.success).toBe(false);
  });

  it("sanitizes malicious callback URL", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      totpSecret: "encrypted_secret",
    } as any);
    vi.mocked(decryptTotpSecret).mockReturnValue("plain_secret");
    vi.mocked(verifyTotpCode).mockReturnValue(true);

    const result = await verifyTotpChallenge("123456", "//evil.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callbackUrl).toBe("/app");
    }
  });

  it("sets the MFA cookie on success", async () => {
    const cookieSetFn = vi.fn();
    vi.mocked(await import("next/headers")).cookies.mockResolvedValue({
      set: cookieSetFn,
      delete: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(() => []),
    } as any);

    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      totpSecret: "encrypted_secret",
    } as any);
    vi.mocked(decryptTotpSecret).mockReturnValue("plain_secret");
    vi.mocked(verifyTotpCode).mockReturnValue(true);

    const result = await verifyTotpChallenge("123456", "/app/home");
    expect(result.success).toBe(true);
    expect(cookieSetFn).toHaveBeenCalledWith(
      "sw_2fa",
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 12 * 60 * 60,
      }),
    );
  });
});

describe("verifyRecoveryChallenge", () => {
  const HASHED_CODE_1 = "d570d84da822effb3ed3110581c9ae1f537e1bc3b31fbaee7bc249c9c1fee4fa";
  const HASHED_CODE_2 = "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae";

  it("returns callback URL after successful recovery code verification", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: false,
      passkeyEnabled: true,
      recoveryCodes: [HASHED_CODE_1, HASHED_CODE_2],
    } as any);
    vi.mocked(findRecoveryCodeIndex).mockReturnValue(0);

    const result = await verifyRecoveryChallenge("abcd1234abcd1234", "/app/dashboard");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callbackUrl).toBe("/app/dashboard");
    }
  });

  it("allows recovery codes for TOTP users", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      passkeyEnabled: false,
      recoveryCodes: [HASHED_CODE_1],
    } as any);
    vi.mocked(findRecoveryCodeIndex).mockReturnValue(0);

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

  it("rejects invalid recovery code", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      passkeyEnabled: false,
      recoveryCodes: [HASHED_CODE_1],
    } as any);
    vi.mocked(findRecoveryCodeIndex).mockReturnValue(-1);

    const result = await verifyRecoveryChallenge("wrongcode", "/app/dashboard");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invalid recovery code");
    }
  });

  it("sanitizes malicious callback URL", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      passkeyEnabled: false,
      recoveryCodes: [HASHED_CODE_1],
    } as any);
    vi.mocked(findRecoveryCodeIndex).mockReturnValue(0);

    const result = await verifyRecoveryChallenge("abcd1234abcd1234", "//evil.com/path");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callbackUrl).toBe("/app");
    }
  });
});

describe("verifyPasskeyChallenge", () => {
  it("returns callback URL after successful passkey verification", async () => {
    mockUser("user_1");
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue({
      id: "pk_1",
      credentialId: "cred_1",
      publicKey: Buffer.from([1, 2, 3]),
      counter: BigInt(0),
      userId: "user_1",
    } as any);
    vi.mocked(verifyAuthentication).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    } as any);

    const result = await verifyPasskeyChallenge({
      id: "cred_1",
      rawId: "raw_1",
      response: {} as any,
      clientExtensionResults: {},
      type: "public-key",
    }, "/onboarding");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callbackUrl).toBe("/onboarding");
    }
  });

  it("sanitizes malicious callback URL on success", async () => {
    mockUser("user_1");
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue({
      id: "pk_1",
      credentialId: "cred_1",
      publicKey: Buffer.from([1, 2, 3]),
      counter: BigInt(0),
      userId: "user_1",
    } as any);
    vi.mocked(verifyAuthentication).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    } as any);

    const result = await verifyPasskeyChallenge({
      id: "cred_1",
      rawId: "raw_1",
      response: {} as any,
      clientExtensionResults: {},
      type: "public-key",
    }, "//evil.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callbackUrl).toBe("/app");
    }
  });

  it("updates passkey counter on success", async () => {
    mockUser("user_1");
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue({
      id: "pk_1",
      credentialId: "cred_1",
      publicKey: Buffer.from([1, 2, 3]),
      counter: BigInt(0),
      userId: "user_1",
    } as any);
    vi.mocked(verifyAuthentication).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 5 },
    } as any);

    const result = await verifyPasskeyChallenge({
      id: "cred_1",
      rawId: "raw_1",
      response: {} as any,
      clientExtensionResults: {},
      type: "public-key",
    }, "/onboarding");
    expect(result.success).toBe(true);
    expect(vi.mocked(updatePasskeyCounter)).toHaveBeenCalledWith("cred_1", BigInt(5));
  });

  it("audits failed passkey challenge and returns error", async () => {
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
      }),
    );
  });

  it("rejects unknown credential", async () => {
    mockUser("user_1");
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(null);

    const result = await verifyPasskeyChallenge({
      id: "unknown",
      rawId: "raw_1",
      response: {} as any,
      clientExtensionResults: {},
      type: "public-key",
    }, "/app/dashboard");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unknown passkey credential");
    }
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
      expect(result.data.status).toBe("challenge");
      expect(result.data.hasPasskey).toBe(true);
      expect(result.data.hasTotp).toBe(false);
      expect(result.data.hasRecoveryCodes).toBe(false);
    }
  });

  it("clears stale passkey metadata and skips MFA when no real factor remains", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: false,
      passkeyEnabled: true,
      recoveryCodes: [],
      twoFaEnforcedByOrg: false,
    } as any);
    vi.mocked(getPasskeysForUser).mockResolvedValue([]);

    const result = await getMfaFactors("/onboarding");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("skip");
      expect(result.data.callbackUrl).toBe("/onboarding");
      expect(result.data.hasPasskey).toBe(false);
    }
    expect(db.profile.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { passkeyEnabled: false, passkeyEnabledAt: null },
    });
    const admin = await mockSupabaseAdmin.mock.results[0].value;
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith("user_1", {
      user_metadata: {
        totpEnabled: false,
        passkeyEnabled: false,
        mfaEnabled: false,
        twoFaEnforcedByOrg: false,
      },
    });
  });

  it("routes stale passkey users to setup when org MFA is enforced", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: false,
      passkeyEnabled: true,
      recoveryCodes: [],
      twoFaEnforcedByOrg: true,
    } as any);
    vi.mocked(getPasskeysForUser).mockResolvedValue([]);

    const result = await getMfaFactors("/app/home");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("setup");
      expect(result.data.setupUrl).toBe(
        "/app/settings/security?setupMfa=1&callbackUrl=%2Fapp%2Fhome"
      );
    }
  });
});