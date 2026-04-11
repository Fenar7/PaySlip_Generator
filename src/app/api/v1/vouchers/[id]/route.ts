import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dispatchEvent } from "@/lib/webhook/deliver";
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
    requireScope(auth.scopes, "read:vouchers");
    const { id } = await context.params;

    const voucher = await db.voucher.findFirst({
      where: { id, organizationId: auth.orgId, archivedAt: null },
      include: { lines: true, vendor: true },
    });

    if (!voucher) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Voucher not found.", 404);
    }

    const resp = apiResponse(voucher);
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", `/api/v1/vouchers/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:vouchers");
    const { id } = await context.params;

    const voucher = await db.voucher.findFirst({
      where: { id, organizationId: auth.orgId, archivedAt: null },
    });

    if (!voucher) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Voucher not found.", 404);
    }

    if (voucher.status !== "draft") {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Only draft vouchers can be updated.", 422);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const { voucherDate, type, vendorId, formData, lines, status } = body;

    const updateData: Record<string, unknown> = {};
    if (voucherDate !== undefined) updateData.voucherDate = voucherDate;
    if (type !== undefined) updateData.type = type;
    if (vendorId !== undefined) updateData.vendorId = vendorId;
    if (formData !== undefined) updateData.formData = formData;
    if (status !== undefined) updateData.status = status;

    if (Array.isArray(lines)) {
      await db.voucherLine.deleteMany({ where: { voucherId: id } });
      await db.voucherLine.createMany({
        data: lines.map((l: { description: string; amount?: number; date?: string; time?: string; category?: string; sortOrder?: number }, idx: number) => ({
          voucherId: id,
          description: l.description,
          amount: l.amount ?? 0,
          date: l.date ?? null,
          time: l.time ?? null,
          category: l.category ?? null,
          sortOrder: l.sortOrder ?? idx,
        })),
      });
      updateData.totalAmount = lines.reduce((sum: number, l: { amount?: number }) => sum + (l.amount ?? 0), 0);
      updateData.isMultiLine = lines.length > 1;
    }

    const updated = await db.voucher.update({
      where: { id },
      data: updateData,
      include: { lines: true },
    });

    dispatchEvent(auth.orgId, "voucher.updated", {
      id: updated.id,
      voucherNumber: updated.voucherNumber,
    }).catch(() => {});

    const resp = apiResponse(updated);
    logApiRequest(auth.orgId, auth.apiKeyId, "PATCH", `/api/v1/vouchers/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "delete:vouchers");
    const { id } = await context.params;

    const voucher = await db.voucher.findFirst({
      where: { id, organizationId: auth.orgId, archivedAt: null },
    });

    if (!voucher) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Voucher not found.", 404);
    }

    await db.voucher.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    dispatchEvent(auth.orgId, "voucher.deleted", {
      id: voucher.id,
      voucherNumber: voucher.voucherNumber,
    }).catch(() => {});

    const resp = apiResponse({ id, deleted: true });
    logApiRequest(auth.orgId, auth.apiKeyId, "DELETE", `/api/v1/vouchers/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
