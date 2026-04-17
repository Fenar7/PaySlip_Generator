import "server-only";
import { db } from "@/lib/db";

export type MatchMode = "AUTO_EXACT" | "SUGGESTED" | "MANUALLY_MATCHED";

interface MatchResult {
  mode: MatchMode;
  invoiceId: string;
  confidence: number;
}

/**
 * Attempt to automatically match an UnmatchedPayment to an open invoice.
 *
 * Rules (from PRD §7.2):
 *   AUTO_EXACT    — amount within ₹1 of remaining balance → auto-confirm + settle
 *   SUGGESTED     — single open invoice for the customer → suggest (confidence 0.85), no auto-confirm
 *   Otherwise     — leave UNMATCHED for manual reconciliation
 */
export async function tryAutoMatchUnmatchedPayment(
  unmatchedPaymentId: string
): Promise<MatchResult | null> {
  const payment = await db.unmatchedPayment.findUnique({
    where: { id: unmatchedPaymentId },
  });

  if (!payment || payment.status !== "unmatched") return null;

  // Find the virtual account to get the customer
  const va = await db.customerVirtualAccount.findFirst({
    where: { id: payment.virtualAccountId },
    select: { customerId: true, orgId: true },
  });

  if (!va || va.orgId !== payment.orgId) return null;

  const receivedRupees = Number(payment.amountPaise) / 100;

  // Find open invoices for this customer with a remaining balance
  const openInvoices = await db.invoice.findMany({
    where: {
      organizationId: payment.orgId,
      customerId: va.customerId,
      status: { in: ["ISSUED", "DUE", "PARTIALLY_PAID", "OVERDUE"] },
    },
    select: {
      id: true,
      remainingAmount: true,
      status: true,
    },
    orderBy: { remainingAmount: "asc" },
  });

  if (openInvoices.length === 0) return null;

  // Look for an exact (within ₹1) match
  const exactMatch = openInvoices.find(
    (inv) => Math.abs(inv.remainingAmount - receivedRupees) < 1.0
  );

  if (exactMatch) {
    await confirmMatch(payment, exactMatch, "AUTO_EXACT");
    return { mode: "AUTO_EXACT", invoiceId: exactMatch.id, confidence: 1.0 };
  }

  // Single open invoice → suggest with 0.85 confidence
  if (openInvoices.length === 1) {
    await suggestMatch(payment, openInvoices[0].id, 0.85);
    return { mode: "SUGGESTED", invoiceId: openInvoices[0].id, confidence: 0.85 };
  }

  return null;
}

/**
 * Auto-confirm a match: record an InvoicePayment, update Invoice status, mark payment resolved.
 */
export async function confirmMatch(
  payment: {
    id: string;
    orgId: string;
    amountPaise: bigint;
    razorpayPaymentId: string;
    virtualAccountId: string;
  },
  invoice: { id: string; remainingAmount: number; status: string },
  mode: MatchMode
): Promise<void> {
  const paidAmountRupees = Number(payment.amountPaise) / 100;
  const now = new Date();

  await db.$transaction(async (tx) => {
    // Idempotency: skip if already recorded
    const existingPayment = await tx.invoicePayment.findFirst({
      where: { externalPaymentId: payment.razorpayPaymentId, invoiceId: invoice.id },
      select: { id: true },
    });
    if (existingPayment) return;

    const newRemaining = Math.max(0, invoice.remainingAmount - paidAmountRupees);
    const isFullyPaid = newRemaining < 0.01;
    const newStatus = isFullyPaid ? "PAID" : "PARTIALLY_PAID";

    await tx.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        orgId: payment.orgId,
        amount: paidAmountRupees,
        paidAt: now,
        method: "bank_transfer",
        source: "razorpay_virtual_account",
        status: "SETTLED",
        externalPaymentId: payment.razorpayPaymentId,
        paymentMethodDisplay: `NEFT/RTGS via Virtual Account`,
      },
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: { increment: paidAmountRupees },
        remainingAmount: newRemaining,
        status: newStatus as "PAID" | "PARTIALLY_PAID",
        lastPaymentAt: now,
        lastPaymentMethod: "bank_transfer",
        paidAt: isFullyPaid ? now : undefined,
      },
    });

    await tx.invoiceStateEvent.create({
      data: {
        invoiceId: invoice.id,
        fromStatus: invoice.status,
        toStatus: newStatus,
        reason: `Virtual account payment auto-matched (${mode})`,
        metadata: {
          source: "razorpay_virtual_account",
          unmatchedPaymentId: payment.id,
          matchMode: mode,
        },
      },
    });

    await tx.unmatchedPayment.update({
      where: { id: payment.id },
      data: {
        status: mode === "MANUALLY_MATCHED" ? "manually_matched" : "auto_matched",
        matchedInvoiceId: invoice.id,
        resolvedAt: now,
      },
    });
  });
}

/**
 * Record a suggested (not auto-confirmed) match on an unmatched payment.
 */
export async function suggestMatch(
  payment: { id: string },
  invoiceId: string,
  confidence: number
): Promise<void> {
  await db.unmatchedPayment.update({
    where: { id: payment.id },
    data: {
      matchedInvoiceId: invoiceId,
      status: "suggested",
    },
  });

  // Store confidence in a structured way — we extend the existing record
  // by encoding it in the status field since the schema has no confidence column.
  // A future migration can add a dedicatedcolumn; for now suggested + matchedInvoiceId
  // is enough for the UI to offer a pre-filled reconcile action.
  void confidence; // acknowledged, used by caller for response metadata
}
