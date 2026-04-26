/**
 * MFA challenge session cookie helpers.
 *
 * Server-side (Node.js): sign cookies with crypto.createHmac (same HS256
 * pattern used in portal-auth.ts).
 *
 * Edge/middleware: verify with the Web Crypto API (crypto.subtle) which is
 * available in the Next.js Edge Runtime.
 *
 * Originally TOTP-specific, now generalized for any MFA factor (TOTP, passkey,
 * recovery code). The cookie name stays stable to avoid migration friction.
 */

import crypto from "crypto";

export const MFA_CHALLENGE_COOKIE = "sw_2fa";
/** How long a verified MFA session stays valid (12 hours). */
export const MFA_SESSION_DURATION_SECONDS = 12 * 60 * 60;

// Legacy aliases for backward compatibility during transition
export const TOTP_CHALLENGE_COOKIE = MFA_CHALLENGE_COOKIE;
export const TOTP_SESSION_DURATION_SECONDS = MFA_SESSION_DURATION_SECONDS;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function getSecret(): string {
  const s = process.env.TOTP_SESSION_SECRET ?? process.env.PORTAL_JWT_SECRET ?? "";
  if (!s) {
    throw new Error(
      "TOTP_SESSION_SECRET is not configured. Add it to your environment variables."
    );
  }
  return s;
}

// ─── Server-side: sign ───────────────────────────────────────────────────────

/**
 * Create a signed challenge cookie value tied to a specific user.
 * Call this after successfully verifying any MFA factor (TOTP, passkey, recovery).
 */
export function signChallengeToken(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(
    JSON.stringify({ sub: userId, iat: now, exp: now + MFA_SESSION_DURATION_SECONDS })
  );
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

// ─── Edge-compatible: verify via crypto.subtle ───────────────────────────────

/**
 * Verify the challenge cookie in the Edge Runtime (Next.js middleware).
 * Returns the userId on success, null on any failure.
 */
export async function verifyChallengeToken(
  token: string,
  secret: string
): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;

    // Import the signing key using the Web Crypto API
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // base64url → Uint8Array
    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      enc.encode(`${header}.${body}`)
    );
    if (!isValid) return null;

    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as { sub?: string; exp?: number };

    const now = Math.floor(Date.now() / 1000);
    if (!payload.sub || !payload.exp || payload.exp <= now) return null;

    return payload.sub;
  } catch {
    return null;
  }
}
