import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/passkey/challenge-store", () => ({
  getAndConsumeChallenge: vi.fn(),
}));

vi.mock("@/lib/passkey/db", () => ({
  getPasskeyByCredentialId: vi.fn(),
  updatePasskeyCounter: vi.fn(),
}));

vi.mock("@/lib/passkey/server", () => ({
  getRpId: vi.fn().mockReturnValue("localhost"),
  getOrigin: vi.fn().mockReturnValue("http://localhost:3001"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    profile: {
      findUnique: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@simplewebauthn/server", () => ({
  verifyAuthenticationResponse: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

import { POST } from "./route";
import { getAndConsumeChallenge } from "@/lib/passkey/challenge-store";
import { getPasskeyByCredentialId } from "@/lib/passkey/db";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { verifyMfaToken } from "@/lib/mfa/token";

const mockGetAndConsumeChallenge = vi.mocked(getAndConsumeChallenge);
const mockGetPasskeyByCredentialId = vi.mocked(getPasskeyByCredentialId);
const mockVerifyAuthenticationResponse = vi.mocked(verifyAuthenticationResponse);
const mockCreateSupabaseAdmin = vi.mocked(createSupabaseAdmin);
const mockDbProfileFindUnique = vi.mocked(db.profile.findUnique);

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3001/api/auth/passkey/signin", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TOTP_SESSION_SECRET", "test-secret-32-bytes-long-xxxxx");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
});

describe("POST /api/auth/passkey/signin", () => {
  function setupValidPasskey(userId: string, credentialId: string) {
    mockGetAndConsumeChallenge.mockResolvedValue("challenge_123");
    mockGetPasskeyByCredentialId.mockResolvedValue({
      id: "pk_1",
      credentialId,
      publicKey: Buffer.from([1, 2, 3]),
      counter: BigInt(0),
      userId,
    } as any);
    mockVerifyAuthenticationResponse.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    } as any);
    mockDbProfileFindUnique.mockResolvedValue({
      email: "user@example.com",
      totpEnabled: false,
      passkeyEnabled: true,
      twoFaEnforcedByOrg: false,
    } as any);
  }

  function setupSupabaseAdmin() {
    mockCreateSupabaseAdmin.mockResolvedValue({
      auth: {
        admin: {
          generateLink: vi.fn().mockResolvedValue({
            data: {
              properties: { hashed_token: "magic_token_123" },
            },
            error: null,
          }),
        },
      },
    } as any);
  }

  it("signs in with passkey and returns an MFA handoff token", async () => {
    setupValidPasskey("user_1", "cred_1");
    setupSupabaseAdmin();

    const req = makeRequest({
      response: {
        id: "cred_1",
        rawId: "cred_1",
        response: {},
        clientExtensionResults: {},
        type: "public-key",
      },
      signinSessionId: "session_1",
      callbackUrl: "/app",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.callbackUrl).toBe("/app");
    expect(json.mfaToken).toBeDefined();
    expect(typeof json.mfaToken).toBe("string");
    const verifiedUserId = await verifyMfaToken(json.mfaToken, process.env.TOTP_SESSION_SECRET!);
    expect(verifiedUserId).toBe("user_1");

    const setCookie = res.headers.getSetCookie?.() ?? [];
    expect(setCookie.some((c: string) => c.includes("sw_2fa="))).toBe(false);
  });

  it("sanitizes malicious callback URL", async () => {
    setupValidPasskey("user_1", "cred_1");
    setupSupabaseAdmin();

    const req = makeRequest({
      response: {
        id: "cred_1",
        rawId: "cred_1",
        response: {},
        clientExtensionResults: {},
        type: "public-key",
      },
      signinSessionId: "session_1",
      callbackUrl: "//evil.com",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.callbackUrl).toBe("/app");
  });

  it("rejects unknown passkey credential", async () => {
    mockGetAndConsumeChallenge.mockResolvedValue("challenge_123");
    mockGetPasskeyByCredentialId.mockResolvedValue(null);

    const req = makeRequest({
      response: {
        id: "unknown",
        rawId: "unknown",
        response: {},
        clientExtensionResults: {},
        type: "public-key",
      },
      signinSessionId: "session_1",
      callbackUrl: "/app",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unknown passkey credential");
  });

  it("rejects expired challenge", async () => {
    mockGetAndConsumeChallenge.mockResolvedValue(null);

    const req = makeRequest({
      response: {
        id: "cred_1",
        rawId: "cred_1",
        response: {},
        clientExtensionResults: {},
        type: "public-key",
      },
      signinSessionId: "session_1",
      callbackUrl: "/app",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Challenge expired");
  });

  it("rejects failed passkey verification", async () => {
    mockGetAndConsumeChallenge.mockResolvedValue("challenge_123");
    mockGetPasskeyByCredentialId.mockResolvedValue({
      id: "pk_1",
      credentialId: "cred_1",
      publicKey: Buffer.from([1, 2, 3]),
      counter: BigInt(0),
      userId: "user_1",
    } as any);
    mockVerifyAuthenticationResponse.mockResolvedValue({
      verified: false,
    } as any);

    const req = makeRequest({
      response: {
        id: "cred_1",
        rawId: "cred_1",
        response: {},
        clientExtensionResults: {},
        type: "public-key",
      },
      signinSessionId: "session_1",
      callbackUrl: "/app",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Passkey verification failed");
  });

  it("returns 401 when user profile is missing", async () => {
    setupValidPasskey("user_1", "cred_1");
    setupSupabaseAdmin();
    mockDbProfileFindUnique.mockResolvedValue(null);

    const req = makeRequest({
      response: {
        id: "cred_1",
        rawId: "cred_1",
        response: {},
        clientExtensionResults: {},
        type: "public-key",
      },
      signinSessionId: "session_1",
      callbackUrl: "/app",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("User account not found");
  });

  it("returns an MFA handoff token even when TOTP is also enabled", async () => {
    setupValidPasskey("user_1", "cred_1");
    setupSupabaseAdmin();
    mockDbProfileFindUnique.mockResolvedValue({
      email: "user@example.com",
      totpEnabled: true,
      passkeyEnabled: true,
      twoFaEnforcedByOrg: false,
    } as any);

    const req = makeRequest({
      response: {
        id: "cred_1",
        rawId: "cred_1",
        response: {},
        clientExtensionResults: {},
        type: "public-key",
      },
      signinSessionId: "session_1",
      callbackUrl: "/app",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.mfaToken).toBeDefined();
    const verifiedUserId = await verifyMfaToken(json.mfaToken, process.env.TOTP_SESSION_SECRET!);
    expect(verifiedUserId).toBe("user_1");
  });

  it("returns an MFA handoff token when org enforces MFA", async () => {
    setupValidPasskey("user_1", "cred_1");
    setupSupabaseAdmin();
    mockDbProfileFindUnique.mockResolvedValue({
      email: "user@example.com",
      totpEnabled: false,
      passkeyEnabled: true,
      twoFaEnforcedByOrg: true,
    } as any);

    const req = makeRequest({
      response: {
        id: "cred_1",
        rawId: "cred_1",
        response: {},
        clientExtensionResults: {},
        type: "public-key",
      },
      signinSessionId: "session_1",
      callbackUrl: "/app",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.mfaToken).toBeDefined();
    const verifiedUserId = await verifyMfaToken(json.mfaToken, process.env.TOTP_SESSION_SECRET!);
    expect(verifiedUserId).toBe("user_1");
  });
});
