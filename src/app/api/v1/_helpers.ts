import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/api-keys";
import { checkFeature } from "@/lib/plans/enforcement";
import { db } from "@/lib/db";

export const ErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  PLAN_LIMIT_REACHED: "PLAN_LIMIT_REACHED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

const STATUS_MAP: Record<string, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.PLAN_LIMIT_REACHED]: 402,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

export type AuthResult = {
  orgId: string;
  apiKeyId: string;
  scopes: string[];
};

export async function authenticateApiRequest(
  request: NextRequest
): Promise<AuthResult> {
  let rawKey: string | null = null;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    rawKey = authHeader.slice(7).trim();
  }

  if (!rawKey) {
    rawKey = request.headers.get("x-api-key");
  }

  if (!rawKey) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "Missing API key. Provide via Authorization: Bearer <key> or X-API-Key header.", 401);
  }

  const result = await validateApiKey(rawKey);
  if (!result) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "Invalid or expired API key.", 401);
  }

  const hasApiAccess = await checkFeature(result.orgId, "apiAccess");
  if (!hasApiAccess) {
    throw new ApiError(
      ErrorCode.PLAN_LIMIT_REACHED,
      "API access requires the Pro plan or higher. Upgrade at https://slipwise.in/pricing",
      402
    );
  }

  return result;
}

export function requireScope(scopes: string[], required: string): void {
  if (!scopes.includes(required) && !scopes.includes("*")) {
    throw new ApiError(
      ErrorCode.FORBIDDEN,
      `Missing required scope: ${required}`,
      403
    );
  }
}

export function apiResponse(
  data: unknown,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse {
  const body: Record<string, unknown> = { success: true, data };
  if (meta && Object.keys(meta).length > 0) {
    body.meta = meta;
  }
  return NextResponse.json(body, { status });
}

export function apiError(
  code: string,
  message: string,
  status?: number
): NextResponse {
  const httpStatus = status ?? STATUS_MAP[code] ?? 500;
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status: httpStatus }
  );
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return apiError(err.code, err.message, err.status);
  }
  console.error("[api/v1] Unhandled error:", err);
  return apiError(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred.", 500);
}

export function logApiRequest(
  orgId: string,
  apiKeyId: string | null,
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  ip: string | null
): void {
  db.apiRequestLog
    .create({
      data: { orgId, apiKeyId, method, path, statusCode, durationMs, ip },
    })
    .catch(() => {
      // fire-and-forget
    });
}

export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20)
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}
