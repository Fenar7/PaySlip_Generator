import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  authenticateApiRequest,
  requireScope,
  apiResponse,
  handleApiError,
  logApiRequest,
  parsePagination,
  getClientIp,
  ErrorCode,
  ApiError,
} from "../_helpers";

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "read:vendors");

    const { searchParams } = request.nextUrl;
    const { page, limit, skip } = parsePagination(searchParams);
    const search = searchParams.get("search") ?? undefined;

    const where: Record<string, unknown> = { organizationId: auth.orgId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      db.vendor.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.vendor.count({ where }),
    ]);

    const resp = apiResponse(vendors, { page, limit, total, totalPages: Math.ceil(total / limit) });
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", "/api/v1/vendors", 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:vendors");

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const { name, email, phone, address, taxId, gstin } = body;
    if (!name) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "name is required.", 422);
    }

    const vendor = await db.vendor.create({
      data: {
        organizationId: auth.orgId,
        name,
        email: email ?? null,
        phone: phone ?? null,
        address: address ?? null,
        taxId: taxId ?? null,
        gstin: gstin ?? null,
      },
    });

    const resp = apiResponse(vendor, undefined, 201);
    logApiRequest(auth.orgId, auth.apiKeyId, "POST", "/api/v1/vendors", 201, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
