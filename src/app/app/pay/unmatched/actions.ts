"use server";
import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { toAccountingNumber } from "@/lib/accounting/utils";
import { confirmMatch } from "@/lib/razorpay/unmatched-payment-matcher";
import type { UnmatchedPayment, Invoice } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type UnmatchedPaymentWithInvoice = UnmatchedPayment & {
  suggestedInvoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    remainingAmount: number;
    status: Invoice["status"];
  } | null;
};

/**
 * List unmatched payments for the org ordered by received date desc.
 * Includes suggested invoice details when available.
 */
export async function listUnmatchedPayments(): Promise<
  ActionResult<UnmatchedPaymentWithInvoice[]>
> {
  const { orgId } = await requireOrgContext();

  const payments = await db.unmatchedPayment.findMany({
    where: { orgId, status: { in: ["unmatched", "suggested"] } },
    orderBy: { receivedAt: "desc" },
  });

  const enriched = await Promise.all(
    payments.map(async (p) => {
      let suggestedInvoice: UnmatchedPaymentWithInvoice["suggestedInvoice"] = null;
      if (p.matchedInvoiceId) {
        const invoice = await db.invoice.findFirst({
          where: { id: p.matchedInvoiceId, organizationId: orgId },
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            remainingAmount: true,
            status: true,
          },
        });
        suggestedInvoice = invoice
          ? {
              ...invoice,
              totalAmount: toAccountingNumber(invoice.totalAmount),
              remainingAmount: toAccountingNumber(invoice.remainingAmount),
            }
          : null;
      }
      return { ...p, suggestedInvoice };
    })
  );

  return { success: true, data: enriched };
}

/**
 * Manually reconcile an unmatched payment against a specific invoice.
 */
export async function manuallyReconcilePayment(
  unmatchedId: string,
  invoiceId: string
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const payment = await db.unmatchedPayment.findFirst({
    where: { id: unmatchedId, orgId, status: { in: ["unmatched", "suggested"] } },
  });
  if (!payment) {
    return { success: false, error: "Unmatched payment not found or already resolved." };
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    select: { id: true, remainingAmount: true, status: true },
  });
  if (!invoice) {
    return { success: false, error: "Invoice not found." };
  }

  try {
    await confirmMatch(
      payment,
      {
        ...invoice,
        remainingAmount: toAccountingNumber(invoice.remainingAmount),
      },
      "MANUALLY_MATCHED"
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Reconciliation failed: ${message}` };
  }

  await logAudit({
    orgId,
    actorId: userId,
    action: "pay.unmatched_payment_manually_reconciled",
    entityType: "UnmatchedPayment",
    entityId: payment.id,
    metadata: {
      invoiceId,
      amountPaise: payment.amountPaise.toString(),
    },
  });

  return { success: true, data: undefined };
}

/**
 * Mark an unmatched payment as "other" (not from a known customer invoice context).
 * Resolves the payment without linking it to an invoice.
 */
export async function markPaymentAsOther(
  unmatchedId: string
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const payment = await db.unmatchedPayment.findFirst({
    where: { id: unmatchedId, orgId, status: { in: ["unmatched", "suggested"] } },
    select: { id: true },
  });
  if (!payment) {
    return { success: false, error: "Unmatched payment not found or already resolved." };
  }

  await db.unmatchedPayment.update({
    where: { id: payment.id },
    data: { status: "marked_other", resolvedAt: new Date() },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "pay.unmatched_payment_marked_other",
    entityType: "UnmatchedPayment",
    entityId: payment.id,
  });

  return { success: true, data: undefined };
}

/**
 * Fetch open invoices for a given customer (used by the reconcile UI to pick a target invoice).
 */
export async function getOpenInvoicesForCustomer(
  customerId: string
): Promise<
  ActionResult<
    Array<{
      id: string;
      invoiceNumber: string;
      remainingAmount: number;
      status: Invoice["status"];
    }>
  >
> {
  const { orgId } = await requireOrgContext();

  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
    select: { id: true },
  });
  if (!customer) return { success: false, error: "Customer not found." };

  const invoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      customerId,
      status: { in: ["ISSUED", "DUE", "PARTIALLY_PAID", "OVERDUE"] },
    },
    select: { id: true, invoiceNumber: true, remainingAmount: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true,
    data: invoices.map((invoice) => ({
      ...invoice,
      remainingAmount: toAccountingNumber(invoice.remainingAmount),
    })),
  };
}
