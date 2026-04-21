import "server-only";
import { db } from "@/lib/db";
import { createVirtualAccount, getRazorpay } from "@/lib/razorpay";
import { postInvoicePaymentTx } from "@/lib/accounting";
import { fromMinorUnits, toMinorUnits } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { toAccountingNumber } from "@/lib/accounting/utils";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createCustomerVirtualAccount(
  orgId: string,
  customerId: string,
): Promise<
  ActionResult<{ vaId: string; accountNumber: string; ifsc: string }>
> {
  if (!getRazorpay()) {
    return { success: false, error: "Razorpay not configured" };
  }

  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
  });

  if (!customer) {
    return { success: false, error: "Customer not found" };
  }

  const existing = await db.customerVirtualAccount.findFirst({
    where: { orgId, customerId, isActive: true },
  });

  if (existing) {
    return {
      success: true,
      data: {
        vaId: existing.razorpayVaId,
        accountNumber: existing.accountNumber,
        ifsc: existing.ifsc,
      },
    };
  }

  try {
    const va = await createVirtualAccount({
      receiverTypes: ["bank_account"],
      description: `VA for ${customer.name}`,
      notes: { orgId, customerId },
    });

    if (!va) {
      return { success: false, error: "Failed to create virtual account" };
    }

    const receiver = va.receivers[0];
    if (!receiver) {
      return { success: false, error: "No receiver returned from Razorpay" };
    }

    const record = await db.customerVirtualAccount.create({
      data: {
        orgId,
        customerId,
        razorpayVaId: va.id,
        accountNumber: receiver.account_number,
        ifsc: receiver.ifsc,
      },
    });

    return {
      success: true,
      data: {
        vaId: record.razorpayVaId,
        accountNumber: record.accountNumber,
        ifsc: record.ifsc,
      },
    };
  } catch (err) {
    console.error("[SmartCollect] createVA error:", err);
    return {
      success: false,
      error: "Failed to create virtual account on Razorpay",
    };
  }
}

export async function handleVirtualAccountCredited(
  vaId: string,
  amountPaise: number,
  payerInfo: {
    payerName?: string;
    payerAccount?: string;
    payerIfsc?: string;
    razorpayPaymentId: string;
  },
): Promise<ActionResult<{ matched: boolean; invoiceId?: string }>> {
  const va = await db.customerVirtualAccount.findUnique({
    where: { razorpayVaId: vaId },
  });

  if (!va) {
    return { success: false, error: "Virtual account not found" };
  }

  // Try to auto-match to an outstanding invoice
  const matchingInvoice = await db.invoice.findFirst({
    where: {
      organizationId: va.orgId,
      customerId: va.customerId,
      status: { in: ["ISSUED", "DUE", "OVERDUE", "PARTIALLY_PAID", "VIEWED"] },
    },
    orderBy: { createdAt: "asc" },
  });

  const invoiceRemainingPaise = matchingInvoice
    ? toMinorUnits(toAccountingNumber(matchingInvoice.remainingAmount))
    : 0;

  if (matchingInvoice && invoiceRemainingPaise === amountPaise) {
    // Exact match — auto-apply payment
    await db.$transaction(async (tx) => {
      const invoicePayment = await tx.invoicePayment.create({
        data: {
          invoiceId: matchingInvoice.id,
          orgId: va.orgId,
          amount: fromMinorUnits(amountPaise),
          currency: "INR",
          method: "virtual_account",
          source: "virtual_account",
          status: "SETTLED",
          note: `VA credit ${payerInfo.razorpayPaymentId}`,
          paidAt: new Date(),
        },
      });

      await postInvoicePaymentTx(tx, {
        orgId: va.orgId,
        invoicePaymentId: invoicePayment.id,
      });

      await tx.invoice.update({
        where: { id: matchingInvoice.id },
        data: {
          amountPaid: { increment: fromMinorUnits(amountPaise) },
          remainingAmount: 0,
          status: "PAID",
          paidAt: new Date(),
        },
      });
    });

    await logAudit({
      orgId: va.orgId,
      actorId: "system",
      action: "pay.virtual_account_auto_settled",
      entityType: "Invoice",
      entityId: matchingInvoice.id,
      metadata: {
        virtualAccountId: va.id,
        razorpayPaymentId: payerInfo.razorpayPaymentId,
        amountPaise: String(amountPaise),
      },
    });

    return {
      success: true,
      data: { matched: true, invoiceId: matchingInvoice.id },
    };
  }

  // No auto-match — create UnmatchedPayment
  await db.unmatchedPayment.create({
    data: {
      orgId: va.orgId,
      virtualAccountId: va.id,
      amountPaise: BigInt(amountPaise),
      payerName: payerInfo.payerName,
      payerAccount: payerInfo.payerAccount,
      payerIfsc: payerInfo.payerIfsc,
      razorpayPaymentId: payerInfo.razorpayPaymentId,
      status: "unmatched",
    },
  });

  return { success: true, data: { matched: false } };
}

