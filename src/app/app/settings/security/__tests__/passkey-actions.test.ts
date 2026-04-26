import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module under test
vi.mock("@/lib/db", () => ({
  db: {
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
    passkeyCredential: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    webAuthnChallenge: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(),
  createSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/passkey/server", () => ({
  createRegistrationOptions: vi.fn(),
  verifyRegistration: vi.fn(),
  createAuthenticationOptions: vi.fn(),
  verifyAuthentication: vi.fn(),
}));

vi.mock("@/lib/passkey/db", () => ({
  getPasskeysForUser: vi.fn(),
  getPasskeyByCredentialId: vi.fn(),
  createPasskeyCredential: vi.fn(),
  updatePasskeyCounter: vi.fn(),
  renamePasskeyCredential: vi.fn(),
  removePasskeyCredential: vi.fn(),
  countPasskeysForUser: vi.fn(),
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  beginPasskeyAuthentication,
  finishPasskeyAuthentication,
  listPasskeys,
  renamePasskey,
  removePasskey,
  getMfaStatus,
} from "../passkey-actions";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { verifyRegistration, verifyAuthentication, createRegistrationOptions, createAuthenticationOptions } from "@/lib/passkey/server";
import {
  getPasskeysForUser,
  getPasskeyByCredentialId,
  createPasskeyCredential,
  removePasskeyCredential,
  countPasskeysForUser,
} from "@/lib/passkey/db";
import { logAudit } from "@/lib/audit";

const mockSupabaseServer = vi.mocked(createSupabaseServer);
const mockSupabaseAdmin = vi.mocked(createSupabaseAdmin);

function mockUser(userId: string, email?: string, signInResult?: { error: Error | null }) {
  mockSupabaseServer.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId, email: email ?? "test@example.com" } }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: signInResult?.error ?? null }),
    },
  } as any);
}

function mockNoUser() {
  mockSupabaseServer.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TOTP_SESSION_SECRET", "test-secret-32-bytes-long-xxxxx");
  vi.stubEnv("NODE_ENV", "test");
});

describe("beginPasskeyRegistration", () => {
  it("returns options when authenticated", async () => {
    mockUser("user_1", "test@example.com");
    vi.mocked(getPasskeysForUser).mockResolvedValue([]);
    vi.mocked(createRegistrationOptions).mockResolvedValue({
      challenge: "test_challenge",
      rp: { name: "Test", id: "localhost" },
      user: { id: "user_1", name: "test@example.com", displayName: "test@example.com" },
      pubKeyCredParams: [],
      timeout: 60000,
      attestation: "none",
      excludeCredentials: [],
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      extensions: { credProps: true },
    } as any);

    const result = await beginPasskeyRegistration();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toBeDefined();
    }
  });

  it("fails when not authenticated", async () => {
    mockNoUser();
    const result = await beginPasskeyRegistration();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Not authenticated");
    }
  });
});

describe("finishPasskeyRegistration", () => {
  it("creates a passkey and enables MFA when verified", async () => {
    mockUser("user_1");
    vi.mocked(verifyRegistration).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred_1",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
          transports: ["internal"],
        },
        credentialDeviceType: "singleDevice",
        credentialBackedUp: false,
      },
    } as any);
    vi.mocked(createPasskeyCredential).mockResolvedValue({
      id: "pk_1",
      credentialId: "cred_1",
      deviceName: "Test Device",
    } as any);
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: false,
      twoFaEnforcedByOrg: false,
    } as any);
    vi.mocked(db.profile.update).mockResolvedValue({} as any);
    vi.mocked(db.member.findFirst).mockResolvedValue({ organizationId: "org_1" } as any);
    mockSupabaseAdmin.mockResolvedValue({
      auth: { admin: { updateUserById: vi.fn().mockResolvedValue({}) } },
    } as any);

    const result = await finishPasskeyRegistration({
      id: "cred_1",
      rawId: "raw_1",
      response: {} as any,
      clientExtensionResults: {},
      type: "public-key",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.passkeyId).toBe("pk_1");
    }
  });

  it("fails when verification is not successful", async () => {
    mockUser("user_1");
    vi.mocked(verifyRegistration).mockResolvedValue({
      verified: false,
      registrationInfo: undefined,
    } as any);

    const result = await finishPasskeyRegistration({
      id: "cred_1",
      rawId: "raw_1",
      response: {} as any,
      clientExtensionResults: {},
      type: "public-key",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Passkey verification failed");
    }
  });
});

