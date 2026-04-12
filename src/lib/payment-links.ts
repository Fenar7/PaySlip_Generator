import "server-only";
import { db } from "@/lib/db";
import { createPaymentLink, getRazorpay } from "@/lib/razorpay";
import { reconcileInvoicePayment } from "@/lib/invoice-reconciliation";
import type { Prisma } from "@/generated/prisma/client";
import { postInvoicePaymentTx } from "@/lib/accounting";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createInvoicePaymentLink(
  orgId: string,
  invoiceId: string,
): Promise<ActionResult<{ paymentLinkId: string; shortUrl: string }>> {
  if (!getRazorpay()) {
    return { success: false, error: "Razorpay not configured" };
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    include: { customer: true },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    return { success: false, error: `Invoice is already ${invoice.status}` };
  }

  if (invoice.razorpayPaymentLinkId) {
    return { success: false, error: "Payment link already exists for this invoice" };
  }

  // Use remainingAmount so returning customers pay only the outstanding balance
  const amountPaise = Math.round(invoice.remainingAmount * 100);
  if (amountPaise <= 0) {
    return { success: false, error: "Invoice amount must be greater than zero" };
  }

  const expireBy = invoice.dueDate
    ? Math.floor(new Date(invoice.dueDate).getTime() / 1000)
    : undefined;

  try {
    const link = await createPaymentLink({
      amount: amountPaise,
      description: `Invoice ${invoice.invoiceNumber}`,
      referenceId: invoiceId,
      customer: invoice.customer
        ? {
            name: invoice.customer.name,
            email: invoice.customer.email ?? undefined,
            contact: invoice.customer.phone ?? undefined,
          }
        : undefined,
      expireBy: expireBy && expireBy > Math.floor(Date.now() / 1000) ? expireBy : undefined,
      notifyEmail: true,
    });

    if (!link) {
      return { success: false, error: "Failed to create payment link" };
    }

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        razorpayPaymentLinkId: link.id,
        razorpayPaymentLinkUrl: link.short_url,
        paymentLinkExpiresAt: expireBy ? new Date(expireBy * 1000) : null,
        paymentLinkStatus: "created",
      },
    });

    return { success: true, data: { paymentLinkId: link.id, shortUrl: link.short_url } };
  } catch (err) {
    console.error("[PaymentLinks] create error:", err);
    return { success: false, error: "Failed to create payment link on Razorpay" };
  }
}

export async function handlePaymentLinkPaid(
  paymentLinkId: string,
  paymentId: string,
  amount: number,
): Promise<ActionResult<{ invoiceId: string }>> {
  const invoice = await db.invoice.findFirst({
    where: { razorpayPaymentLinkId: paymentLinkId },
  });

  if (!invoice) {
    return { success: false, error: "No invoice found for this payment link" };
  }

  // Idempotency: skip if this Razorpay payment was already recorded
  const existing = await db.invoicePayment.findFirst({
    where: { externalPaymentId: paymentId },
  });
  if (existing) {
    return { success: true, data: { invoiceId: invoice.id } };
  }

  // Always update payment link tracking fields
  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      paymentLinkStatus: "paid",
      paymentLinkLastEventAt: new Date(),
    },
  });

  // If invoice is already fully paid, record an OVERPAID_REVIEW ledger row — do NOT reconcile
  if (invoice.amountPaid >= invoice.totalAmount) {
    console.warn(
      `[PaymentLinks] Received payment ${paymentId} for already-PAID invoice ${invoice.id} — recording as OVERPAID_REVIEW`
    );
    await db.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        orgId: invoice.organizationId,
        amount: amount / 100,
        currency: "INR",
        method: "razorpay_payment_link",
        source: "razorpay_payment_link",
        status: "OVERPAID_REVIEW",
        externalPaymentId: paymentId,
        externalReferenceId: paymentLinkId,
        externalPayload: { paymentLinkId, paymentId, amount } as Prisma.InputJsonValue,
        paymentMethodDisplay: "Razorpay Payment Link",
        paidAt: new Date(),
      },
    });
    return { success: true, data: { invoiceId: invoice.id } };
  }

  // Normal flow: create a SETTLED ledger row and reconcile
  await db.$transaction(async (tx) => {
    const payment = await tx.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        orgId: invoice.organizationId,
        amount: amount / 100,
        currency: "INR",
        method: "razorpay_payment_link",
        source: "razorpay_payment_link",
        status: "SETTLED",
        externalPaymentId: paymentId,
        externalReferenceId: paymentLinkId,
        externalPayload: { paymentLinkId, paymentId, amount } as Prisma.InputJsonValue,
        paymentMethodDisplay: "Razorpay Payment Link",
        paidAt: new Date(),
      },
    });

    await postInvoicePaymentTx(tx, {
      orgId: invoice.organizationId,
      invoicePaymentId: payment.id,
    });
  });

  await reconcileInvoicePayment(invoice.id);

  return { success: true, data: { invoiceId: invoice.id } };
}

export async function cancelPaymentLink(
  invoiceId: string,
): Promise<ActionResult<{ cancelled: boolean }>> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  if (!invoice.razorpayPaymentLinkId) {
    return { success: false, error: "No payment link on this invoice" };
  }

  // Clear the payment link from the invoice record
  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      razorpayPaymentLinkId: null,
      razorpayPaymentLinkUrl: null,
      paymentLinkExpiresAt: null,
    },
  });

  return { success: true, data: { cancelled: true } };
}
