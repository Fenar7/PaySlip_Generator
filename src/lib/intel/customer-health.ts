import "server-only";

import { db } from "@/lib/db";
import { toAccountingNumber } from "@/lib/accounting/utils";

export type RiskBand = "healthy" | "at_risk" | "high_risk" | "critical";

export interface HealthFactor {
  key: string;
  label: string;
  value: string | number;
  impact: "positive" | "negative" | "neutral";
  weight: number;
}

export interface CustomerHealthResult {
  customerId: string;
  customerName: string;
  score: number;
  riskBand: RiskBand;
  factors: HealthFactor[];
  recommendedAction: string;
  calculatedAt: Date;
  validUntil: Date;
  insufficientData: boolean;
}

const MINIMUM_INVOICES_FOR_SCORING = 3;

function riskBandFromScore(score: number): RiskBand {
  if (score >= 75) return "healthy";
  if (score >= 50) return "at_risk";
  if (score >= 25) return "high_risk";
  return "critical";
}

function recommendedActionFromBand(band: RiskBand): string {
  switch (band) {
    case "healthy": return "monitor";
    case "at_risk": return "send_reminder";
    case "high_risk": return "schedule_follow_up";
    case "critical": return "escalate_to_admin";
  }
}

/**
 * Compute a customer health score from their invoice, payment, arrangement,
 * and dispute history. All inputs are org-scoped.
 *
 * Score is 0–100 (higher = healthier). Evidence factors are stored with each snapshot.
 * No black-box scoring — every factor that contributes to the score is recorded.
 */
