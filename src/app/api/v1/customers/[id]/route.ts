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
    requireScope(auth.scopes, "read:customers");
    const { id } = await context.params;

    const customer = await db.customer.findFirst({
      where: { id, organizationId: auth.orgId },
      include: { invoices: { take: 10, orderBy: { createdAt: "desc" }, select: { id: true, invoiceNumber: true, status: true, totalAmount: true } } },
    });

    if (!customer) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Customer not found.", 404);
    }

    const resp = apiResponse(customer);
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", `/api/v1/customers/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:customers");
    const { id } = await context.params;

    const existing = await db.customer.findFirst({
      where: { id, organizationId: auth.orgId },
    });

    if (!existing) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Customer not found.", 404);
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

    const updated = await db.customer.update({
      where: { id },
      data: updateData,
    });

    const resp = apiResponse(updated);
    logApiRequest(auth.orgId, auth.apiKeyId, "PATCH", `/api/v1/customers/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
