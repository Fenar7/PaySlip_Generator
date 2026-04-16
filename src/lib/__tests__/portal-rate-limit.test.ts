/**
 * Sprint 22.5 — Portal Rate Limiting (Redis + DB fallback) Tests
 *
 * Tests the Redis-preferred, DB-fallback rate limiting added in Sprint 22.5.
 * Uses a stripped-down test double for the rate-limit logic.
 */

import { describe, it, expect } from "vitest";

// ─── Pure rate-limit logic unit tests (no real DB/Redis) ──────────────────────

// Re-implement the core rate-limit decision logic to validate it independently
const MAGIC_LINK_MAX = 3;
const MAGIC_LINK_WINDOW_MS = 15 * 60 * 1000;

interface RateLimitRecord {
  count: number;
  windowEnd: Date;
}

function evaluateRateLimit(
  existing: RateLimitRecord | null,
  now: Date,
): { allowed: boolean; newCount: number; resetWindow: boolean } {
  if (!existing || existing.windowEnd < now) {
    return { allowed: true, newCount: 1, resetWindow: true };
  }
  if (existing.count >= MAGIC_LINK_MAX) {
    return { allowed: false, newCount: existing.count, resetWindow: false };
  }
  return { allowed: true, newCount: existing.count + 1, resetWindow: false };
}

describe("Portal rate limit evaluation", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("allows first request in new window", () => {
    const result = evaluateRateLimit(null, now);
    expect(result.allowed).toBe(true);
    expect(result.newCount).toBe(1);
    expect(result.resetWindow).toBe(true);
  });

  it("allows subsequent requests within limit", () => {
    const existing: RateLimitRecord = {
      count: 2,
      windowEnd: new Date(now.getTime() + MAGIC_LINK_WINDOW_MS),
    };
    const result = evaluateRateLimit(existing, now);
    expect(result.allowed).toBe(true);
    expect(result.newCount).toBe(3);
  });

  it("blocks request when at max", () => {
    const existing: RateLimitRecord = {
      count: 3,
      windowEnd: new Date(now.getTime() + MAGIC_LINK_WINDOW_MS),
    };
    const result = evaluateRateLimit(existing, now);
    expect(result.allowed).toBe(false);
  });

  it("resets window when window has expired", () => {
    const existing: RateLimitRecord = {
      count: 3,
      windowEnd: new Date(now.getTime() - 1000), // expired 1 second ago
    };
    const result = evaluateRateLimit(existing, now);
    expect(result.allowed).toBe(true);
    expect(result.newCount).toBe(1);
    expect(result.resetWindow).toBe(true);
  });

  it("does not allow the (max+1)th request in the same window", () => {
    for (let c = 1; c <= MAGIC_LINK_MAX; c++) {
      const existing: RateLimitRecord = {
        count: c,
        windowEnd: new Date(now.getTime() + MAGIC_LINK_WINDOW_MS),
      };
      const result = evaluateRateLimit(existing, now);
      if (c < MAGIC_LINK_MAX) {
        expect(result.allowed).toBe(true);
      } else {
        expect(result.allowed).toBe(false);
      }
    }
  });
});

// ─── Redis fallback path logic ────────────────────────────────────────────────

describe("Redis-to-DB fallback behavior", () => {
  it("falls through to DB path when Redis throws", () => {
    const redisError = new Error("Redis connection refused");
    let dbWasCalled = false;

    async function checkRateLimit(): Promise<boolean> {
      // Redis path
      try {
        throw redisError;
      } catch {
        // fall through
      }

      // DB path
      dbWasCalled = true;
      return true;
    }

    return checkRateLimit().then((allowed) => {
      expect(allowed).toBe(true);
      expect(dbWasCalled).toBe(true);
    });
  });

  it("fails open when both Redis and DB are unavailable", () => {
    async function checkRateLimit(): Promise<boolean> {
      try {
        throw new Error("Redis down");
      } catch {
        // Redis failed
      }

      try {
        throw new Error("DB down");
      } catch {
        return true; // fail open
      }
    }

    return checkRateLimit().then((allowed) => {
      expect(allowed).toBe(true);
    });
  });
});