export async function computeCustomerHealth(
  orgId: string,
  customerId: string,
): Promise<CustomerHealthResult> {
  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
    select: { id: true, name: true, createdAt: true },
  });

  if (!customer) {
    return buildInsufficientResult(customerId, "Unknown");
  }

  const invoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      customerId,
      status: { in: ["PAID", "PARTIALLY_PAID", "OVERDUE", "ISSUED", "VIEWED", "DUE", "CANCELLED", "ARRANGEMENT_MADE", "DISPUTED"] },
    },
    select: {
      id: true,
      status: true,
      totalAmount: true,
      dueDate: true,
      paidAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  if (invoices.length < MINIMUM_INVOICES_FOR_SCORING) {
    return buildInsufficientResult(customerId, customer.name);
  }

  const factors: HealthFactor[] = [];
  let score = 100;

  // ── Factor 1: Late payment rate ────────────────────────────────────────────
  const paidInvoices = invoices.filter((i) => i.paidAt);
  const latePayments = paidInvoices.filter(
    (i) => i.paidAt && i.dueDate && i.paidAt > new Date(i.dueDate),
  );
  const lateRate = paidInvoices.length > 0 ? latePayments.length / paidInvoices.length : 0;
  const lateRatePct = Math.round(lateRate * 100);

  const latePenalty = Math.round(lateRate * 35);
  score -= latePenalty;
  factors.push({
    key: "late_payment_rate",
    label: "Late payment rate",
    value: `${lateRatePct}%`,
    impact: lateRate > 0.3 ? "negative" : lateRate > 0.1 ? "neutral" : "positive",
    weight: 35,
  });

  // ── Factor 2: Average days late ────────────────────────────────────────────
  let avgDaysLate = 0;
  if (latePayments.length > 0) {
    const totalDaysLate = latePayments.reduce((sum, i) => {
      const days = (i.paidAt!.getTime() - new Date(i.dueDate!).getTime()) / (1000 * 60 * 60 * 24);
      return sum + Math.max(0, days);
    }, 0);
    avgDaysLate = Math.round(totalDaysLate / latePayments.length);
  }
  const avgDaysPenalty = Math.min(20, Math.round((avgDaysLate / 60) * 20));
  score -= avgDaysPenalty;
  factors.push({
    key: "avg_days_late",
    label: "Average days late on payment",
    value: avgDaysLate,
    impact: avgDaysLate > 30 ? "negative" : avgDaysLate > 10 ? "neutral" : "positive",
    weight: 20,
  });

  // ── Factor 3: Open overdue amount ──────────────────────────────────────────
  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");
  const overdueAmount = overdueInvoices.reduce(
    (sum, i) => sum + toAccountingNumber(i.totalAmount ?? 0),
    0,
  );
  const overdueCount = overdueInvoices.length;
  const overduePenalty = Math.min(25, overdueCount * 5);
  score -= overduePenalty;
  factors.push({
    key: "open_overdue",
    label: "Open overdue invoices",
    value: overdueCount,
    impact: overdueCount > 3 ? "negative" : overdueCount > 0 ? "neutral" : "positive",
    weight: 25,
  });
  if (overdueAmount > 0) {
    factors.push({
      key: "overdue_amount",
      label: "Total overdue amount (₹)",
      value: Math.round(overdueAmount),
      impact: "negative",
      weight: 0,
    });
  }

  // ── Factor 4: Payment arrangement behavior ─────────────────────────────────
  const arrangements = await db.paymentArrangement.findMany({
    where: { orgId, customerId },
    select: { status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const arrangementCount = arrangements.length;
  const activeArrangements = arrangements.filter((a) => a.status === "ACTIVE");
  const arrangementPenalty = arrangementCount > 0 ? Math.min(10, arrangementCount * 3) : 0;
  score -= arrangementPenalty;
  factors.push({
    key: "payment_arrangements",
    label: "Payment arrangements",
    value: arrangementCount,
    impact: arrangementCount > 2 ? "negative" : arrangementCount > 0 ? "neutral" : "positive",
    weight: 10,
  });
  if (activeArrangements.length > 0) {
    factors.push({
      key: "active_arrangements",
      label: "Active payment arrangements",
      value: activeArrangements.length,
      impact: "negative",
      weight: 0,
    });
  }

  // ── Factor 5: Disputed invoices ────────────────────────────────────────────
  const disputedCount = invoices.filter((i) => i.status === "DISPUTED").length;
  const disputePenalty = Math.min(10, disputedCount * 5);
  score -= disputePenalty;
  factors.push({
    key: "open_tickets",
    label: "Disputed invoices",
    value: disputedCount,
    impact: disputedCount > 1 ? "negative" : disputedCount > 0 ? "neutral" : "positive",
    weight: 10,
  });

  // ── Factor 6: Customer tenure (positive signal) ────────────────────────────
  const tenureDays = Math.floor(
    (Date.now() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const tenureBonus = Math.min(5, Math.floor(tenureDays / 180)); // +1 per 6 months, max +5
  score = Math.min(100, score + tenureBonus);
  factors.push({
    key: "customer_tenure_days",
    label: "Customer tenure (days)",
    value: tenureDays,
    impact: tenureDays > 365 ? "positive" : "neutral",
    weight: 0,
  });

  // Clamp score to [0, 100]
  score = Math.max(0, Math.min(100, score));
  const riskBand = riskBandFromScore(score);
  const recommendedAction = recommendedActionFromBand(riskBand);

  const calculatedAt = new Date();
  const validUntil = new Date(calculatedAt.getTime() + 24 * 60 * 60 * 1000); // 24h validity

  // Persist snapshot
  await db.customerHealthSnapshot.create({
    data: {
      orgId,
      customerId,
      score,
      riskBand,
      factors: factors as object[],
      recommendedAction,
      calculatedAt,
      validUntil,
    },
  });

  return {
    customerId,
    customerName: customer.name,
    score,
    riskBand,
    factors,
    recommendedAction,
    calculatedAt,
    validUntil,
    insufficientData: false,
  };
}

function buildInsufficientResult(customerId: string, customerName: string): CustomerHealthResult {
  const now = new Date();
  return {
    customerId,
    customerName,
    score: -1,
    riskBand: "at_risk",
    factors: [],
    recommendedAction: "monitor",
    calculatedAt: now,
    validUntil: now,
    insufficientData: true,
  };
}

/** Get the latest valid health snapshot for a customer, or compute fresh if stale. */
export async function getCustomerHealthSnapshot(
  orgId: string,
  customerId: string,
): Promise<CustomerHealthResult> {
  const now = new Date();
  const latest = await db.customerHealthSnapshot.findFirst({
    where: { orgId, customerId, validUntil: { gt: now } },
    orderBy: { calculatedAt: "desc" },
  });

  if (latest) {
    // Hydrate the customer name — the snapshot model has no customer relation,
    // so we do a targeted lookup. This is a single query on the cached path,
    // not a per-row N+1 on a list page.
    const customer = await db.customer.findFirst({
      where: { id: customerId, organizationId: orgId },
      select: { name: true },
    });

    return {
      customerId,
      customerName: customer?.name ?? "",
      score: latest.score,
      riskBand: latest.riskBand as RiskBand,
      factors: latest.factors as unknown as HealthFactor[],
      recommendedAction: latest.recommendedAction ?? "monitor",
      calculatedAt: latest.calculatedAt,
      validUntil: latest.validUntil,
      insufficientData: latest.score < 0,
    };
  }

  return computeCustomerHealth(orgId, customerId);
}

export interface CollectionQueueEntry {
  customerId: string;
  customerName: string;
  overdueAmount: number;
  overdueCount: number;
  oldestOverdueDays: number;
  healthScore: number;
  riskBand: RiskBand;
  recommendedAction: string;
}

/**
 * Build a ranked collection priority queue for the org.
 * Ranking: critical risk > overdue amount > overdue age.
 * Org-scoped, deterministic, and testable.
 */
export async function getCollectionQueue(orgId: string, limit = 50): Promise<CollectionQueueEntry[]> {
  const now = new Date();

  const overdueGroups = await db.invoice.groupBy({
    by: ["customerId"],
    where: {
      organizationId: orgId,
      status: "OVERDUE",
    },
    _count: { id: true },
    _sum: { totalAmount: true },
    _min: { dueDate: true },
  });

  if (overdueGroups.length === 0) return [];

  const customerIds = overdueGroups.map((g) => g.customerId).filter(Boolean) as string[];
  const customers = await db.customer.findMany({
    where: { id: { in: customerIds }, organizationId: orgId },
    select: { id: true, name: true },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  const snapshots = await db.customerHealthSnapshot.findMany({
    where: { orgId, customerId: { in: customerIds }, validUntil: { gt: now } },
    orderBy: { calculatedAt: "desc" },
    distinct: ["customerId"],
  });
  const snapshotMap = new Map(snapshots.map((s) => [s.customerId, s]));

  const entries: CollectionQueueEntry[] = [];

  for (const group of overdueGroups) {
    if (!group.customerId) continue;
    const snapshot = snapshotMap.get(group.customerId);
    const oldestDue_str = group._min.dueDate;
    const oldestDue = oldestDue_str ? new Date(oldestDue_str) : null;
    const oldestOverdueDays = oldestDue
      ? Math.floor((now.getTime() - oldestDue.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    entries.push({
      customerId: group.customerId,
      customerName: customerMap.get(group.customerId) ?? "Unknown",
      overdueAmount: toAccountingNumber(group._sum.totalAmount ?? 0),
      overdueCount: group._count.id,
      oldestOverdueDays,
      healthScore: snapshot?.score ?? -1,
      riskBand: (snapshot?.riskBand as RiskBand) ?? "at_risk",
      recommendedAction: snapshot?.recommendedAction ?? "send_reminder",
    });
  }

  // Rank: critical > high_risk > at_risk > healthy, then by overdue amount desc
  const bandOrder: Record<RiskBand, number> = { critical: 0, high_risk: 1, at_risk: 2, healthy: 3 };
  entries.sort((a, b) => {
    const bandDiff = (bandOrder[a.riskBand] ?? 4) - (bandOrder[b.riskBand] ?? 4);
    if (bandDiff !== 0) return bandDiff;
    return b.overdueAmount - a.overdueAmount;
  });

  return entries.slice(0, limit);
}
