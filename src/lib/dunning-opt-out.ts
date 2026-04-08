import "server-only";
import crypto from "crypto";

const OPT_OUT_SECRET = process.env.DUNNING_OPT_OUT_SECRET ?? "";

/**
 * Generate an HMAC-SHA256 opt-out token scoped per org+customer.
 * The token encodes: orgId:customerId
 */
export function generateOptOutToken(orgId: string, customerId: string): string {
  if (!OPT_OUT_SECRET) {
    throw new Error("DUNNING_OPT_OUT_SECRET is not configured");
  }
  const message = `${orgId}:${customerId}`;
  return crypto
    .createHmac("sha256", OPT_OUT_SECRET)
    .update(message)
    .digest("hex");
}

/**
 * Verify and decode an opt-out token.
 * Returns true if the token is valid for the given org+customer pair.
 *
 * Since HMAC is a one-way function, we need the orgId and customerId to verify.
 * The token URL includes them as query params or path segments.
 */
export function verifyOptOutToken(
  token: string,
  orgId: string,
  customerId: string
): boolean {
  if (!OPT_OUT_SECRET || !token || !orgId || !customerId) {
    return false;
  }
  const expected = generateOptOutToken(orgId, customerId);
  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Build the full unsubscribe URL for a dunning email.
 */
export function buildOptOutUrl(orgId: string, customerId: string): string {
  const token = generateOptOutToken(orgId, customerId);
  const baseUrl = process.env.CUSTOMER_PORTAL_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://app.slipwise.com";
  return `${baseUrl}/unsubscribe/dunning?token=${token}&org=${orgId}&cid=${customerId}`;
}
