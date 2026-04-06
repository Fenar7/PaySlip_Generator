import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dispatchEvent } from "@/lib/api-webhooks";
import {
  authenticateApiRequest,
  requireScope,
  apiResponse,
  handleApiError,
  logApiRequest,
  getClientIp,
  ErrorCode,
  ApiError,
} from "../../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:invoices");
    const { id } = await context.params;

    const invoice = await db.invoice.findFirst({
      where: { id, organizationId: auth.orgId, archivedAt: null },
    });

    if (!invoice) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Invoice not found.", 404);
    }

    if (invoice.status === "PAID") {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invoice is already paid.", 422);
    }

    const body = await request.json().catch(() => ({})) as {
      amount?: number;
      method?: string;
      note?: string;
      currency?: string;
    };

    const paymentAmount = body.amount ?? invoice.totalAmount;
    const existingPayments = await db.invoicePayment.findMany({
      where: { invoiceId: id },
    });
    const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0) + paymentAmount;
    const isPartial = totalPaid < invoice.totalAmount;

    const payment = await db.invoicePayment.create({
      data: {
        invoiceId: id,
        orgId: auth.orgId,
        amount: paymentAmount,
        currency: body.currency ?? "INR",
        method: body.method ?? null,
        note: body.note ?? null,
        isPartial,
      },
    });

    const newStatus = isPartial ? "PARTIALLY_PAID" : "PAID";
    await db.invoice.update({
      where: { id },
      data: {
        status: newStatus,
        ...(newStatus === "PAID" ? { paidAt: new Date() } : {}),
      },
    });

    dispatchEvent(auth.orgId, "invoice.payment_received", {
      invoiceId: id,
      invoiceNumber: invoice.invoiceNumber,
      paymentId: payment.id,
      amount: paymentAmount,
      status: newStatus,
    }).catch(() => {});

    const resp = apiResponse({
      paymentId: payment.id,
      invoiceId: id,
      amount: paymentAmount,
      status: newStatus,
      totalPaid,
      remaining: Math.max(0, invoice.totalAmount - totalPaid),
    });
    logApiRequest(auth.orgId, auth.apiKeyId, "POST", `/api/v1/invoices/${id}/mark-paid`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
