import "server-only";

import { toAccountingNumber } from "@/lib/accounting/utils";
import type { Prisma } from "@/generated/prisma/client";
import { reconcileInvoicePayment } from "@/lib/invoice-reconciliation";
import { toMinorUnits } from "@/lib/money";

type InvoicePaymentSnapshot = {
  id: string;
  status: string;
  totalAmount: Prisma.Decimal | number;
  amountPaid: Prisma.Decimal | number;
  remainingAmount: Prisma.Decimal | number;
};

export type PublicInvoicePaymentProofEligibility = {
  status: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  canUpload: boolean;
  blockedReason: string | null;
};

function normalizeSnapshot(snapshot: InvoicePaymentSnapshot) {
  return {
    ...snapshot,
    totalAmount: toAccountingNumber(snapshot.totalAmount),
    amountPaid: toAccountingNumber(snapshot.amountPaid),
    remainingAmount: toAccountingNumber(snapshot.remainingAmount),
  };
}

function needsReconciliation(snapshot: InvoicePaymentSnapshot): boolean {
  if (snapshot.status === "CANCELLED" || snapshot.status === "DISPUTED") {
    return false;
  }

  const totalMinor = toMinorUnits(snapshot.totalAmount);
  const amountPaidMinor = toMinorUnits(snapshot.amountPaid);
  const remainingMinor = toMinorUnits(snapshot.remainingAmount);
  const derivedRemainingMinor = Math.max(totalMinor - amountPaidMinor, 0);

  if (remainingMinor !== derivedRemainingMinor) {
    return true;
  }

  if (derivedRemainingMinor === 0) {
    return snapshot.status !== "PAID";
  }

  if (amountPaidMinor > 0) {
    return snapshot.status !== "PARTIALLY_PAID";
  }

  return snapshot.status === "PAID" || snapshot.status === "PARTIALLY_PAID";
}

function getBlockedReason(snapshot: InvoicePaymentSnapshot): string | null {
  if (snapshot.status === "CANCELLED" || snapshot.status === "DISPUTED") {
    return `Cannot upload proof for a ${snapshot.status.toLowerCase()} invoice.`;
  }

  if (snapshot.status === "PAID" || snapshot.remainingAmount <= 0) {
    return "This invoice no longer accepts payment proofs.";
  }

  return null;
}

export async function resolvePublicInvoicePaymentProofEligibility(
  snapshot: InvoicePaymentSnapshot
): Promise<PublicInvoicePaymentProofEligibility> {
  let normalized = normalizeSnapshot(snapshot);

  if (needsReconciliation(normalized)) {
    const reconciled = await reconcileInvoicePayment(snapshot.id);
    normalized = {
      ...normalized,
      status: reconciled.derivedStatus,
      amountPaid: reconciled.amountPaid,
      remainingAmount: reconciled.remainingAmount,
    };
  }

  const blockedReason = getBlockedReason(normalized);

  return {
    ...normalized,
    canUpload: blockedReason === null,
    blockedReason,
  };
}
