import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitHeaders,
  getTierLimits,
} from "../rate-limiter";

describe("API Rate Limiter", () => {
  const testKey = "test-api-key-123";

  beforeEach(() => {
    resetRateLimit(testKey);
  });

  describe("checkRateLimit", () => {
    it("allows requests within free tier limit", () => {
      const result = checkRateLimit(testKey, "free");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59); // 60 - 1
      expect(result.limit).toBe(60);
    });

    it("allows requests within pro tier limit", () => {
      const result = checkRateLimit(testKey, "pro");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(299);
      expect(result.limit).toBe(300);
    });

    it("allows requests within enterprise tier limit", () => {
      const result = checkRateLimit(testKey, "enterprise");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999);
      expect(result.limit).toBe(1000);
    });

    it("denies requests when minute limit exceeded", () => {
      // Exhaust the free tier minute limit
      for (let i = 0; i < 60; i++) {
        checkRateLimit(testKey, "free");
      }

      const result = checkRateLimit(testKey, "free");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it("decrements remaining count correctly", () => {
      checkRateLimit(testKey, "free");
      checkRateLimit(testKey, "free");
      const result = checkRateLimit(testKey, "free");
      expect(result.remaining).toBe(57); // 60 - 3
    });

    it("provides a valid resetAt timestamp", () => {
      const result = checkRateLimit(testKey, "free");
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("isolates rate limits between different keys", () => {
      resetRateLimit("key-a");
      resetRateLimit("key-b");

      // Exhaust key-a
      for (let i = 0; i < 60; i++) {
        checkRateLimit("key-a", "free");
      }

      // key-b should still be allowed
      const result = checkRateLimit("key-b", "free");
      expect(result.allowed).toBe(true);

      resetRateLimit("key-a");
      resetRateLimit("key-b");
    });
  });

  describe("getRateLimitHeaders", () => {
    it("returns standard rate limit headers for allowed request", () => {
      const result = checkRateLimit(testKey, "free");
      const headers = getRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBe("60");
      expect(headers["X-RateLimit-Remaining"]).toBe("59");
      expect(headers["X-RateLimit-Reset"]).toBeDefined();
      expect(headers["Retry-After"]).toBeUndefined();
    });

    it("includes Retry-After header when rate limited", () => {
      for (let i = 0; i < 60; i++) {
        checkRateLimit(testKey, "free");
      }
      const result = checkRateLimit(testKey, "free");
      const headers = getRateLimitHeaders(result);

      expect(headers["Retry-After"]).toBeDefined();
      expect(Number(headers["Retry-After"])).toBeGreaterThan(0);
    });
  });

  describe("resetRateLimit", () => {
    it("resets counters allowing new requests", () => {
      // Exhaust limit
      for (let i = 0; i < 60; i++) {
        checkRateLimit(testKey, "free");
      }
      expect(checkRateLimit(testKey, "free").allowed).toBe(false);

      // Reset
      resetRateLimit(testKey);

      // Should be allowed again
      const result = checkRateLimit(testKey, "free");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59);
    });
  });

  describe("getTierLimits", () => {
    it("returns correct free tier config", () => {
      const config = getTierLimits("free");
      expect(config.requestsPerMinute).toBe(60);
      expect(config.requestsPerDay).toBe(1000);
    });

    it("returns correct pro tier config", () => {
      const config = getTierLimits("pro");
      expect(config.requestsPerMinute).toBe(300);
      expect(config.requestsPerDay).toBe(10000);
    });

    it("returns correct enterprise tier config", () => {
      const config = getTierLimits("enterprise");
      expect(config.requestsPerMinute).toBe(1000);
      expect(config.requestsPerDay).toBe(100000);
    });
  });
});
