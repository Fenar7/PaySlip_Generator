import "server-only";
import { db } from "@/lib/db";
import { recordUsageEvent } from "@/lib/usage-metering";
import { tryAutoMatchUnmatchedPayment } from "@/lib/razorpay/unmatched-payment-matcher";
import { fromMinorUnits, toMinorUnits } from "@/lib/money";
import { toAccountingNumber } from "@/lib/accounting/utils";

interface PaymentLinkPaidPayload {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  payments?: {
    items: Array<{
      id: string;
      amount: number;
      currency: string;
      method: string;
      status: string;
      created_at: number;
    }>;
  };
  description?: string;
  notes?: { invoiceId?: string };
}

interface VirtualAccountCreditedPayload {
  id: string;
  entity: string;
  amount_paid: number;
  payments: {
    items: Array<{
      id: string;
      amount: number;
      method: string;
    }>;
  };
  receivers?: Array<{ account_number: string }>;
  close_by?: number;
}

/**
 * Route a Razorpay webhook event to the appropriate handler.
 * All handlers are idempotent — safe to call multiple times with the same event.
 */
export async function handleRazorpayEvent(
  orgId: string,
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  switch (eventType) {
    case "payment_link.paid":
      await handlePaymentLinkPaid(orgId, payload.payment_link as PaymentLinkPaidPayload);
      break;
    case "virtual_account.credited":
      await handleVirtualAccountCredited(orgId, payload.virtual_account as VirtualAccountCreditedPayload, payload.payment as Record<string, unknown>);
      break;
    case "payment_link.expired":
      await handlePaymentLinkExpired(orgId, payload.payment_link as { id: string });
      break;
    case "payment.failed":
      // Log but do not alter invoice state — user may retry
      break;
    default:
      // Unknown event types are stored but not processed
      break;
  }
}

async function handlePaymentLinkPaid(
  orgId: string,
  paymentLink: PaymentLinkPaidPayload
): Promise<void> {
  if (!paymentLink?.id) return;

  const invoice = await db.invoice.findFirst({
    where: {
      organizationId: orgId,
      razorpayPaymentLinkId: paymentLink.id,
    },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      amountPaid: true,
      remainingAmount: true,
      organizationId: true,
    },
  });

  if (!invoice) return;
  if (invoice.status === "PAID") return; // Already processed

  const paidAmountPaise = paymentLink.amount ?? 0;

  const latestPayment = paymentLink.payments?.items?.[0];
  const externalPaymentId = latestPayment?.id ?? null;
  const method = latestPayment?.method ?? "razorpay";
  const paidAt = latestPayment ? new Date(latestPayment.created_at * 1000) : new Date();

  const invoiceAmountPaidPaise = toMinorUnits(toAccountingNumber(invoice.amountPaid));
  const invoiceTotalPaise = toMinorUnits(toAccountingNumber(invoice.totalAmount));
  const newAmountPaidPaise = invoiceAmountPaidPaise + paidAmountPaise;
  const newRemainingPaise = Math.max(0, invoiceTotalPaise - newAmountPaidPaise);
  const isFullyPaid = newRemainingPaise === 0;
  const newStatus = isFullyPaid ? "PAID" : "PARTIALLY_PAID";

  await db.$transaction(async (tx) => {
    // Idempotency: skip if this external payment is already recorded
    if (externalPaymentId) {
      const existing = await tx.invoicePayment.findFirst({
        where: { externalPaymentId, invoiceId: invoice.id },
        select: { id: true },
      });
      if (existing) return;
    }

    await tx.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          orgId,
          amount: fromMinorUnits(paidAmountPaise),
          paidAt,
          method,
        source: "razorpay_payment_link",
        status: "SETTLED",
        externalPaymentId,
        paymentMethodDisplay: `Razorpay (${method})`,
      },
    });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus as "PAID" | "PARTIALLY_PAID",
          amountPaid: fromMinorUnits(newAmountPaidPaise),
          remainingAmount: fromMinorUnits(newRemainingPaise),
          lastPaymentAt: paidAt,
          lastPaymentMethod: method,
        paidAt: isFullyPaid ? paidAt : undefined,
        paymentLinkStatus: "paid",
        paymentLinkLastEventAt: new Date(),
      },
    });

    await tx.invoiceStateEvent.create({
      data: {
        invoiceId: invoice.id,
        fromStatus: invoice.status,
        toStatus: newStatus,
        reason: `Razorpay payment received (${externalPaymentId ?? "unknown"})`,
        metadata: { source: "razorpay_webhook", paymentLinkId: paymentLink.id },
      },
    });
  });

  await recordUsageEvent(orgId, "INVOICE", 1);
}

async function handleVirtualAccountCredited(
  orgId: string,
  virtualAccount: VirtualAccountCreditedPayload,
  payment: Record<string, unknown>
): Promise<void> {
  if (!virtualAccount?.id) return;

  const paymentId = (payment?.id as string) ?? null;
  const amountPaise = (payment?.amount as number) ?? 0;

  // Record as unmatched payment for manual/auto reconciliation
  const existing = await db.unmatchedPayment.findFirst({
    where: { razorpayPaymentId: paymentId ?? virtualAccount.id },
  });
  if (existing) return;

  const accountNumber = virtualAccount.receivers?.[0]?.account_number;
  const va = accountNumber
    ? await db.customerVirtualAccount.findFirst({
        where: { orgId, accountNumber },
        select: { id: true },
      })
    : null;

  const newRecord = await db.unmatchedPayment.create({
    data: {
      orgId,
      virtualAccountId: va?.id ?? virtualAccount.id,
      amountPaise: BigInt(amountPaise),
      razorpayPaymentId: paymentId ?? virtualAccount.id,
      receivedAt: new Date(),
      status: "unmatched",
    },
  });

  // Fire-and-forget auto-matcher — errors must not fail the webhook response
  tryAutoMatchUnmatchedPayment(newRecord.id).catch((err) => {
    console.error("[webhook] auto-matcher error:", err);
  });
}

async function handlePaymentLinkExpired(
  orgId: string,
  paymentLink: { id: string }
): Promise<void> {
  if (!paymentLink?.id) return;

  await db.invoice.updateMany({
    where: {
      organizationId: orgId,
      razorpayPaymentLinkId: paymentLink.id,
      paymentLinkStatus: { in: ["created", "partially_paid"] },
    },
    data: {
      paymentLinkStatus: "expired",
      paymentLinkLastEventAt: new Date(),
    },
  });
}
