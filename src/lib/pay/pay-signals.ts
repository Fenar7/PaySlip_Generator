/**
 * Pay signals — evaluates payment and collections risk signals and upserts
 * IntelInsight records for the org intelligence dashboard.
 * Called daily by the /api/cron/pay-signals cron route.
 */
import { db } from "@/lib/db";
import { upsertInsight } from "@/lib/intel/insights";
import { InvoiceStatus } from "@/generated/prisma/client";
import { toAccountingNumber } from "@/lib/accounting/utils";

const UNPAID_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.VIEWED,
  InvoiceStatus.DUE,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.ARRANGEMENT_MADE,
];

/**
 * Run all collection/reconciliation signal evaluations for a single org.
 * Each check is independent — a failure in one does not block the others.
 */
export async function evaluateCollectionSignals(orgId: string): Promise<void> {
  await Promise.allSettled([
    checkCriticalOverdue(orgId),
    checkUnclickedPaymentLinks(orgId),
    checkUnmatchedVirtualCredits(orgId),
    checkStaleUnmatchedTransactions(orgId),
    checkDefaultedArrangements(orgId),
  ]);
}

// ─── Individual signal checks ─────────────────────────────────────────────────

async function checkCriticalOverdue(orgId: string): Promise<void> {
  const threshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const thresholdStr = threshold.toISOString().slice(0, 10);

  const criticalCount = await db.invoice.count({
    where: {
      organizationId: orgId,
      status: { in: UNPAID_STATUSES },
      archivedAt: null,
      dueDate: { lt: thresholdStr },
    },
  });

  if (criticalCount < 3) return;

  const total = await db.invoice.aggregate({
    where: {
      organizationId: orgId,
      status: { in: UNPAID_STATUSES },
      archivedAt: null,
      dueDate: { lt: thresholdStr },
    },
    _sum: { remainingAmount: true },
  });
  const totalOutstanding = toAccountingNumber(total._sum.remainingAmount ?? 0);

  await upsertInsight({
    orgId,
    category: "RECEIVABLES",
    severity: "HIGH",
    title: `${criticalCount} invoices critically overdue (90+ days)`,
    summary: `₹${Math.round(totalOutstanding).toLocaleString("en-IN")} is outstanding across ${criticalCount} invoices that are more than 90 days past due. Escalate collection efforts.`,
    sourceType: "RULE",
    sourceRecordType: "invoice_aging",
    recommendedActionType: "ESCALATE_COLLECTIONS",
    assignedRole: "admin",
    dedupeKey: `pay:critical-overdue:${orgId}`,
    evidence: { count: criticalCount, totalAmount: totalOutstanding },
  });
}

async function checkUnclickedPaymentLinks(orgId: string): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const unclicked = await db.invoice.count({
    where: {
      organizationId: orgId,
      razorpayPaymentLinkId: { not: null },
      paymentLinkStatus: "active",
      paymentLinkLastEventAt: null,
      updatedAt: { lt: sevenDaysAgo },
    },
  });

  if (unclicked === 0) return;

  await upsertInsight({
    orgId,
    category: "RECEIVABLES",
    severity: "MEDIUM",
    title: `${unclicked} payment link${unclicked > 1 ? "s" : ""} not clicked in 7 days`,
    summary: `Payment links were generated but customers have not clicked them. Consider sending a follow-up reminder.`,
    sourceType: "RULE",
    sourceRecordType: "payment_link",
    recommendedActionType: "SEND_REMINDER",
    assignedRole: "finance_manager",
    dedupeKey: `pay:unclicked-links:${orgId}`,
    evidence: { count: unclicked },
  });
}

async function checkUnmatchedVirtualCredits(orgId: string): Promise<void> {
  const count = await db.unmatchedPayment.count({
    where: { orgId, status: "PENDING" },
  });

  if (count === 0) return;

  await upsertInsight({
    orgId,
    category: "OPERATIONS",
    severity: "MEDIUM",
    title: `${count} virtual account credit${count > 1 ? "s" : ""} awaiting reconciliation`,
    summary: `Payments received via virtual accounts could not be automatically matched to an invoice. Manual review is required.`,
    sourceType: "RULE",
    sourceRecordType: "unmatched_payment",
    recommendedActionType: "REVIEW_UNMATCHED_PAYMENTS",
    assignedRole: "finance_manager",
    dedupeKey: `pay:unmatched-credits:${orgId}`,
    evidence: { count },
  });
}

async function checkStaleUnmatchedTransactions(orgId: string): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const staleCount = await db.bankTransaction.count({
    where: {
      orgId,
      status: "UNMATCHED",
      direction: "CREDIT",
      txnDate: { lt: thirtyDaysAgo },
    },
  });

  if (staleCount === 0) return;

  await upsertInsight({
    orgId,
    category: "OPERATIONS",
    severity: "MEDIUM",
    title: `${staleCount} bank transaction${staleCount > 1 ? "s" : ""} unreconciled for 30+ days`,
    summary: `Bank credits older than 30 days remain unmatched to any invoice or document. Reconcile these to keep your books accurate.`,
    sourceType: "RULE",
    sourceRecordType: "bank_transaction",
    recommendedActionType: "RECONCILE_TRANSACTIONS",
    assignedRole: "finance_manager",
    dedupeKey: `pay:stale-unmatched-txns:${orgId}`,
    evidence: { count: staleCount },
  });
}

async function checkDefaultedArrangements(orgId: string): Promise<void> {
  const defaulted = await db.paymentArrangement.count({
    where: { orgId, status: "DEFAULTED" },
  });

  if (defaulted === 0) return;

  await upsertInsight({
    orgId,
    category: "RECEIVABLES",
    severity: "HIGH",
    title: `${defaulted} payment arrangement${defaulted > 1 ? "s" : ""} defaulted`,
    summary: `Customers have defaulted on payment arrangements. Review and consider escalating to legal or collections.`,
    sourceType: "RULE",
    sourceRecordType: "payment_arrangement",
    recommendedActionType: "ESCALATE_COLLECTIONS",
    assignedRole: "admin",
    dedupeKey: `pay:defaulted-arrangements:${orgId}`,
    evidence: { count: defaulted },
  });
}
