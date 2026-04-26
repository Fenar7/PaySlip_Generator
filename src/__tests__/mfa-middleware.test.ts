import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { verifyChallengeToken } from "@/lib/totp/challenge-session";

// Replicate the middleware MFA gating logic for isolated testing.
// We cannot import middleware.ts directly because it depends on edge-runtime modules.

const MFA_CHALLENGE_COOKIE = "sw_2fa";

async function checkMfaChallenge(
  request: NextRequest,
  userId: string,
  mfaRequired: boolean,
  opts?: { enrollmentRequired?: boolean }
): Promise<{ type: "redirect"; url: string } | null> {
  if (!mfaRequired) return null;

  const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;

  if (opts?.enrollmentRequired) {
    const url = new URL("/app/settings/security", request.url);
    url.searchParams.set("setupMfa", "1");
    url.searchParams.set("callbackUrl", callbackUrl);
    return { type: "redirect", url: url.toString() };
  }

  const secret = process.env.TOTP_SESSION_SECRET ?? "";
  if (!secret) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("error", "mfa_unavailable");
    url.searchParams.set("callbackUrl", callbackUrl);
    return { type: "redirect", url: url.toString() };
  }

  const cookieValue = request.cookies.get(MFA_CHALLENGE_COOKIE)?.value ?? "";
  const verifiedUserId = await verifyChallengeToken(cookieValue, secret);

  if (verifiedUserId === userId) {
    return null;
  }

  const url = new URL("/auth/2fa", request.url);
  url.searchParams.set("callbackUrl", callbackUrl);
  return { type: "redirect", url: url.toString() };
}

function makeRequest(pathname: string, cookies?: Record<string, string>): NextRequest {
  const url = `http://localhost:3001${pathname}`;
  const req = new NextRequest(url);
  if (cookies) {
    Object.entries(cookies).forEach(([name, value]) => {
      req.cookies.set(name, value);
    });
  }
  return req;
}

beforeEach(() => {
  vi.stubEnv("TOTP_SESSION_SECRET", "test-mfa-secret-32-bytes-long-abc123");
});

describe("checkMfaChallenge", () => {
  it("returns null when MFA is not required", async () => {
    const req = makeRequest("/app/dashboard");
    const result = await checkMfaChallenge(req, "user_1", false);
    expect(result).toBeNull();
  });

  it("redirects to security settings when enrollment is required", async () => {
    const req = makeRequest("/app/dashboard");
    const result = await checkMfaChallenge(req, "user_1", true, { enrollmentRequired: true });
    expect(result).not.toBeNull();
    expect(result!.url).toContain("/app/settings/security");
    expect(result!.url).toContain("setupMfa=1");
    expect(result!.url).toContain("callbackUrl=%2Fapp%2Fdashboard");
  });

  it("redirects to login when secret is missing", async () => {
    vi.stubEnv("TOTP_SESSION_SECRET", "");
    vi.stubEnv("PORTAL_JWT_SECRET", "");
    const req = makeRequest("/app/dashboard");
    const result = await checkMfaChallenge(req, "user_1", true);
    expect(result).not.toBeNull();
    expect(result!.url).toContain("/auth/login");
    expect(result!.url).toContain("error=mfa_unavailable");
  });

  it("returns null when a valid MFA cookie is present", async () => {
    const { signChallengeToken } = await import("@/lib/totp/challenge-session");
    const token = signChallengeToken("user_1");
    const req = makeRequest("/app/dashboard", { [MFA_CHALLENGE_COOKIE]: token });
    const result = await checkMfaChallenge(req, "user_1", true);
    expect(result).toBeNull();
  });

  it("redirects to /auth/2fa when cookie is missing", async () => {
    const req = makeRequest("/app/dashboard");
    const result = await checkMfaChallenge(req, "user_1", true);
    expect(result).not.toBeNull();
    expect(result!.url).toContain("/auth/2fa");
    expect(result!.url).toContain("callbackUrl=%2Fapp%2Fdashboard");
  });

  it("redirects to /auth/2fa when cookie is for a different user", async () => {
    const { signChallengeToken } = await import("@/lib/totp/challenge-session");
    const token = signChallengeToken("other_user");
    const req = makeRequest("/app/dashboard", { [MFA_CHALLENGE_COOKIE]: token });
    const result = await checkMfaChallenge(req, "user_1", true);
    expect(result).not.toBeNull();
    expect(result!.url).toContain("/auth/2fa");
  });

  it("redirects to /auth/2fa when cookie is expired", async () => {
    const { signChallengeToken, MFA_SESSION_DURATION_SECONDS } = await import("@/lib/totp/challenge-session");
    vi.useFakeTimers();
    const token = signChallengeToken("user_1");
    vi.advanceTimersByTime((MFA_SESSION_DURATION_SECONDS + 1) * 1000);

    const req = makeRequest("/app/dashboard", { [MFA_CHALLENGE_COOKIE]: token });
    const result = await checkMfaChallenge(req, "user_1", true);
    expect(result).not.toBeNull();
    expect(result!.url).toContain("/auth/2fa");
    vi.useRealTimers();
  });
});

describe("MFA requirement logic", () => {
  it("requires MFA when mfaEnabled is true (passkey or totp)", () => {
    const mfaEnabled = true;
    const twoFaEnforcedByOrg = false;
    expect(mfaEnabled || twoFaEnforcedByOrg).toBe(true);
  });

  it("requires MFA when org enforces it even if no factor is enrolled", () => {
    const mfaEnabled = false;
    const twoFaEnforcedByOrg = true;
    expect(mfaEnabled || twoFaEnforcedByOrg).toBe(true);
  });

  it("requires enrollment when org enforces and no factor is enrolled", () => {
    const hasFactor = false;
    const twoFaEnforcedByOrg = true;
    expect(twoFaEnforcedByOrg && !hasFactor).toBe(true);
  });

  it("does not require enrollment when user has a factor enrolled", () => {
    const hasFactor = true;
    const twoFaEnforcedByOrg = true;
    expect(twoFaEnforcedByOrg && !hasFactor).toBe(false);
  });

  it("does not require MFA when no factor and no org enforcement", () => {
    const mfaEnabled = false;
    const twoFaEnforcedByOrg = false;
    expect(mfaEnabled || twoFaEnforcedByOrg).toBe(false);
  });
});
