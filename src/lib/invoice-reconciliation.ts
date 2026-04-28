import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { toAccountingNumber } from "@/lib/accounting/utils";
import { fromMinorUnits, sumMinorUnits, toMinorUnits } from "@/lib/money";

// ─── Invoice Reconciliation Service ──────────────────────────────────────────
//
// This is the SINGLE source of truth for invoice payment state.
// EVERY payment mutation path MUST call reconcileInvoicePayment after changes.
//
// Rules:
//   amountPaid    = sum of InvoicePayment rows with status = SETTLED
//   remainingAmount = max(invoice.totalAmount - amountPaid, 0)
//   invoice.status = PAID if remaining === 0
//                  = PARTIALLY_PAID if amountPaid > 0 and remaining > 0
//                  = preserve current non-payment lifecycle status otherwise
//
// No flow may directly set invoice.status to PAID or PARTIALLY_PAID.
// Reconciliation is idempotent — safe to call multiple times for the same invoice.

export type ReconcileResult = {
  invoiceId: string;
  amountPaid: number;
  remainingAmount: number;
  derivedStatus: string;
  statusChanged: boolean;
  previousStatus: string;
};

// Non-payment lifecycle statuses that reconciliation must NOT overwrite
const LIFECYCLE_STATUSES = new Set([
  "DRAFT",
  "ISSUED",
  "VIEWED",
  "DUE",
  "OVERDUE",
  "DISPUTED",
  "CANCELLED",
  "REISSUED",
  "ARRANGEMENT_MADE",
]);

export async function reconcileInvoicePayment(
  invoiceId: string,
  actorId?: string | null
): Promise<ReconcileResult> {
  // Fetch invoice and all payments in one query
  const invoice = await db.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: {
      id: true,
      totalAmount: true,
      status: true,
      amountPaid: true,
      remainingAmount: true,
      payments: {
        where: { status: "SETTLED" },
        select: { amount: true, paidAt: true, method: true, paymentMethodDisplay: true },
        orderBy: { paidAt: "desc" },
      },
    },
  });

  // Compute settled totals
  const amountPaidMinor = sumMinorUnits(
    invoice.payments.map((payment) => toAccountingNumber(payment.amount)),
  );
  const totalAmount = toAccountingNumber(invoice.totalAmount);
  const totalAmountMinor = toMinorUnits(totalAmount);
  const remainingAmountMinor = Math.max(totalAmountMinor - amountPaidMinor, 0);
  const amountPaid = fromMinorUnits(amountPaidMinor);
  const remainingAmount = fromMinorUnits(remainingAmountMinor);

  // Determine the latest payment method for snapshot
  const latestPayment = invoice.payments[0] ?? null;
  const lastPaymentAt = latestPayment?.paidAt ?? null;
  const lastPaymentMethod =
    latestPayment?.paymentMethodDisplay ?? latestPayment?.method ?? null;

  // Derive payment status
  let derivedStatus: string;
  if (remainingAmountMinor <= 0 && amountPaidMinor >= totalAmountMinor) {
    derivedStatus = "PAID";
  } else if (amountPaidMinor > 0) {
    derivedStatus = "PARTIALLY_PAID";
  } else {
    // Preserve the current lifecycle status (not a payment status)
    derivedStatus = LIFECYCLE_STATUSES.has(invoice.status)
      ? invoice.status
      : "ISSUED";
  }

  const statusChanged = derivedStatus !== invoice.status;

  // Gather promiseDate from the latest non-fully-settled partial payment
  const promiseDatePayment = await db.invoicePayment.findFirst({
    where: {
      invoiceId,
      status: "SETTLED",
      plannedNextPaymentDate: { not: null },
    },
    orderBy: { paidAt: "desc" },
    select: { plannedNextPaymentDate: true },
  });
  const paymentPromiseDate = promiseDatePayment?.plannedNextPaymentDate ?? null;

  // Update invoice snapshot fields + status atomically
  const updateData: Prisma.InvoiceUpdateInput = {
    amountPaid,
    remainingAmount,
    lastPaymentAt,
    lastPaymentMethod,
     paymentPromiseDate: remainingAmountMinor === 0 ? null : paymentPromiseDate,
    status: derivedStatus as Prisma.EnumInvoiceStatusFieldUpdateOperationsInput["set"],
    ...(derivedStatus === "PAID" && !invoice.payments.length
      ? {}
      : derivedStatus === "PAID"
      ? { paidAt: lastPaymentAt }
      : {}),
  };

  await db.invoice.update({
    where: { id: invoiceId },
    data: updateData,
  });

  // Emit state event only when status changes
  if (statusChanged) {
    await db.invoiceStateEvent.create({
      data: {
        invoiceId,
        fromStatus: invoice.status,
        toStatus: derivedStatus,
        actorId: actorId ?? null,
        reason: "Payment reconciliation",
        metadata: {
          amountPaid,
          remainingAmount,
          totalAmount,
        } as Prisma.InputJsonValue,
      },
    });
  }

  return {
    invoiceId,
    amountPaid,
    remainingAmount,
    derivedStatus,
    statusChanged,
    previousStatus: invoice.status,
  };
}

// ─── Helper: Check if a payment source/amount is valid ───────────────────────

export async function validatePaymentAmount(
  invoiceId: string,
  amount: number
): Promise<{ valid: boolean; remaining: number; error?: string }> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { totalAmount: true, remainingAmount: true, status: true },
  });

  if (!invoice) {
    return { valid: false, remaining: 0, error: "Invoice not found" };
  }

  if (invoice.status === "CANCELLED") {
    return { valid: false, remaining: 0, error: "Cannot record payment for a cancelled invoice" };
  }

  if (invoice.status === "DISPUTED") {
    return { valid: false, remaining: 0, error: "Cannot record payment for a disputed invoice" };
  }

  if (amount <= 0) {
    return {
      valid: false,
      remaining: toAccountingNumber(invoice.remainingAmount),
      error: "Amount must be greater than zero",
    };
  }

  const amountMinor = toMinorUnits(amount);
  const remainingAmount = toAccountingNumber(invoice.remainingAmount);
  const remainingMinor = toMinorUnits(remainingAmount);

  if (amountMinor > remainingMinor) {
    return {
      valid: false,
      remaining: remainingAmount,
      error: `Amount (${amount}) exceeds remaining balance (${remainingAmount.toFixed(2)})`,
    };
  }

  return { valid: true, remaining: remainingAmount };
}
