import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-keys", () => ({
  validateApiKey: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
  getOrgPlan: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    apiRequestLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByOrg: vi.fn(),
}));

import { validateApiKey } from "@/lib/api-keys";
import { checkFeature, getOrgPlan } from "@/lib/plans/enforcement";
import { rateLimitByOrg } from "@/lib/rate-limit";
import {
  authenticateApiRequest,
  requireScope,
  ApiError,
  ErrorCode,
  apiError,
  apiResponse,
  parsePagination,
} from "../_helpers";

const mockValidate = vi.mocked(validateApiKey);
const mockCheck = vi.mocked(checkFeature);
const mockGetOrgPlan = vi.mocked(getOrgPlan);
const mockRateLimitByOrg = vi.mocked(rateLimitByOrg);

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL("http://localhost/api/v1/invoices"), { headers });
}

describe("authenticateApiRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrgPlan.mockResolvedValue({
      planId: "pro",
      status: "active",
      limits: {} as never,
      trialEndsAt: null,
    });
    mockRateLimitByOrg.mockResolvedValue({
      success: true,
      remaining: 299,
    });
  });

  it("throws UNAUTHORIZED when no key is provided", async () => {
    const req = makeRequest();
    await expect(authenticateApiRequest(req)).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.code === ErrorCode.UNAUTHORIZED
    );
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("reads token from Authorization: Bearer header", async () => {
    mockValidate.mockResolvedValue({
      orgId: "org-1",
      apiKeyId: "key-1",
      scopes: ["invoices:read"],
    });
    mockCheck.mockResolvedValue(true);
    const req = makeRequest({ authorization: "Bearer slw_live_abc123" });
    const result = await authenticateApiRequest(req);
    expect(mockValidate).toHaveBeenCalledWith("slw_live_abc123");
    expect(result).toEqual({ orgId: "org-1", apiKeyId: "key-1", scopes: ["invoices:read"] });
    expect(mockRateLimitByOrg).toHaveBeenCalledTimes(2);
  });

  it("reads token from X-API-Key header (fallback)", async () => {
    mockValidate.mockResolvedValue({
      orgId: "org-2",
      apiKeyId: "key-2",
      scopes: ["invoices:write"],
    });
    mockCheck.mockResolvedValue(true);
    const req = makeRequest({ "x-api-key": "slw_live_xyz" });
    const result = await authenticateApiRequest(req);
    expect(mockValidate).toHaveBeenCalledWith("slw_live_xyz");
    expect(result.orgId).toBe("org-2");
  });

  it("throws UNAUTHORIZED when key hash is not found", async () => {
    mockValidate.mockResolvedValue(null);
    const req = makeRequest({ authorization: "Bearer slw_live_invalid" });
    await expect(authenticateApiRequest(req)).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.code === ErrorCode.UNAUTHORIZED && e.status === 401
    );
  });

  it("throws PLAN_LIMIT_REACHED when org lacks apiAccess feature", async () => {
    mockValidate.mockResolvedValue({
      orgId: "org-free",
      apiKeyId: "key-3",
      scopes: ["invoices:read"],
    });
    mockCheck.mockResolvedValue(false);
    const req = makeRequest({ authorization: "Bearer slw_live_free" });
    await expect(authenticateApiRequest(req)).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ApiError && e.code === ErrorCode.PLAN_LIMIT_REACHED && e.status === 402
    );
  });

  it("throws RATE_LIMITED when the org exceeds its tier limit", async () => {
    mockValidate.mockResolvedValue({
      orgId: "org-pro",
      apiKeyId: "key-4",
      scopes: ["invoices:read"],
    });
    mockCheck.mockResolvedValue(true);
    mockRateLimitByOrg
      .mockResolvedValueOnce({
        success: false,
        remaining: 0,
        retryAfter: 60,
      })
      .mockResolvedValueOnce({
        success: true,
        remaining: 9999,
      });

    const req = makeRequest({ authorization: "Bearer slw_live_pro" });

    await expect(authenticateApiRequest(req)).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.code === ErrorCode.RATE_LIMITED,
    );
  });

  it("ignores malformed Bearer header (no token part)", async () => {
    const req = makeRequest({ authorization: "Bearer" });
    await expect(authenticateApiRequest(req)).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.code === ErrorCode.UNAUTHORIZED
    );
    expect(mockValidate).not.toHaveBeenCalled();
  });
});

describe("requireScope", () => {
  it("passes when required scope is present", () => {
    expect(() => requireScope(["invoices:read", "customers:read"], "invoices:read")).not.toThrow();
  });

  it("passes when wildcard '*' scope is present", () => {
    expect(() => requireScope(["*"], "invoices:write")).not.toThrow();
  });

  it("throws FORBIDDEN when scope is missing", () => {
    expect(() => requireScope(["customers:read"], "invoices:write")).toThrow(ApiError);
    try {
      requireScope(["customers:read"], "invoices:write");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).code).toBe(ErrorCode.FORBIDDEN);
      expect((e as ApiError).status).toBe(403);
    }
  });

  it("throws FORBIDDEN when scopes array is empty", () => {
    expect(() => requireScope([], "invoices:read")).toThrow(ApiError);
  });
});

describe("apiResponse", () => {
  it("returns 200 with success: true by default", async () => {
    const res = apiResponse({ id: "inv-1" });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: "inv-1" });
  });

  it("includes meta when provided", async () => {
    const res = apiResponse([], { page: 1, total: 5 }, 200);
    const body = await res.json();
    expect(body.meta).toEqual({ page: 1, total: 5 });
  });

  it("omits meta when empty", async () => {
    const res = apiResponse({ id: "x" }, {});
    const body = await res.json();
    expect(body.meta).toBeUndefined();
  });
});

describe("apiError", () => {
  it("returns correct HTTP status from status map", async () => {
    const res = apiError(ErrorCode.NOT_FOUND, "Not found");
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.NOT_FOUND);
    expect(body.error.message).toBe("Not found");
  });

  it("accepts custom status override", async () => {
    const res = apiError("CUSTOM", "custom error", 418);
    expect(res.status).toBe(418);
  });

  it("falls back to 500 for unknown codes", async () => {
    const res = apiError("UNKNOWN_CODE", "something broke");
    expect(res.status).toBe(500);
  });
});

describe("parsePagination", () => {
  it("returns defaults when no params given", () => {
    const result = parsePagination(new URLSearchParams());
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });

  it("parses valid page and limit", () => {
    const result = parsePagination(new URLSearchParams("page=3&limit=50"));
    expect(result).toEqual({ page: 3, limit: 50, skip: 100 });
  });

  it("clamps limit to max 100", () => {
    const result = parsePagination(new URLSearchParams("limit=999"));
    expect(result.limit).toBe(100);
  });

  it("clamps page to minimum 1", () => {
    const result = parsePagination(new URLSearchParams("page=0"));
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it("handles non-numeric values gracefully", () => {
    const result = parsePagination(new URLSearchParams("page=abc&limit=xyz"));
    expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
  });
});
