import "server-only";

import { db } from "@/lib/db";
import { upsertInsight } from "./insights";
import type { IntelInsightSeverity } from "@/generated/prisma/client";

/**
 * Deterministic anomaly detection service for Slipwise One.
 *
 * Rules are deterministic DB checks. AI may later add explanations or
 * summaries but must not be the sole source of critical anomaly severity.
 *
 * Each rule:
 * - is identified by a stable string key
 * - creates/refreshes an IntelInsight with sourceType RULE
 * - uses a dedupeKey so repeated detection runs do not spam users
 * - records evidence as JSON alongside the insight
 */

export interface AnomalyRuleResult {
  fired: boolean;
  insightId?: string;
  /** True if the insight was newly created; false if an existing one was refreshed. */
  wasCreated?: boolean;
  ruleKey: string;
  severity?: IntelInsightSeverity;
}

interface DetectionRunSummary {
  runId: string;
  rulesEvaluated: number;
  insightsCreated: number;
  insightsUpdated: number;
  errors: string[];
}

// ─── Time window helpers ──────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function expiresIn(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

// ─── Individual anomaly rules ─────────────────────────────────────────────────

/**
 * DOCS-01: Duplicate document number pattern.
 * Detects when an org has had more than 3 duplicate document numbers
 * in the past 30 days.
 */
async function checkDocsDuplicateNumbering(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "docs.duplicate_numbering";
  const window = daysAgo(30);

  const invoices = await db.invoice.findMany({
    where: { organizationId: orgId, createdAt: { gte: window } },
    select: { invoiceNumber: true },
  });

  const counts: Record<string, number> = {};
  for (const inv of invoices) {
    if (inv.invoiceNumber) counts[inv.invoiceNumber] = (counts[inv.invoiceNumber] ?? 0) + 1;
  }
  const duplicates = Object.entries(counts).filter(([, c]) => c > 1);

  if (duplicates.length === 0) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = duplicates.length >= 5 ? "HIGH" : "MEDIUM";
  const evidence = {
    duplicateCount: duplicates.length,
    examples: duplicates.slice(0, 5).map(([num, count]) => ({ number: num, count })),
    windowDays: 30,
  };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "DOCUMENTS",
    severity,
    title: `${duplicates.length} duplicate document number${duplicates.length === 1 ? "" : "s"} detected`,
    summary: `${duplicates.length} document numbers appear more than once in the last 30 days. This may cause reconciliation issues and compliance failures.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "invoice",
    recommendedActionType: "review_document_numbering",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(48),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * DOCS-02: High draft abandonment rate.
 * More than 20 draft invoices older than 7 days with no activity.
 */
async function checkDocsDraftAbandonment(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "docs.high_draft_abandonment";
  const staleBefore = daysAgo(7);

  const staleDrafts = await db.invoice.count({
    where: {
      organizationId: orgId,
      status: "DRAFT",
      updatedAt: { lte: staleBefore },
    },
  });

  if (staleDrafts < 20) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = staleDrafts >= 50 ? "HIGH" : "MEDIUM";
  const evidence = { staleDraftCount: staleDrafts, staleThresholdDays: 7 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "DOCUMENTS",
    severity,
    title: `${staleDrafts} stale draft invoices (older than 7 days)`,
    summary: `${staleDrafts} draft invoices have not been updated in over 7 days. Review and either send or discard stale drafts to keep records clean.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "invoice",
    recommendedActionType: "review_stale_drafts",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(24),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * AR-01: Overdue amount spike.
 * Total overdue receivables have grown by more than 40% compared to 30 days ago
 * (approximated by checking current overdue vs a floor threshold).
 */
async function checkArOverdueSpike(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "ar.overdue_amount_spike";

  const overdueInvoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["OVERDUE", "DUE"] },
    },
    select: { totalAmount: true, dueDate: true },
  });

  if (overdueInvoices.length < 5) return { fired: false, ruleKey };

  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + (i.totalAmount ?? 0), 0);
  // Flag if total overdue exceeds ₹1L (100,000 paise = ₹1,000)
  if (totalOverdue < 10_000_00) return { fired: false, ruleKey }; // 10,000 paise = ₹100

  const severity: IntelInsightSeverity = totalOverdue >= 1_00_00_000 ? "CRITICAL" : "HIGH";
  const evidence = {
    overdueCount: overdueInvoices.length,
    totalOverduePaise: totalOverdue,
    totalOverdueInr: Math.round(totalOverdue / 100),
  };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "RECEIVABLES",
    severity,
    title: `₹${evidence.totalOverdueInr.toLocaleString("en-IN")} in overdue receivables across ${overdueInvoices.length} invoices`,
    summary: `Your overdue receivables have reached a significant level. Review and prioritize collection actions to protect cash flow.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "invoice",
    recommendedActionType: "start_collection_action",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(24),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * AR-02: Payment proof rejection spike.
 * More than 3 proof-of-payment rejections in 7 days.
 */
async function checkArProofRejectionSpike(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "ar.proof_rejection_spike";
  const window = daysAgo(7);

  const rejectedProofs = await db.invoiceProof.count({
    where: {
      invoice: { organizationId: orgId },
      reviewStatus: "REJECTED",
      reviewedAt: { gte: window },
    },
  });

  if (rejectedProofs < 3) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = rejectedProofs >= 8 ? "HIGH" : "MEDIUM";
  const evidence = { rejectedCount: rejectedProofs, windowDays: 7 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "RECEIVABLES",
    severity,
    title: `${rejectedProofs} payment proofs rejected in the last 7 days`,
    summary: `An unusual number of payment proofs have been rejected recently. Review rejection reasons to identify systematic issues.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "payment_proof",
    recommendedActionType: "review_payment_proofs",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(48),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * AR-03: Payment arrangement missed-installment cluster.
 * More than 2 arrangements with a missed installment in the last 14 days.
 */
