import "server-only";

import { db } from "@/lib/db";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HealthScoreBreakdown {
  score: number;
  avgDaysToPay: { value: number; score: number; weight: number };
  overdueRatio: { value: number; score: number; weight: number };
  paymentConsistency: { value: number; score: number; weight: number };
  outstandingRatio: { value: number; score: number; weight: number };
  disputeRatio: { value: number; score: number; weight: number };
}

// ─── Weights ─────────────────────────────────────────────────────────────────

const WEIGHTS = {
  avgDaysToPay: 0.3,
  overdueRatio: 0.25,
  paymentConsistency: 0.2,
  outstandingRatio: 0.15,
  disputeRatio: 0.1,
} as const;

// ─── Public API ──────────────────────────────────────────────────────────────

export async function calculateHealthScore(
  orgId: string,
  customerId: string,
): Promise<HealthScoreBreakdown> {
  const invoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      customerId,
      status: { notIn: ["DRAFT", "CANCELLED"] },
    },
    include: {
      payments: {
        where: { status: "SETTLED" },
        orderBy: { paidAt: "asc" },
      },
    },
  });

  if (invoices.length === 0) {
    const defaultBreakdown = buildBreakdown(100, 100, 100, 100, 100, {
      avgDaysToPay: 0,
      overdueRatio: 0,
      paymentConsistency: 0,
      outstandingRatio: 0,
      disputeRatio: 0,
    });
    await updateCustomerScore(customerId, defaultBreakdown.score);
    return defaultBreakdown;
  }

  // 1. Average days to pay (for invoices that have been paid)
  const daysToPay: number[] = [];
  for (const inv of invoices) {
    if (inv.paidAt && inv.issuedAt) {
      const days = Math.max(
        0,
        Math.floor((inv.paidAt.getTime() - inv.issuedAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
      daysToPay.push(days);
    }
  }
  const avgDays = daysToPay.length > 0 ? daysToPay.reduce((a, b) => a + b, 0) / daysToPay.length : 0;
  // Score: 0 days = 100, 30 days = 70, 60 days = 40, 90+ days = 0
  const avgDaysScore = daysToPay.length > 0 ? Math.max(0, Math.min(100, 100 - (avgDays / 90) * 100)) : 100;

  // 2. Overdue invoice ratio
  const overdueCount = invoices.filter((inv) => inv.status === "OVERDUE").length;
  const nonDraftCount = invoices.length;
  const overdueRatio = nonDraftCount > 0 ? overdueCount / nonDraftCount : 0;
  // Score: 0% overdue = 100, 50%+ overdue = 0
  const overdueScore = Math.max(0, Math.min(100, 100 - overdueRatio * 200));

  // 3. Payment consistency (coefficient of variation in days to pay)
  let consistencyScore = 100;
  let consistencyValue = 0;
  if (daysToPay.length >= 2) {
    const mean = avgDays;
    const variance = daysToPay.reduce((sum, d) => sum + (d - mean) ** 2, 0) / daysToPay.length;
    const stdDev = Math.sqrt(variance);
    consistencyValue = mean > 0 ? stdDev / mean : 0; // coefficient of variation
    // Score: CV of 0 = 100, CV of 1+ = 0
    consistencyScore = Math.max(0, Math.min(100, 100 - consistencyValue * 100));
  }

  // 4. Outstanding amount ratio
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  const avgInvoiceAmount =
    nonDraftCount > 0 ? invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) / nonDraftCount : 1;
  const outstandingRatio = avgInvoiceAmount > 0 ? totalOutstanding / avgInvoiceAmount : 0;
  // Score: 0 ratio = 100, ratio of 3+ = 0
  const outstandingScore = Math.max(0, Math.min(100, 100 - (outstandingRatio / 3) * 100));

  // 5. Dispute ratio
  const disputeCount = invoices.filter((inv) => inv.status === "DISPUTED").length;
  const disputeRatio = nonDraftCount > 0 ? disputeCount / nonDraftCount : 0;
  // Score: 0% disputed = 100, 20%+ disputed = 0
  const disputeScore = Math.max(0, Math.min(100, 100 - disputeRatio * 500));

  const breakdown = buildBreakdown(avgDaysScore, overdueScore, consistencyScore, outstandingScore, disputeScore, {
    avgDaysToPay: Math.round(avgDays * 10) / 10,
    overdueRatio: Math.round(overdueRatio * 1000) / 10,
    paymentConsistency: Math.round(consistencyValue * 100) / 100,
    outstandingRatio: Math.round(outstandingRatio * 100) / 100,
    disputeRatio: Math.round(disputeRatio * 1000) / 10,
  });

  await updateCustomerScore(customerId, breakdown.score);

  return breakdown;
}

export async function recalculateAllHealthScores(orgId: string): Promise<{ updated: number }> {
  const customers = await db.customer.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });

  let updated = 0;
  for (const customer of customers) {
    try {
      await calculateHealthScore(orgId, customer.id);
      updated++;
    } catch (error) {
      console.error(`[customer-health] Failed to recalculate for ${customer.id}:`, error);
    }
  }

  return { updated };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildBreakdown(
  avgDaysScore: number,
  overdueScore: number,
  consistencyScore: number,
  outstandingScore: number,
  disputeScore: number,
  rawValues: {
    avgDaysToPay: number;
    overdueRatio: number;
    paymentConsistency: number;
    outstandingRatio: number;
    disputeRatio: number;
  },
): HealthScoreBreakdown {
  const weightedScore = Math.round(
    avgDaysScore * WEIGHTS.avgDaysToPay +
      overdueScore * WEIGHTS.overdueRatio +
      consistencyScore * WEIGHTS.paymentConsistency +
      outstandingScore * WEIGHTS.outstandingRatio +
      disputeScore * WEIGHTS.disputeRatio,
  );

  return {
    score: Math.max(0, Math.min(100, weightedScore)),
    avgDaysToPay: {
      value: rawValues.avgDaysToPay,
      score: Math.round(avgDaysScore),
      weight: WEIGHTS.avgDaysToPay,
    },
    overdueRatio: {
      value: rawValues.overdueRatio,
      score: Math.round(overdueScore),
      weight: WEIGHTS.overdueRatio,
    },
    paymentConsistency: {
      value: rawValues.paymentConsistency,
      score: Math.round(consistencyScore),
      weight: WEIGHTS.paymentConsistency,
    },
    outstandingRatio: {
      value: rawValues.outstandingRatio,
      score: Math.round(outstandingScore),
      weight: WEIGHTS.outstandingRatio,
    },
    disputeRatio: {
      value: rawValues.disputeRatio,
      score: Math.round(disputeScore),
      weight: WEIGHTS.disputeRatio,
    },
  };
}

async function updateCustomerScore(customerId: string, score: number): Promise<void> {
  await db.customer.update({
    where: { id: customerId },
    data: { paymentHealthScore: score },
  });
}
