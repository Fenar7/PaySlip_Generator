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
      include: { customer: true },
    });

    if (!invoice) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Invoice not found.", 404);
    }

    if (invoice.status === "PAID") {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invoice is already paid.", 422);
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new ApiError(ErrorCode.INTERNAL_ERROR, "Payment gateway not configured.", 500);
    }

    // Create Razorpay payment link via API
    const razorpayAuth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    const rpResponse = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${razorpayAuth}`,
      },
      body: JSON.stringify({
        amount: Math.round(invoice.totalAmount * 100), // paise
        currency: "INR",
        description: `Invoice ${invoice.invoiceNumber}`,
        customer: invoice.customer
          ? {
              name: invoice.customer.name,
              email: invoice.customer.email ?? undefined,
              contact: invoice.customer.phone ?? undefined,
            }
          : undefined,
        reminder_enable: true,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://slipwise.in"}/invoice/${invoice.id}/payment-success`,
        callback_method: "get",
      }),
    });

    if (!rpResponse.ok) {
      const errBody = await rpResponse.text().catch(() => "Unknown error");
      throw new ApiError(ErrorCode.INTERNAL_ERROR, `Payment link creation failed: ${errBody}`, 500);
    }

    const rpData = (await rpResponse.json()) as {
      id: string;
      short_url: string;
      expire_by?: number;
    };

    await db.invoice.update({
      where: { id },
      data: {
        razorpayPaymentLinkId: rpData.id,
        razorpayPaymentLinkUrl: rpData.short_url,
        paymentLinkExpiresAt: rpData.expire_by
          ? new Date(rpData.expire_by * 1000)
          : null,
      },
    });

    const resp = apiResponse({
      paymentLinkId: rpData.id,
      paymentLinkUrl: rpData.short_url,
      invoiceId: id,
      amount: invoice.totalAmount,
    });
    logApiRequest(auth.orgId, auth.apiKeyId, "POST", `/api/v1/invoices/${id}/payment-link`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
