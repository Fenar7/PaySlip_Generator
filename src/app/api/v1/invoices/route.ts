import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { incrementUsage } from "@/lib/plans/usage";
import { checkLimit } from "@/lib/plans/enforcement";
import { dispatchEvent } from "@/lib/webhook/deliver";
import { parseAccountingDate } from "@/lib/accounting/utils";
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
    requireScope(auth.scopes, "read:invoices");

    const { searchParams } = request.nextUrl;
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get("status") ?? undefined;
    const customerId = searchParams.get("customerId") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const sort = searchParams.get("sort") === "asc" ? "asc" as const : "desc" as const;

    const where: Record<string, unknown> = {
      organizationId: auth.orgId,
      archivedAt: null,
    };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { createdAt: sort },
        skip,
        take: limit,
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          dueDate: true,
          status: true,
          totalAmount: true,
          customerId: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.invoice.count({ where }),
    ]);

    const resp = apiResponse(invoices, { page, limit, total, totalPages: Math.ceil(total / limit) });
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", "/api/v1/invoices", 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    const resp = handleApiError(err);
    return resp;
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:invoices");

    const limitCheck = await checkLimit(auth.orgId, "invoicesPerMonth");
    if (!limitCheck.allowed) {
      throw new ApiError(
        ErrorCode.PLAN_LIMIT_REACHED,
        `Monthly invoice limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan.`,
        402
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const { invoiceNumber, invoiceDate, dueDate, customerId, notes, lineItems, formData } = body;

    if (!invoiceDate) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "invoiceDate is required.", 422);
    }

    let normalizedInvoiceDate: Date;
    let normalizedDueDate: Date | null = null;

    try {
      normalizedInvoiceDate = parseAccountingDate(invoiceDate);
      normalizedDueDate = dueDate ? parseAccountingDate(dueDate) : null;
    } catch {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "invoiceDate and dueDate must be valid dates.", 422);
    }

    const invoice = await db.invoice.create({
      data: {
        organizationId: auth.orgId,
        invoiceNumber: invoiceNumber ?? null,
        invoiceDate: normalizedInvoiceDate,
        dueDate: normalizedDueDate,
        customerId: customerId ?? null,
        notes: notes ?? null,
        formData: formData ?? {},
        status: "DRAFT",
        totalAmount: 0,
        lineItems: lineItems?.length
          ? {
              create: (lineItems as Array<{
                description: string;
                quantity?: number;
                unitPrice?: number;
                taxRate?: number;
                discount?: number;
                sortOrder?: number;
              }>).map(
                (li: { description: string; quantity?: number; unitPrice?: number; taxRate?: number; discount?: number; sortOrder?: number }, idx: number) => {
                  const qty = li.quantity ?? 1;
                  const price = li.unitPrice ?? 0;
                  const tax = li.taxRate ?? 0;
                  const disc = li.discount ?? 0;
                  const subtotal = qty * price;
                  const taxAmt = subtotal * (tax / 100);
                  const amount = subtotal + taxAmt - disc;
                  return {
                    description: li.description,
                    quantity: qty,
                    unitPrice: price,
                    taxRate: tax,
                    discount: disc,
                    amount,
                    sortOrder: li.sortOrder ?? idx,
                  };
                }
              ),
            }
          : undefined,
      },
      include: { lineItems: true },
    });

    // Update total from line items
    const totalAmount = invoice.lineItems.reduce((sum, li) => sum + li.amount, 0);
    const updated = await db.invoice.update({
      where: { id: invoice.id },
      data: { totalAmount },
      include: { lineItems: true },
    });

    await incrementUsage(auth.orgId, "invoicesPerMonth");

    // Fire webhook
    dispatchEvent(auth.orgId, "invoice.created", {
      id: updated.id,
      invoiceNumber: updated.invoiceNumber,
      totalAmount: updated.totalAmount,
      status: updated.status,
    }).catch(() => {});

    const resp = apiResponse(updated, undefined, 201);
    logApiRequest(auth.orgId, auth.apiKeyId, "POST", "/api/v1/invoices", 201, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
