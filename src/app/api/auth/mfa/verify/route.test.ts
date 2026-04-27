import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
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

import { POST } from "./route";
import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getPasskeyByCredentialId } from "@/lib/passkey/db";
import { verifyAuthentication } from "@/lib/passkey/server";
import { verifyTotpCode, decryptTotpSecret, findRecoveryCodeIndex } from "@/lib/totp";

const mockSupabaseServer = vi.mocked(createSupabaseServer);

function mockUser(userId: string) {
  mockSupabaseServer.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
  } as any);
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3001/api/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TOTP_SESSION_SECRET", "test-secret-32-bytes-long-xxxxx");
  vi.stubEnv("NODE_ENV", "test");
});

describe("POST /api/auth/mfa/verify", () => {
  it("verifies passkey and sets MFA cookie", async () => {
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

    const req = makeRequest({
      type: "passkey",
      response: {
        id: "cred_1",
        rawId: "raw_1",
        response: {},
        clientExtensionResults: {},
        type: "public-key",
      },
      callbackUrl: "/onboarding",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.callbackUrl).toBe("/onboarding");

    const setCookie = res.headers.getSetCookie?.() ?? [];
    expect(setCookie.length).toBeGreaterThan(0);
    expect(setCookie[0]).toContain("sw_2fa=");
  });

  it("sanitizes malicious callback URL for passkey", async () => {
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

    const req = makeRequest({
      type: "passkey",
      response: { id: "cred_1", rawId: "raw_1", response: {}, clientExtensionResults: {}, type: "public-key" },
      callbackUrl: "//evil.com",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.callbackUrl).toBe("/app");
  });

  it("rejects unknown passkey credential", async () => {
    mockUser("user_1");
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(null);

    const req = makeRequest({
      type: "passkey",
      response: { id: "unknown", rawId: "raw_1", response: {}, clientExtensionResults: {}, type: "public-key" },
      callbackUrl: "/app",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unknown passkey credential");
  });

  it("verifies TOTP and sets MFA cookie", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      totpSecret: "encrypted_secret",
    } as any);
    vi.mocked(decryptTotpSecret).mockReturnValue("plain_secret");
    vi.mocked(verifyTotpCode).mockReturnValue(true);

    const req = makeRequest({ type: "totp", code: "123456", callbackUrl: "/app/home" });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.callbackUrl).toBe("/app/home");

    const setCookie = res.headers.getSetCookie?.() ?? [];
    expect(setCookie.length).toBeGreaterThan(0);
  });

  it("rejects invalid TOTP code", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      totpSecret: "encrypted_secret",
    } as any);
    vi.mocked(decryptTotpSecret).mockReturnValue("plain_secret");
    vi.mocked(verifyTotpCode).mockReturnValue(false);

    const req = makeRequest({ type: "totp", code: "000000", callbackUrl: "/app" });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid code. Please try again.");
  });

  it("verifies recovery code and sets MFA cookie", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: false,
      passkeyEnabled: true,
      recoveryCodes: ["d570d84da822effb3ed3110581c9ae1f537e1bc3b31fbaee7bc249c9c1fee4fa"],
    } as any);
    vi.mocked(findRecoveryCodeIndex).mockReturnValue(0);

    const req = makeRequest({ type: "recovery", code: "abcd1234abcd1234", callbackUrl: "/app/dashboard" });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.callbackUrl).toBe("/app/dashboard");

    const setCookie = res.headers.getSetCookie?.() ?? [];
    expect(setCookie.length).toBeGreaterThan(0);
  });

  it("rejects invalid recovery code", async () => {
    mockUser("user_1");
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      totpEnabled: true,
      passkeyEnabled: false,
      recoveryCodes: ["d570d84da822effb3ed3110581c9ae1f537e1bc3b31fbaee7bc249c9c1fee4fa"],
    } as any);
    vi.mocked(findRecoveryCodeIndex).mockReturnValue(-1);

    const req = makeRequest({ type: "recovery", code: "wrongcode", callbackUrl: "/app" });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid recovery code");
  });

  it("returns 401 when not authenticated", async () => {
    mockSupabaseServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as any);

    const req = makeRequest({ type: "totp", code: "123456", callbackUrl: "/app" });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Not authenticated");
  });

  it("returns 400 for unknown MFA type", async () => {
    mockUser("user_1");

    const req = makeRequest({ type: "unknown", callbackUrl: "/app" });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unknown MFA type");
  });
});