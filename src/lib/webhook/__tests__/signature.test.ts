import { describe, it, expect } from "vitest";
import {
  generateWebhookSignature,
  generateSignatureHeaders,
  verifyWebhookSignature,
  generateSigningSecret,
} from "../signature";

describe("Webhook signature utilities", () => {
  const testSecret = "whsec_test_secret_123";
  const testBody = JSON.stringify({ event: "invoice.created", data: { id: "inv-1" } });
  const testTimestamp = 1700000000;

  describe("TC-15-038: HMAC signature roundtrip", () => {
    it("generates and verifies signature correctly", () => {
      const signature = generateWebhookSignature(testSecret, testBody, testTimestamp);
      expect(signature).toBeTruthy();
      expect(typeof signature).toBe("string");
      expect(signature).toMatch(/^[a-f0-9]{64}$/);

      const valid = verifyWebhookSignature(testSecret, testBody, testTimestamp, signature);
      expect(valid).toBe(true);
    });

    it("produces consistent signatures for same inputs", () => {
      const sig1 = generateWebhookSignature(testSecret, testBody, testTimestamp);
      const sig2 = generateWebhookSignature(testSecret, testBody, testTimestamp);
      expect(sig1).toBe(sig2);
    });
  });

  describe("generateSignatureHeaders", () => {
    it("includes all 4 required headers", () => {
      const headers = generateSignatureHeaders(testSecret, testBody, "delivery-123", "invoice.created");

      expect(headers["X-Slipwise-Signature"]).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(headers["X-Slipwise-Delivery"]).toBe("delivery-123");
      expect(headers["X-Slipwise-Event"]).toBe("invoice.created");
      expect(headers["X-Slipwise-Timestamp"]).toBeTruthy();
      expect(Number(headers["X-Slipwise-Timestamp"])).toBeGreaterThan(0);
    });
  });

  describe("verifyWebhookSignature", () => {
    it("returns false with wrong secret", () => {
      const signature = generateWebhookSignature(testSecret, testBody, testTimestamp);
      const valid = verifyWebhookSignature("wrong_secret", testBody, testTimestamp, signature);
      expect(valid).toBe(false);
    });

    it("returns false with wrong body", () => {
      const signature = generateWebhookSignature(testSecret, testBody, testTimestamp);
      const valid = verifyWebhookSignature(testSecret, "tampered body", testTimestamp, signature);
      expect(valid).toBe(false);
    });

    it("returns false with wrong timestamp", () => {
      const signature = generateWebhookSignature(testSecret, testBody, testTimestamp);
      const valid = verifyWebhookSignature(testSecret, testBody, testTimestamp + 1, signature);
      expect(valid).toBe(false);
    });
  });

  describe("generateSigningSecret", () => {
    it("starts with 'whsec_'", () => {
      const secret = generateSigningSecret();
      expect(secret).toMatch(/^whsec_[a-f0-9]{64}$/);
    });

    it("generates unique values", () => {
      const a = generateSigningSecret();
      const b = generateSigningSecret();
      expect(a).not.toBe(b);
    });
  });
});
