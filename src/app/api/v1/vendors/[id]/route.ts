import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  authenticateApiRequest,
  requireScope,
  apiResponse,
  handleApiError,
  logApiRequest,
  getClientIp,
  ErrorCode,
  ApiError,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "read:vendors");
    const { id } = await context.params;

    const vendor = await db.vendor.findFirst({
      where: { id, organizationId: auth.orgId },
      include: { vouchers: { take: 10, orderBy: { createdAt: "desc" }, select: { id: true, voucherNumber: true, status: true, totalAmount: true } } },
    });

    if (!vendor) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Vendor not found.", 404);
    }

    const resp = apiResponse(vendor);
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", `/api/v1/vendors/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:vendors");
    const { id } = await context.params;

    const existing = await db.vendor.findFirst({
      where: { id, organizationId: auth.orgId },
    });

    if (!existing) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Vendor not found.", 404);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const { name, email, phone, address, taxId, gstin } = body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (taxId !== undefined) updateData.taxId = taxId;
    if (gstin !== undefined) updateData.gstin = gstin;

    const updated = await db.vendor.update({
      where: { id },
      data: updateData,
    });

    const resp = apiResponse(updated);
    logApiRequest(auth.orgId, auth.apiKeyId, "PATCH", `/api/v1/vendors/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
