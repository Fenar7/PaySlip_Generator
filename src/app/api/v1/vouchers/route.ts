import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { incrementUsage } from "@/lib/plans/usage";
import { checkLimit } from "@/lib/plans/enforcement";
import { dispatchEvent } from "@/lib/webhook/deliver";
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
    requireScope(auth.scopes, "read:vouchers");

    const { searchParams } = request.nextUrl;
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get("status") ?? undefined;
    const type = searchParams.get("type") ?? undefined;
    const vendorId = searchParams.get("vendorId") ?? undefined;

    const where: Record<string, unknown> = {
      organizationId: auth.orgId,
      archivedAt: null,
    };
    if (status) where.status = status;
    if (type) where.type = type;
    if (vendorId) where.vendorId = vendorId;

    const [vouchers, total] = await Promise.all([
      db.voucher.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          voucherNumber: true,
          voucherDate: true,
          type: true,
          status: true,
          totalAmount: true,
          vendorId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.voucher.count({ where }),
    ]);

    const resp = apiResponse(vouchers, { page, limit, total, totalPages: Math.ceil(total / limit) });
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", "/api/v1/vouchers", 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:vouchers");

    const limitCheck = await checkLimit(auth.orgId, "vouchersPerMonth");
    if (!limitCheck.allowed) {
      throw new ApiError(ErrorCode.PLAN_LIMIT_REACHED, `Monthly voucher limit reached (${limitCheck.current}/${limitCheck.limit}).`, 402);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const { voucherNumber, voucherDate, type, vendorId, formData, lines } = body;

    if (!voucherNumber || !voucherDate) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "voucherNumber and voucherDate are required.", 422);
    }

    const totalAmount = Array.isArray(lines)
      ? lines.reduce((sum: number, l: { amount?: number }) => sum + (l.amount ?? 0), 0)
      : 0;

    const voucher = await db.voucher.create({
      data: {
        organizationId: auth.orgId,
        voucherNumber,
        voucherDate,
        type: type ?? "payment",
        status: "draft",
        vendorId: vendorId ?? null,
        formData: formData ?? {},
        totalAmount,
        isMultiLine: Array.isArray(lines) && lines.length > 1,
        lines: Array.isArray(lines) && lines.length > 0
          ? {
              create: (lines as Array<{ description: string; amount?: number; date?: string; time?: string; category?: string; sortOrder?: number }>)
                .map((l, idx) => ({
                  description: l.description,
                  amount: l.amount ?? 0,
                  date: l.date ?? null,
                  time: l.time ?? null,
                  category: l.category ?? null,
                  sortOrder: l.sortOrder ?? idx,
                })),
            }
          : undefined,
      },
      include: { lines: true },
    });

    await incrementUsage(auth.orgId, "vouchersPerMonth");

    dispatchEvent(auth.orgId, "voucher.created", {
      id: voucher.id,
      voucherNumber: voucher.voucherNumber,
      totalAmount: voucher.totalAmount,
    }).catch(() => {});

    const resp = apiResponse(voucher, undefined, 201);
    logApiRequest(auth.orgId, auth.apiKeyId, "POST", "/api/v1/vouchers", 201, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
