import "server-only";

import { db } from "@/lib/db";

export interface PaymentHistoryResult {
  customerId: string;
  customerName: string;
  totalInvoices: number;
  paidInvoices: number;
  lateCount: number;
  totalPaid: number;
  latePercentage: number;
  avgDaysLate: number;
  recommendation: "low_risk" | "medium_risk" | "high_risk" | "insufficient_data";
}

/**
 * Analyze a customer's payment history to assess late-payment risk.
 * Counts invoices where paidAt > dueDate.
 */
export async function getPaymentHistory(
  orgId: string,
  customerId: string,
): Promise<PaymentHistoryResult> {
  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
    select: { id: true, name: true },
  });

  if (!customer) {
    return {
      customerId,
      customerName: "Unknown",
      totalInvoices: 0,
      paidInvoices: 0,
      lateCount: 0,
      totalPaid: 0,
      latePercentage: 0,
      avgDaysLate: 0,
      recommendation: "insufficient_data",
    };
  }

  const invoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      customerId,
      status: { in: ["PAID", "PARTIALLY_PAID", "OVERDUE"] },
    },
    select: {
      dueDate: true,
      paidAt: true,
      totalAmount: true,
      status: true,
    },
  });

  if (invoices.length === 0) {
    return {
      customerId,
      customerName: customer.name,
      totalInvoices: 0,
      paidInvoices: 0,
      lateCount: 0,
      totalPaid: 0,
      latePercentage: 0,
      avgDaysLate: 0,
      recommendation: "insufficient_data",
    };
  }

  let lateCount = 0;
  let totalDaysLate = 0;
  let totalPaid = 0;
  let paidInvoices = 0;

  for (const inv of invoices) {
    totalPaid += inv.totalAmount;

    if (inv.paidAt) {
      paidInvoices++;
    }

    if (inv.dueDate && inv.paidAt) {
      const due = new Date(inv.dueDate);
      const paid = new Date(inv.paidAt);
      const diffMs = paid.getTime() - due.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        lateCount++;
        totalDaysLate += diffDays;
      }
    }
    // If overdue and not yet paid, count as late
    if (inv.status === "OVERDUE" && !inv.paidAt) {
      lateCount++;
      if (inv.dueDate) {
        const due = new Date(inv.dueDate);
        const diffDays = Math.ceil(
          (Date.now() - due.getTime()) / (1000 * 60 * 60 * 24),
        );
        totalDaysLate += Math.max(0, diffDays);
      }
    }
  }

  const latePercentage =
    invoices.length > 0
      ? Math.round((lateCount / invoices.length) * 100 * 100) / 100
      : 0;
  const avgDaysLate =
    lateCount > 0 ? Math.round((totalDaysLate / lateCount) * 100) / 100 : 0;

  let recommendation: PaymentHistoryResult["recommendation"];
  if (invoices.length < 3) {
    recommendation = "insufficient_data";
  } else if (latePercentage <= 10 && avgDaysLate <= 5) {
    recommendation = "low_risk";
  } else if (latePercentage <= 30 && avgDaysLate <= 15) {
    recommendation = "medium_risk";
  } else {
    recommendation = "high_risk";
  }

  return {
    customerId,
    customerName: customer.name,
    totalInvoices: invoices.length,
    paidInvoices,
    lateCount,
    totalPaid: Math.round(totalPaid * 100) / 100,
    latePercentage,
    avgDaysLate,
    recommendation,
  };
}
