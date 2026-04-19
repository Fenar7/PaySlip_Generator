import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyStripeWebhookSignature } from "../stripe";
import { verifyRazorpayWebhookSignature } from "../razorpay";
import crypto from "crypto";

describe("Stripe Webhook Signature Verification", () => {
  const secret = "whsec_test_secret_key_123";
  const payload = '{"type":"checkout.session.completed","data":{}}';

  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
  });

  it("should accept valid signature", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payload}`;
    const sig = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
    const header = `t=${timestamp},v1=${sig}`;

    expect(verifyStripeWebhookSignature(payload, header)).toBe(true);
  });

  it("should reject invalid signature", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const header = `t=${timestamp},v1=${"a".repeat(64)}`;

    expect(verifyStripeWebhookSignature(payload, header)).toBe(false);
  });

  it("should reject expired timestamps (>5 min old)", () => {
    const timestamp = Math.floor(Date.now() / 1000) - 400; // 6+ minutes ago
    const signedPayload = `${timestamp}.${payload}`;
    const sig = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
    const header = `t=${timestamp},v1=${sig}`;

    expect(verifyStripeWebhookSignature(payload, header)).toBe(false);
  });

  it("should reject missing signature header", () => {
    expect(verifyStripeWebhookSignature(payload, "")).toBe(false);
  });

  it("should reject malformed header", () => {
    expect(verifyStripeWebhookSignature(payload, "garbage")).toBe(false);
  });
});

describe("Razorpay Webhook Signature Verification", () => {
  const secret = "rzp_webhook_secret_456";
  const payload = '{"event":"subscription.activated","payload":{}}';

  beforeEach(() => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", secret);
  });

  it("should accept valid signature", () => {
    const sig = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
    expect(verifyRazorpayWebhookSignature(payload, sig)).toBe(true);
  });

  it("should reject invalid signature", () => {
    expect(verifyRazorpayWebhookSignature(payload, "a".repeat(64))).toBe(false);
  });

  it("should reject empty signature", () => {
    expect(verifyRazorpayWebhookSignature(payload, "")).toBe(false);
  });

  it("should reject non-hex signature", () => {
    expect(verifyRazorpayWebhookSignature(payload, "not-hex-at-all")).toBe(false);
  });
});
