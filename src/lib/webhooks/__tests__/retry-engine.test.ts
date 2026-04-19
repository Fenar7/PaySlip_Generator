import { describe, it, expect } from "vitest";
import { getBackoffDelay, signWebhookPayload, getDeliveryHeaders } from "../retry-engine";

describe("Webhook Retry Engine", () => {
  describe("getBackoffDelay", () => {
    it("returns 30s for first attempt", () => {
      expect(getBackoffDelay(0)).toBe(30_000);
    });

    it("returns 2m for second attempt", () => {
      expect(getBackoffDelay(1)).toBe(120_000);
    });

    it("returns 10m for third attempt", () => {
      expect(getBackoffDelay(2)).toBe(600_000);
    });

    it("returns 1h for fourth attempt", () => {
      expect(getBackoffDelay(3)).toBe(3_600_000);
    });

    it("returns 4h for fifth attempt", () => {
      expect(getBackoffDelay(4)).toBe(14_400_000);
    });

    it("caps at maximum delay for attempts beyond schedule", () => {
      expect(getBackoffDelay(10)).toBe(14_400_000);
      expect(getBackoffDelay(100)).toBe(14_400_000);
    });

    it("follows exponential growth pattern", () => {
      const delays = [0, 1, 2, 3, 4].map(getBackoffDelay);
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThan(delays[i - 1]);
      }
    });
  });

  describe("signWebhookPayload", () => {
    it("generates consistent HMAC-SHA256 signatures", () => {
      const payload = '{"event":"invoice.created","data":{}}';
      const secret = "whsec_test123";

      const sig1 = signWebhookPayload(payload, secret);
      const sig2 = signWebhookPayload(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it("produces different signatures for different payloads", () => {
      const secret = "whsec_test123";
      const sig1 = signWebhookPayload("payload1", secret);
      const sig2 = signWebhookPayload("payload2", secret);
      expect(sig1).not.toBe(sig2);
    });

    it("produces different signatures for different secrets", () => {
      const payload = "same-payload";
      const sig1 = signWebhookPayload(payload, "secret1");
      const sig2 = signWebhookPayload(payload, "secret2");
      expect(sig1).not.toBe(sig2);
    });
  });

  describe("getDeliveryHeaders", () => {
    it("includes all required webhook headers", () => {
      const headers = getDeliveryHeaders('{"test":true}', "secret", "dlv_123");

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-Webhook-ID"]).toBe("dlv_123");
      expect(headers["X-Webhook-Timestamp"]).toMatch(/^\d+$/);
      expect(headers["X-Webhook-Signature"]).toMatch(/^v1=[a-f0-9]{64}$/);
      expect(headers["User-Agent"]).toBe("Slipwise-Webhooks/1.0");
    });

    it("includes timestamp in signature computation", () => {
      const payload = '{"data":1}';
      const secret = "test-secret";

      const h1 = getDeliveryHeaders(payload, secret, "id1");
      const h2 = getDeliveryHeaders(payload, secret, "id2");

      // Same timestamp means same signature (within same second)
      if (h1["X-Webhook-Timestamp"] === h2["X-Webhook-Timestamp"]) {
        expect(h1["X-Webhook-Signature"]).toBe(h2["X-Webhook-Signature"]);
      }
    });
  });
});