export async function matchUnmatchedPayment(
  paymentId: string,
  invoiceId: string,
): Promise<ActionResult<{ matched: boolean }>> {
  const payment = await db.unmatchedPayment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return { success: false, error: "Unmatched payment not found" };
  }

  if (payment.status !== "unmatched") {
    return { success: false, error: "Payment already resolved" };
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId: payment.orgId },
  });

  if (!invoice) {
    return { success: false, error: "Invoice not found" };
  }

  await db.$transaction(async (tx) => {
    const invoicePayment = await tx.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        orgId: payment.orgId,
        amount: fromMinorUnits(Number(payment.amountPaise)),
        currency: "INR",
        method: "virtual_account",
        source: "virtual_account",
        status: "SETTLED",
        note: `Manually matched from ${payment.razorpayPaymentId}`,
        paidAt: new Date(),
      },
    });

    await postInvoicePaymentTx(tx, {
      orgId: payment.orgId,
      invoicePaymentId: invoicePayment.id,
    });

    const invoiceRemainingPaise = toMinorUnits(toAccountingNumber(invoice.remainingAmount));
    const paymentAmountPaise = Number(payment.amountPaise);
    const newRemainingPaise = Math.max(0, invoiceRemainingPaise - paymentAmountPaise);
    const isFullyPaid = newRemainingPaise === 0;

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: { increment: fromMinorUnits(paymentAmountPaise) },
        remainingAmount: fromMinorUnits(newRemainingPaise),
        status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
        ...(isFullyPaid && { paidAt: new Date() }),
      },
    });

    await tx.unmatchedPayment.update({
      where: { id: paymentId },
      data: {
        status: "matched",
        matchedInvoiceId: invoiceId,
        resolvedAt: new Date(),
      },
    });
  });

  await logAudit({
    orgId: payment.orgId,
    actorId: "system",
    action: "pay.virtual_account_manually_matched",
    entityType: "UnmatchedPayment",
    entityId: paymentId,
    metadata: {
      invoiceId,
      amountPaise: payment.amountPaise.toString(),
      razorpayPaymentId: payment.razorpayPaymentId,
    },
  });

  return { success: true, data: { matched: true } };
}

export async function closeVirtualAccount(
  vaId: string,
): Promise<ActionResult<{ closed: boolean }>> {
  const va = await db.customerVirtualAccount.findUnique({
    where: { razorpayVaId: vaId },
  });

  if (!va) {
    return { success: false, error: "Virtual account not found" };
  }

  if (!va.isActive) {
    return { success: false, error: "Virtual account already closed" };
  }

  await db.customerVirtualAccount.update({
    where: { razorpayVaId: vaId },
    data: { isActive: false, closedAt: new Date() },
  });

  return { success: true, data: { closed: true } };
}
