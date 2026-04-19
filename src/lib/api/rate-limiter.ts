/**
 * API Rate Limiter — Phase 28 Sprint 28.4
 *
 * Tier-based rate limiting for the Public API.
 * Uses a sliding window counter with in-memory fallback.
 *
 * Tiers:
 *   free:       60 req/min,   1000 req/day
 *   pro:        300 req/min,  10000 req/day
 *   enterprise: 1000 req/min, 100000 req/day
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RateLimitTier = "free" | "pro" | "enterprise";

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfterMs?: number;
}

// ─── Tier Configuration ───────────────────────────────────────────────────────

const TIER_LIMITS: Record<RateLimitTier, RateLimitConfig> = {
  free: { requestsPerMinute: 60, requestsPerDay: 1000 },
  pro: { requestsPerMinute: 300, requestsPerDay: 10000 },
  enterprise: { requestsPerMinute: 1000, requestsPerDay: 100000 },
};

// ─── In-Memory Sliding Window ─────────────────────────────────────────────────

interface WindowEntry {
  count: number;
  resetAt: number;
}

const minuteWindows = new Map<string, WindowEntry>();
const dayWindows = new Map<string, WindowEntry>();

function getOrCreateWindow(
  map: Map<string, WindowEntry>,
  key: string,
  windowMs: number
): WindowEntry {
  const now = Date.now();
  const existing = map.get(key);

  if (existing && existing.resetAt > now) {
    return existing;
  }

  const entry: WindowEntry = {
    count: 0,
    resetAt: now + windowMs,
  };
  map.set(key, entry);
  return entry;
}

// ─── Rate Limit Check ─────────────────────────────────────────────────────────

/**
 * Check and consume a rate limit token for the given API key.
 *
 * @param apiKeyId - Unique identifier for the API key
 * @param tier - The rate limit tier (free/pro/enterprise)
 * @returns RateLimitResult indicating if the request is allowed
 */
export function checkRateLimit(apiKeyId: string, tier: RateLimitTier): RateLimitResult {
  const config = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const now = Date.now();

  // Check minute window
  const minuteKey = `min:${apiKeyId}`;
  const minuteEntry = getOrCreateWindow(minuteWindows, minuteKey, 60_000);

  if (minuteEntry.count >= config.requestsPerMinute) {
    return {
      allowed: false,
      remaining: 0,
      limit: config.requestsPerMinute,
      resetAt: new Date(minuteEntry.resetAt),
      retryAfterMs: minuteEntry.resetAt - now,
    };
  }

  // Check daily window
  const dayKey = `day:${apiKeyId}`;
  const dayEntry = getOrCreateWindow(dayWindows, dayKey, 86_400_000);

  if (dayEntry.count >= config.requestsPerDay) {
    return {
      allowed: false,
      remaining: 0,
      limit: config.requestsPerDay,
      resetAt: new Date(dayEntry.resetAt),
      retryAfterMs: dayEntry.resetAt - now,
    };
  }

  // Consume tokens
  minuteEntry.count++;
  dayEntry.count++;

  const minuteRemaining = config.requestsPerMinute - minuteEntry.count;

  return {
    allowed: true,
    remaining: minuteRemaining,
    limit: config.requestsPerMinute,
    resetAt: new Date(minuteEntry.resetAt),
  };
}

/**
 * Get rate limit headers for the response.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
  };

  if (!result.allowed && result.retryAfterMs) {
    headers["Retry-After"] = String(Math.ceil(result.retryAfterMs / 1000));
  }

  return headers;
}

/**
 * Reset rate limit counters for a key (used in testing or key rotation).
 */
export function resetRateLimit(apiKeyId: string): void {
  minuteWindows.delete(`min:${apiKeyId}`);
  dayWindows.delete(`day:${apiKeyId}`);
}

/**
 * Get the tier configuration for display/documentation.
 */
export function getTierLimits(tier: RateLimitTier): RateLimitConfig {
  return { ...TIER_LIMITS[tier] };
}

// Periodic cleanup of expired windows (every 5 minutes)
if (typeof globalThis !== "undefined") {
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of minuteWindows) {
      if (entry.resetAt <= now) minuteWindows.delete(key);
    }
    for (const [key, entry] of dayWindows) {
      if (entry.resetAt <= now) dayWindows.delete(key);
    }
  };

  // Only set interval in non-test environments
  if (process.env.NODE_ENV !== "test") {
    setInterval(cleanup, CLEANUP_INTERVAL).unref();
  }
}