async function checkArMissedInstallments(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "ar.missed_installment_cluster";
  const window = daysAgo(14);

  const defaulted = await db.paymentArrangement.count({
    where: {
      orgId,
      status: "DEFAULTED",
      updatedAt: { gte: window },
    },
  });

  if (defaulted < 2) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = defaulted >= 5 ? "HIGH" : "MEDIUM";
  const evidence = { defaultedCount: defaulted, windowDays: 14 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "RECEIVABLES",
    severity,
    title: `${defaulted} payment arrangements defaulted in the last 14 days`,
    summary: `Multiple payment arrangements have been marked as defaulted recently. Review affected customers and consider escalating collection actions.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "payment_arrangement",
    recommendedActionType: "review_arrangements",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(48),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * BOOKS-01: Unreconciled transaction spike.
 * More than 50 bank statement items unmatched and older than 14 days.
 */
async function checkBooksUnreconciledSpike(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "books.unreconciled_transaction_spike";
  const staleThreshold = daysAgo(14);

  const unmatched = await db.bankTransaction.count({
    where: {
      orgId,
      status: { in: ["UNMATCHED", "SUGGESTED"] },
      txnDate: { lte: staleThreshold },
    },
  });

  if (unmatched < 50) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = unmatched >= 150 ? "HIGH" : "MEDIUM";
  const evidence = { unmatchedCount: unmatched, staleAfterDays: 14 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "OPERATIONS",
    severity,
    title: `${unmatched} unreconciled bank transactions older than 14 days`,
    summary: `A large number of bank transactions remain unmatched. This may delay financial close and reporting.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "bank_statement_item",
    recommendedActionType: "review_reconciliation",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(48),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * GST-01: Filing run repeatedly blocked.
 * A GST filing has failed 3 or more times in the last 30 days.
 */
async function checkGstFilingBlocked(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "gst.filing_run_blocked";
  const window = daysAgo(30);

  const failedFilings = await db.gstFilingRun.count({
    where: {
      orgId,
      status: "FAILED",
      createdAt: { gte: window },
    },
  });

  if (failedFilings < 3) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = failedFilings >= 6 ? "CRITICAL" : "HIGH";
  const evidence = { failedCount: failedFilings, windowDays: 30 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "COMPLIANCE",
    severity,
    title: `GST filing blocked — ${failedFilings} failed attempts in 30 days`,
    summary: `GST filing has repeatedly failed. Unresolved filing failures may result in penalties. Review error details and fix data issues before the next submission deadline.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "gst_filing_run",
    recommendedActionType: "resolve_gst_filing_errors",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(24),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * MARKETPLACE-01: Payout item stuck.
 * Any payout item has been in HOLD, RETRY, or MANUAL state for more than 7 days.
 */
async function checkMarketplacePayoutStuck(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "marketplace.payout_item_stuck";
  const staleThreshold = daysAgo(7);

  const stuckItems = await db.marketplacePayoutItem.count({
    where: {
      publisherOrgId: orgId,
      status: { in: ["on_hold", "processing", "manual_review"] },
      updatedAt: { lte: staleThreshold },
    },
  });

  if (stuckItems === 0) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = stuckItems >= 5 ? "HIGH" : "MEDIUM";
  const evidence = { stuckCount: stuckItems, staleAfterDays: 7 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "MARKETPLACE",
    severity,
    title: `${stuckItems} marketplace payout item${stuckItems === 1 ? "" : "s"} stuck for more than 7 days`,
    summary: `Payout items have been waiting in HOLD, RETRY, or MANUAL state for over a week. Review and resolve to prevent beneficiary disputes.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "payout_item",
    recommendedActionType: "review_stuck_payouts",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(24),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * PARTNER-01: Repeated client access rejection.
 * More than 3 partner access requests rejected in the last 14 days.
 */
async function checkPartnerAccessRejections(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "partner.repeated_access_rejection";
  const window = daysAgo(14);

  const rejected = await db.partnerClientAccessRequest.count({
    where: {
      clientOrgId: orgId,
      status: "REJECTED",
      updatedAt: { gte: window },
    },
  });

  if (rejected < 3) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = rejected >= 6 ? "HIGH" : "MEDIUM";
  const evidence = { rejectedCount: rejected, windowDays: 14 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "PARTNER",
    severity,
    title: `${rejected} partner access requests rejected in the last 14 days`,
    summary: `Multiple partner access requests have been rejected recently. Review to determine if requests are from unauthorized partners or if your access policies need adjustment.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "partner_access_request",
    recommendedActionType: "review_partner_access",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(72),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * WEBHOOK-01: Webhook delivery failure spike.
 * More than 10 webhook delivery failures in the last 24 hours.
 */
async function checkWebhookDeliveryFailures(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "integrations.webhook_delivery_failures";
  const window = daysAgo(1);

  const failedDeliveries = await db.apiWebhookDelivery.count({
    where: {
      endpoint: { orgId },
      success: false,
      deliveredAt: { gte: window },
    },
  });

  if (failedDeliveries < 10) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = failedDeliveries >= 50 ? "HIGH" : "MEDIUM";
  const evidence = { failedCount: failedDeliveries, windowHours: 24 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "INTEGRATIONS",
    severity,
    title: `${failedDeliveries} webhook delivery failures in the last 24 hours`,
    summary: `Webhook deliveries are failing at an elevated rate. Check your webhook endpoint availability and fix issues to avoid missed events.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "webhook_delivery",
    recommendedActionType: "review_webhook_failures",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(12),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

// ─── Books rules (additional) ─────────────────────────────────────────────────

/**
 * BOOKS-02: Vendor bill approval bottleneck.
 * 5 or more vendor bills have been sitting in PENDING_APPROVAL for longer than 7 days.
 */
async function checkBooksVendorBillBottleneck(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "books.vendor_bill_bottleneck";
  const staleBefore = daysAgo(7);

  const stuckBills = await db.vendorBill.findMany({
    where: {
      orgId,
      status: "PENDING_APPROVAL",
      updatedAt: { lte: staleBefore },
    },
    select: { id: true, billNumber: true, totalAmount: true, billDate: true },
  });

  if (stuckBills.length < 5) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = stuckBills.length >= 15 ? "HIGH" : "MEDIUM";
  const evidence = {
    stuckBillCount: stuckBills.length,
    staleThresholdDays: 7,
    examples: stuckBills.slice(0, 5).map((b) => ({ id: b.id, billNumber: b.billNumber })),
  };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "OPERATIONS",
    severity,
    title: `${stuckBills.length} vendor bills stuck in approval for more than 7 days`,
    summary: `${stuckBills.length} vendor bills have been awaiting approval for over 7 days. This may indicate a blocked approver or missing approval policy. Review and process or reassign.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "vendor_bill",
    recommendedActionType: "review_vendor_bill_approvals",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(24),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * BOOKS-03: Payment run failure concentration.
 * 2 or more payment runs have failed or been rejected in the last 30 days.
 */
async function checkBooksPaymentRunFailures(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "books.payment_run_failures";
  const window = daysAgo(30);

  const failedRuns = await db.paymentRun.findMany({
    where: {
      orgId,
      status: { in: ["FAILED", "REJECTED"] },
      updatedAt: { gte: window },
    },
    select: { id: true, status: true, updatedAt: true },
  });

  if (failedRuns.length < 2) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = failedRuns.length >= 5 ? "HIGH" : "MEDIUM";
  const evidence = {
    failedRunCount: failedRuns.length,
    windowDays: 30,
    examples: failedRuns.slice(0, 5).map((r) => ({ id: r.id, status: r.status })),
  };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "OPERATIONS",
    severity,
    title: `${failedRuns.length} payment runs failed or rejected in the last 30 days`,
    summary: `${failedRuns.length} payment runs have failed or been rejected recently. This may indicate issues with bank account configuration, insufficient funds, or approval rejections. Review and retry or cancel affected runs.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "payment_run",
    recommendedActionType: "review_payment_run_failures",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(24),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * BOOKS-04: Close period blocked.
 * A close run has been in BLOCKED status for more than 7 days, or there are
 * 3+ blocked close tasks across all open close runs.
 */
async function checkBooksClosePeriodBlocked(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "books.close_period_blocked";
  const staleBefore = daysAgo(7);

  const blockedRuns = await db.closeRun.findMany({
    where: {
      orgId,
      status: "BLOCKED",
      startedAt: { lte: staleBefore },
    },
    select: { id: true, blockerCount: true },
  });

  const blockedTasks = await db.closeTask.count({
    where: {
      closeRun: { orgId },
      status: "BLOCKED",
    },
  });

  if (blockedRuns.length === 0 && blockedTasks < 3) return { fired: false, ruleKey };

  const totalBlockers = blockedRuns.reduce((sum, r) => sum + (r.blockerCount ?? 0), 0);
  const severity: IntelInsightSeverity =
    blockedRuns.length >= 2 || totalBlockers >= 5 ? "HIGH" : "MEDIUM";

  const evidence = {
    blockedRunCount: blockedRuns.length,
    blockedTaskCount: blockedTasks,
    totalBlockers,
    staleThresholdDays: 7,
  };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "OPERATIONS",
    severity,
    title: `Close period blocked: ${blockedRuns.length} run${blockedRuns.length === 1 ? "" : "s"}, ${blockedTasks} task${blockedTasks === 1 ? "" : "s"} blocked`,
    summary: `Period close is blocked by unresolved checklist items or missing approvals. This delays financial close and reporting. Resolve blockers or escalate to the responsible team.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "close_run",
    recommendedActionType: "resolve_close_blockers",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(24),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

// ─── GST rules (additional) ───────────────────────────────────────────────────

/**
 * GST-02: Validation issue spike.
 * More than 10 GST filing validation issues have been created in the last 30 days.
 */
async function checkGstValidationIssueSpike(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "gst.validation_issue_spike";
  const window = daysAgo(30);

  const issueCount = await db.gstFilingValidationIssue.count({
    where: { orgId, createdAt: { gte: window } },
  });

  if (issueCount < 10) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = issueCount >= 50 ? "HIGH" : "MEDIUM";
  const evidence = { issueCount, windowDays: 30, threshold: 10 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "COMPLIANCE",
    severity,
    title: `${issueCount} GST filing validation issues in the last 30 days`,
    summary: `A high number of GST validation issues have been detected. This may indicate data quality problems in invoices or mismatched GSTIN/HSN data. Resolve issues before your next filing deadline.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "gst_filing_validation_issue",
    recommendedActionType: "review_gst_validation_issues",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(48),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * GST-03: Stale GST filing data.
 * The org has at least one non-draft filing run but no RECONCILED run in the last 60 days.
 * This suggests filing activity has stalled or a previous submission was not reconciled.
 */
async function checkGstStaleFilingData(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "gst.stale_filing_data";
  const window = daysAgo(60);

  // Check if org has ever attempted a filing (exclude DRAFT-only orgs — no signal yet).
  const attemptedRunCount = await db.gstFilingRun.count({
    where: { orgId, status: { not: "DRAFT" } },
  });

  if (attemptedRunCount === 0) return { fired: false, ruleKey };

  const recentReconciled = await db.gstFilingRun.count({
    where: { orgId, status: "RECONCILED", updatedAt: { gte: window } },
  });

  if (recentReconciled > 0) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = "MEDIUM";
  const evidence = {
    windowDays: 60,
    attemptedRunCount,
    recentReconciledCount: recentReconciled,
  };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "COMPLIANCE",
    severity,
    title: "No reconciled GST filing in the last 60 days",
    summary:
      "Your organisation has active GST filing history but no filing has been reconciled in the last 60 days. Check whether a recent filing run is stalled, failed, or needs manual reconciliation.",
    evidence,
    sourceType: "RULE",
    sourceRecordType: "gst_filing_run",
    recommendedActionType: "review_gst_filing_status",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(48),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

// ─── Flow / notifications rules ───────────────────────────────────────────────

/**
 * FLOW-01: Pending approval SLA breaches.
 * 1 or more ApprovalRequests are past their dueAt deadline with status PENDING.
 */
async function checkFlowApprovalSlaBreaches(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "flow.approval_sla_breaches";
  const now = new Date();

  const overdueApprovals = await db.approvalRequest.findMany({
    where: {
      orgId,
      status: "PENDING",
      dueAt: { lt: now },
    },
    select: { id: true, dueAt: true, docType: true },
  });

  if (overdueApprovals.length === 0) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity =
    overdueApprovals.length >= 10 ? "HIGH" : overdueApprovals.length >= 3 ? "MEDIUM" : "LOW";

  const evidence = {
    breachedCount: overdueApprovals.length,
    examples: overdueApprovals.slice(0, 5).map((a) => ({
      id: a.id,
      docType: a.docType,
      dueAt: a.dueAt?.toISOString(),
    })),
  };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "OPERATIONS",
    severity,
    title: `${overdueApprovals.length} approval${overdueApprovals.length === 1 ? "" : "s"} past SLA deadline`,
    summary: `${overdueApprovals.length} approval request${overdueApprovals.length === 1 ? " has" : "s have"} missed their deadline and remain pending. This may delay financial operations. Assign or escalate to the responsible approver.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "approval_request",
    recommendedActionType: "resolve_overdue_approvals",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(12),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * FLOW-02: Notification delivery failure spike.
 * 10 or more notification deliveries have failed in the last 24 hours.
 */
async function checkFlowNotificationFailures(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "flow.notification_delivery_failures";
  const window = daysAgo(1);

  const failedCount = await db.notificationDelivery.count({
    where: {
      orgId,
      status: { in: ["FAILED", "TERMINAL_FAILURE"] },
      failedAt: { gte: window },
    },
  });

  if (failedCount < 10) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = failedCount >= 50 ? "HIGH" : "MEDIUM";
  const evidence = { failedCount, windowHours: 24, threshold: 10 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "OPERATIONS",
    severity,
    title: `${failedCount} notification delivery failures in the last 24 hours`,
    summary: `A spike in notification delivery failures has been detected. Recipients may not be receiving invoices, payment reminders, or other critical communications. Check your email provider configuration.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "notification_delivery",
    recommendedActionType: "review_notification_failures",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(12),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

/**
 * FLOW-03: Notification retry loop concentration.
 * 5 or more notification deliveries have been retried 3+ times and are still not delivered.
 *
 * NOTE: Dead-letter queue growth and generic retry loop tracking require infrastructure-level
 * telemetry not present in the Prisma schema. This rule covers the detectable subset:
 * notification deliveries stuck in high-attempt-count FAILED state.
 */
async function checkFlowNotificationRetryLoops(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "flow.notification_retry_loops";

  const stuckDeliveries = await db.notificationDelivery.count({
    where: {
      orgId,
      attemptCount: { gte: 3 },
      status: { in: ["FAILED", "SENDING"] },
    },
  });

  if (stuckDeliveries < 5) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = stuckDeliveries >= 20 ? "HIGH" : "MEDIUM";
  const evidence = { stuckCount: stuckDeliveries, minAttemptCount: 3 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "OPERATIONS",
    severity,
    title: `${stuckDeliveries} notifications stuck in retry loops (3+ attempts)`,
    summary: `${stuckDeliveries} notifications have been retried 3 or more times without success. These are likely stuck due to invalid recipient addresses or provider issues. Review and clear stuck deliveries.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "notification_delivery",
    recommendedActionType: "review_stuck_notifications",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(24),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

// ─── Integrations rules (additional) ─────────────────────────────────────────

/**
 * INTEGRATIONS-02: OAuth authorization expiry warning.
 * One or more OAuth authorizations for this org's apps expire within 7 days.
 *
 * NOTE: Sync drift and third-party integration OAuth refresh failures require
 * an integration-specific sync log not present in the current Prisma schema.
 * This rule covers the detectable subset: org OAuth authorizations approaching expiry.
 */
async function checkIntegrationsOAuthExpiry(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "integrations.oauth_expiry_warning";
  const now = new Date();
  const warnWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const expiringAuths = await db.oAuthAuthorization.count({
    where: {
      orgId,
      isRevoked: false,
      refreshExpiresAt: { gt: now, lte: warnWindow },
    },
  });

  if (expiringAuths === 0) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = "MEDIUM";
  const evidence = { expiringCount: expiringAuths, warnWindowDays: 7 };

  const { id: insightId, wasCreated } = await upsertInsight({
    orgId,
    category: "INTEGRATIONS",
    severity,
    title: `${expiringAuths} OAuth authorization${expiringAuths === 1 ? "" : "s"} expiring within 7 days`,
    summary: `${expiringAuths} active OAuth authorization${expiringAuths === 1 ? " is" : "s are"} approaching their refresh token expiry. If not renewed, connected integrations will lose access. Request users to re-authorize before expiry.`,
    evidence,
    sourceType: "RULE",
    sourceRecordType: "oauth_authorization",
    recommendedActionType: "renew_oauth_authorizations",
    assignedRole: "admin",
    dedupeKey: `${ruleKey}:${orgId}`,
    expiresAt: expiresIn(48),
  });

  return { fired: true, ruleKey, insightId, wasCreated, severity };
}

// ─── Master detection runner ──────────────────────────────────────────────────

type RuleRunner = (orgId: string) => Promise<AnomalyRuleResult>;

const ALL_RULES: Array<{ key: string; runner: RuleRunner; enabled: boolean }> = [
  { key: "docs.duplicate_numbering", runner: checkDocsDuplicateNumbering, enabled: true },
  { key: "docs.high_draft_abandonment", runner: checkDocsDraftAbandonment, enabled: true },
  { key: "ar.overdue_amount_spike", runner: checkArOverdueSpike, enabled: true },
  { key: "ar.proof_rejection_spike", runner: checkArProofRejectionSpike, enabled: true },
  { key: "ar.missed_installment_cluster", runner: checkArMissedInstallments, enabled: true },
  { key: "books.unreconciled_transaction_spike", runner: checkBooksUnreconciledSpike, enabled: true },
  { key: "books.vendor_bill_bottleneck", runner: checkBooksVendorBillBottleneck, enabled: true },
  { key: "books.payment_run_failures", runner: checkBooksPaymentRunFailures, enabled: true },
  { key: "books.close_period_blocked", runner: checkBooksClosePeriodBlocked, enabled: true },
  { key: "gst.filing_run_blocked", runner: checkGstFilingBlocked, enabled: true },
  { key: "gst.validation_issue_spike", runner: checkGstValidationIssueSpike, enabled: true },
  { key: "gst.stale_filing_data", runner: checkGstStaleFilingData, enabled: true },
  { key: "flow.approval_sla_breaches", runner: checkFlowApprovalSlaBreaches, enabled: true },
  { key: "flow.notification_delivery_failures", runner: checkFlowNotificationFailures, enabled: true },
  { key: "flow.notification_retry_loops", runner: checkFlowNotificationRetryLoops, enabled: true },
  { key: "marketplace.payout_item_stuck", runner: checkMarketplacePayoutStuck, enabled: true },
  { key: "partner.repeated_access_rejection", runner: checkPartnerAccessRejections, enabled: true },
  { key: "integrations.webhook_delivery_failures", runner: checkWebhookDeliveryFailures, enabled: true },
  { key: "integrations.oauth_expiry_warning", runner: checkIntegrationsOAuthExpiry, enabled: true },
];

/**
 * Run all enabled anomaly detection rules for an org.
 * Records the run in AnomalyDetectionRun and returns a summary.
 * Safe to run multiple times (idempotent via insight dedupeKeys).
 */
export async function runAnomalyDetection(orgId: string): Promise<DetectionRunSummary> {
  const run = await db.anomalyDetectionRun.create({
    data: { orgId, status: "RUNNING", startedAt: new Date() },
    select: { id: true },
  });

  let rulesEvaluated = 0;
  let insightsCreated = 0;
  let insightsUpdated = 0;
  const errors: string[] = [];

  for (const rule of ALL_RULES) {
    if (!rule.enabled) continue;
    rulesEvaluated++;

    try {
      const result = await rule.runner(orgId);
      if (result.fired) {
        if (result.wasCreated) {
          insightsCreated++;
        } else {
          insightsUpdated++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${rule.key}: ${msg}`);
    }
  }

  await db.anomalyDetectionRun.update({
    where: { id: run.id },
    data: {
      status: errors.length > 0 ? "PARTIAL" : "COMPLETED",
      completedAt: new Date(),
      rulesEvaluated,
      insightsCreated,
      insightsUpdated,
      errorMessage: errors.length > 0 ? errors.join("; ") : null,
    },
  });

  return { runId: run.id, rulesEvaluated, insightsCreated, insightsUpdated, errors };
}

/**
 * List recent anomaly detection runs for an org.
 */
export async function listAnomalyRuns(orgId: string, limit = 10) {
  return db.anomalyDetectionRun.findMany({
    where: { orgId },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      rulesEvaluated: true,
      insightsCreated: true,
      insightsUpdated: true,
      errorMessage: true,
    },
  });
}

/**
 * Get anomaly insights for an org — these are IntelInsights with RULE sourceType.
 * Used by the anomaly center to show only rule-driven anomalies.
 */
export async function listAnomalyInsights(orgId: string) {
  const now = new Date();
  return db.intelInsight.findMany({
    where: {
      orgId,
      sourceType: "RULE",
      status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ lastDetectedAt: "desc" }],
    select: {
      id: true,
      category: true,
      severity: true,
      status: true,
      title: true,
      summary: true,
      evidence: true,
      sourceType: true,
      recommendedActionType: true,
      assignedRole: true,
      firstDetectedAt: true,
      lastDetectedAt: true,
      expiresAt: true,
    },
    take: 100,
  });
}