describe("beginPasskeyAuthentication", () => {
  it("returns options when user has passkeys", async () => {
    mockUser("user_1");
    vi.mocked(getPasskeysForUser).mockResolvedValue([
      { id: "pk_1", credentialId: "cred_1", transports: ["internal"] },
    ] as any);
    vi.mocked(createAuthenticationOptions).mockResolvedValue({
      challenge: "auth_challenge",
      rpId: "localhost",
      allowCredentials: [{ id: "cred_1", type: "public-key" }],
      timeout: 60000,
      userVerification: "required",
    } as any);

    const result = await beginPasskeyAuthentication();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toBeDefined();
    }
  });

  it("fails when user has no passkeys", async () => {
    mockUser("user_1");
    vi.mocked(getPasskeysForUser).mockResolvedValue([]);

    const result = await beginPasskeyAuthentication();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No passkeys enrolled");
    }
  });
});

describe("finishPasskeyAuthentication", () => {
  it("verifies and issues MFA cookie on success", async () => {
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
    vi.mocked(db.member.findFirst).mockResolvedValue({ organizationId: "org_1" } as any);

    const result = await finishPasskeyAuthentication({
      id: "cred_1",
      rawId: "raw_1",
      response: {} as any,
      clientExtensionResults: {},
      type: "public-key",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.callbackUrl).toBe("/app");
    }
  });

  it("rejects unknown credential", async () => {
    mockUser("user_1");
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(null);

    const result = await finishPasskeyAuthentication({
      id: "cred_unknown",
      rawId: "raw_1",
      response: {} as any,
      clientExtensionResults: {},
      type: "public-key",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unknown passkey credential");
    }
  });

  it("audits failed challenge attempt", async () => {
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

    const result = await finishPasskeyAuthentication({
      id: "cred_1",
      rawId: "raw_1",
      response: {} as any,
      clientExtensionResults: {},
      type: "public-key",
    });

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

describe("removePasskey", () => {
  it("removes a passkey successfully with valid password", async () => {
    mockUser("user_1", "test@example.com");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      twoFaEnforcedByOrg: false,
    } as any);
    vi.mocked(countPasskeysForUser).mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    vi.mocked(removePasskeyCredential).mockResolvedValue({ count: 1 } as any);
    mockSupabaseAdmin.mockResolvedValue({
      auth: { admin: { updateUserById: vi.fn().mockResolvedValue({}) } },
    } as any);

    const result = await removePasskey("pk_1", "correct_password");
    expect(result.success).toBe(true);
  });

  it("denies removal without valid re-auth", async () => {
    mockUser("user_1", "test@example.com", { error: new Error("Invalid login credentials") });
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      twoFaEnforcedByOrg: false,
    } as any);

    const result = await removePasskey("pk_1", "wrong_password");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Incorrect password");
    }
  });

  it("blocks removal of last factor when org requires MFA", async () => {
    mockUser("user_1", "test@example.com");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: false,
      twoFaEnforcedByOrg: true,
    } as any);
    vi.mocked(countPasskeysForUser).mockResolvedValue(1);

    const result = await removePasskey("pk_1", "correct_password");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Cannot remove your last MFA factor");
    }
  });
});

describe("getMfaStatus", () => {
  it("returns combined MFA status", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      passkeyEnabled: true,
      twoFaEnforcedByOrg: true,
    } as any);
    vi.mocked(countPasskeysForUser).mockResolvedValue(2);

    const result = await getMfaStatus();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totpEnabled).toBe(true);
      expect(result.data.passkeyEnabled).toBe(true);
      expect(result.data.twoFaEnforcedByOrg).toBe(true);
      expect(result.data.passkeyCount).toBe(2);
    }
  });
});
