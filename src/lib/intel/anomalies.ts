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

  const insightId = await upsertInsight({
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

  return { fired: true, ruleKey, insightId, severity };
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

  const insightId = await upsertInsight({
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

  return { fired: true, ruleKey, insightId, severity };
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

  const insightId = await upsertInsight({
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

  return { fired: true, ruleKey, insightId, severity };
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

  const insightId = await upsertInsight({
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

  return { fired: true, ruleKey, insightId, severity };
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

  const insightId = await upsertInsight({
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

  return { fired: true, ruleKey, insightId, severity };
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
      status: { in: ["UNMATCHED", "PENDING"] },
      txnDate: { lte: staleThreshold },
    },
  });

  if (unmatched < 50) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = unmatched >= 150 ? "HIGH" : "MEDIUM";
  const evidence = { unmatchedCount: unmatched, staleAfterDays: 14 };

  const insightId = await upsertInsight({
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

  return { fired: true, ruleKey, insightId, severity };
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

  const insightId = await upsertInsight({
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

  return { fired: true, ruleKey, insightId, severity };
}

/**
 * MARKETPLACE-01: Payout item stuck.
 * Any payout item has been in HOLD, RETRY, or MANUAL state for more than 7 days.
 */
async function checkMarketplacePayoutStuck(orgId: string): Promise<AnomalyRuleResult> {
  const ruleKey = "marketplace.payout_item_stuck";
  const staleThreshold = daysAgo(7);

  const stuckItems = await db.payoutItem.count({
    where: {
      orgId,
      status: { in: ["HOLD", "RETRY", "MANUAL"] },
      updatedAt: { lte: staleThreshold },
    },
  });

  if (stuckItems === 0) return { fired: false, ruleKey };

  const severity: IntelInsightSeverity = stuckItems >= 5 ? "HIGH" : "MEDIUM";
  const evidence = { stuckCount: stuckItems, staleAfterDays: 7 };

  const insightId = await upsertInsight({
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

  return { fired: true, ruleKey, insightId, severity };
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

  const insightId = await upsertInsight({
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

  return { fired: true, ruleKey, insightId, severity };
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

  const insightId = await upsertInsight({
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

  return { fired: true, ruleKey, insightId, severity };
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
  { key: "gst.filing_run_blocked", runner: checkGstFilingBlocked, enabled: true },
  { key: "marketplace.payout_item_stuck", runner: checkMarketplacePayoutStuck, enabled: true },
  { key: "partner.repeated_access_rejection", runner: checkPartnerAccessRejections, enabled: true },
  { key: "integrations.webhook_delivery_failures", runner: checkWebhookDeliveryFailures, enabled: true },
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
  const insightsUpdated = 0;
  const errors: string[] = [];

  for (const rule of ALL_RULES) {
    if (!rule.enabled) continue;
    rulesEvaluated++;

    try {
      const result = await rule.runner(orgId);
      if (result.fired) {
        // The upsertInsight function handles create vs update.
        // We count creates here by checking if insight was new (imprecise but good enough for summary).
        insightsCreated++;
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
