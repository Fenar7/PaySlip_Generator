/**
 * Step-up verification tokens for destructive MFA-factor operations.
 *
 * When removing a passkey (or other destructive security actions), we must
 * re-verify the user's identity without assuming a particular auth method.
 * This module issues short-lived, HMAC-signed tokens that prove the user
 * completed a step-up challenge (password, TOTP, or passkey).
 *
 * Token format: base64url(payload).base64url(signature)
 * Payload: { sub: userId, method: "password"|"totp"|"passkey", exp: unixSeconds }
 */

import crypto from "crypto";

const STEP_UP_DURATION_SECONDS = 5 * 60; // 5 minutes

function getSecret(): string {
  const s = process.env.TOTP_SESSION_SECRET ?? process.env.PORTAL_JWT_SECRET ?? "";
  if (!s) {
    throw new Error(
      "TOTP_SESSION_SECRET is not configured. Step-up verification requires a signing secret."
    );
  }
  return s;
}

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

export type StepUpMethod = "password" | "totp" | "passkey";

interface StepUpPayload {
  sub: string;
  method: StepUpMethod;
  exp: number;
}

/**
 * Sign a step-up token proving the user completed verification with `method`.
 */
export function signStepUpToken(userId: string, method: StepUpMethod): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: StepUpPayload = { sub: userId, method, exp: now + STEP_UP_DURATION_SECONDS };
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

/**
 * Verify a step-up token. Returns the method on success, null on failure.
 * The token must belong to `expectedUserId` and not be expired.
 */
export function verifyStepUpToken(
  token: string,
  expectedUserId: string
): StepUpMethod | null {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;

    const expectedSig = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");

    // Timing-safe comparison
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const payload: StepUpPayload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (payload.sub !== expectedUserId) return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    return payload.method;
  } catch {
    return null;
  }
}