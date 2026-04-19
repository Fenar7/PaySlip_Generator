/**
 * API Token Validation — Phase 28 Sprint 28.4
 *
 * Validates API keys from Authorization headers, checks scopes,
 * applies rate limiting, and returns the authenticated context.
 */

import { createHash } from "crypto";
import { db } from "@/lib/db";
import { checkRateLimit, getRateLimitHeaders, type RateLimitResult, type RateLimitTier } from "./rate-limiter";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiAuthContext {
  apiKeyId: string;
  orgId: string;
  scopes: string[];
  tier: RateLimitTier;
  rateLimitResult: RateLimitResult;
}

export type ApiAuthResult =
  | { authenticated: true; context: ApiAuthContext; headers: Record<string, string> }
  | { authenticated: false; error: string; status: number; headers?: Record<string, string> };

// ─── Token Extraction ─────────────────────────────────────────────────────────

/**
 * Extract bearer token from Authorization header.
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  return parts[1];
}

/**
 * Hash a raw API key to match against stored keyHash.
 */
function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate an API request and return the authenticated context.
 *
 * @param authHeader - The raw Authorization header value
 * @param requiredScopes - Scopes that must be present on the key
 * @returns Authentication result with context or error
 */
export async function validateApiToken(
  authHeader: string | null,
  requiredScopes?: string[]
): Promise<ApiAuthResult> {
  const token = extractBearerToken(authHeader);

  if (!token) {
    return {
      authenticated: false,
      error: "Missing or invalid Authorization header. Use: Bearer <api_key>",
      status: 401,
    };
  }

  // Hash the token and look up in database
  const keyHash = hashApiKey(token);

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      orgId: true,
      scopes: true,
      isActive: true,
      expiresAt: true,
      rateLimitTier: true,
    },
  });

  if (!apiKey) {
    return {
      authenticated: false,
      error: "Invalid API key",
      status: 401,
    };
  }

  if (!apiKey.isActive) {
    return {
      authenticated: false,
      error: "API key has been revoked",
      status: 401,
    };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return {
      authenticated: false,
      error: "API key has expired",
      status: 401,
    };
  }

  // Check scopes
  if (requiredScopes && requiredScopes.length > 0) {
    const hasAllScopes = requiredScopes.every((s) => apiKey.scopes.includes(s));
    if (!hasAllScopes) {
      return {
        authenticated: false,
        error: `Insufficient scopes. Required: ${requiredScopes.join(", ")}`,
        status: 403,
      };
    }
  }

  // Apply rate limiting
  const tier = (apiKey.rateLimitTier || "free") as RateLimitTier;
  const rateLimitResult = checkRateLimit(apiKey.id, tier);
  const headers = getRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return {
      authenticated: false,
      error: "Rate limit exceeded",
      status: 429,
      headers,
    };
  }

  // Update lastUsedAt (fire-and-forget)
  db.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    authenticated: true,
    context: {
      apiKeyId: apiKey.id,
      orgId: apiKey.orgId,
      scopes: apiKey.scopes,
      tier,
      rateLimitResult,
    },
    headers,
  };
}

/**
 * Check if authenticated context has a specific scope.
 */
export function hasScope(context: ApiAuthContext, scope: string): boolean {
  return context.scopes.includes(scope) || context.scopes.includes("*");
}
