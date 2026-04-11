import crypto from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "@/lib/razorpay";

const ORIGINAL_ENV = { ...process.env };

describe("razorpay webhook signature verification", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("accepts a valid webhook signature", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
    const body = JSON.stringify({ event: "subscription.activated" });
    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    expect(verifyWebhookSignature(body, signature)).toBe(true);
  });

  it("rejects malformed signatures without throwing", () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
    const body = JSON.stringify({ event: "subscription.activated" });

    expect(() => verifyWebhookSignature(body, "bad")).not.toThrow();
    expect(verifyWebhookSignature(body, "bad")).toBe(false);
  });

  it("rejects signatures when the webhook secret is not configured", () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;

    expect(verifyWebhookSignature("{}", "abcd")).toBe(false);
  });
});
