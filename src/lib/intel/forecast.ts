import "server-only";

import { db } from "@/lib/db";
import type { ForecastTrigger } from "@/generated/prisma/client";
import { toAccountingNumber } from "@/lib/accounting/utils";
import {
  type MonthlyAggregate,
  type ForecastMonth,
  type RunRateMetrics,
  type SpendingAnomaly,
  generateProjections,
  computeRunRate,
  detectAnomalies,
  round2,
} from "./forecast-math";
import { upsertInsight } from "./insights";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForecastResult {
  id: string;
  generatedAt: Date;
  baseCurrency: string;
  historical: MonthlyAggregate[];
  projections: ForecastMonth[];
  runRate: RunRateMetrics;
  anomalies: SpendingAnomaly[];
  readiness: ForecastReadiness;
}

export interface ForecastReadiness {
  status: "ready" | "gathering_data";
  availableHistoryMonths: number;
  minimumHistoryMonths: number;
}

const MIN_FORECAST_HISTORY_MONTHS = 2;

// ─── Historical Data Aggregation ──────────────────────────────────────────────

/**
 * Aggregate historical cash flow from canonical sources only:
 * - Inflows: InvoicePayment (settled)
 * - Outflows: VendorBillPayment + PayrollRun (settled/completed)
 *
 * This avoids double-counting with BankTransaction or JournalEntry.
 * All amounts are normalized to the org's baseCurrency.
 */
async function aggregateHistoricalData(
  orgId: string,
  monthsBack: number = 12,
): Promise<MonthlyAggregate[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - monthsBack);
  cutoff.setDate(1);
  cutoff.setHours(0, 0, 0, 0);

  // Parallel queries for the three canonical sources
  const [invoicePayments, vendorPayments, payrollRuns] = await Promise.all([
    db.invoicePayment.findMany({
      where: {
        orgId,
        paidAt: { gte: cutoff },
        status: "SETTLED",
      },
      select: { amount: true, paidAt: true },
    }),
    db.vendorBillPayment.findMany({
      where: {
        orgId,
        paidAt: { gte: cutoff },
        status: "SETTLED",
      },
      select: { amount: true, paidAt: true },
    }),
    db.payrollRun.findMany({
      where: {
        orgId,
        finalizedAt: { gte: cutoff },
        status: "FINALIZED",
      },
      select: { totalNetPay: true, finalizedAt: true, period: true },
    }),
  ]);

  // Build month buckets
  const buckets = new Map<string, { inflow: number; outflow: number }>();

  const ensureBucket = (monthKey: string) => {
    if (!buckets.has(monthKey)) {
      buckets.set(monthKey, { inflow: 0, outflow: 0 });
    }
    return buckets.get(monthKey)!;
  };

  for (const p of invoicePayments) {
    const key = toMonthKey(p.paidAt!);
    ensureBucket(key).inflow += toAccountingNumber(p.amount);
  }

  for (const p of vendorPayments) {
    const key = toMonthKey(p.paidAt!);
    ensureBucket(key).outflow += toAccountingNumber(p.amount);
  }

  for (const r of payrollRuns) {
    const key = r.period; // Already "YYYY-MM" format
    ensureBucket(key).outflow += Number(r.totalNetPay);
  }

  // Fill gaps for months with no activity
  const months = generateMonthKeys(cutoff, new Date());
  const result: MonthlyAggregate[] = months.map((month) => {
    const b = buckets.get(month) ?? { inflow: 0, outflow: 0 };
    return {
      month,
      inflow: round2(b.inflow),
      outflow: round2(b.outflow),
      net: round2(b.inflow - b.outflow),
    };
  });

  return result;
}

// ─── Forecast Generation ──────────────────────────────────────────────────────

/**
 * Generate and persist a forecast snapshot.
 * horizonMonths: 1 (30-day), 2 (60-day), or 3 (90-day).
 */
export async function generateForecast(
  orgId: string,
  horizonMonths: number,
  trigger: ForecastTrigger = "MANUAL",
  includeAnomalies: boolean = true,
  alpha: number = 0.5,
): Promise<ForecastResult> {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { consolidationCurrency: true },
  });

  const baseCurrency = org.consolidationCurrency ?? "INR";
  const historical = await aggregateHistoricalData(orgId, 12);
  const readiness = summarizeForecastReadiness(historical);
  const projections =
    readiness.status === "ready"
      ? generateProjections(historical, horizonMonths, alpha)
      : [];
  const runRate =
    readiness.availableHistoryMonths > 0
      ? computeRunRate(historical)
      : { mrr: 0, arr: 0, momGrowth: null };
  const anomalies =
    includeAnomalies && readiness.status === "ready"
      ? detectAnomalies(historical)
      : [];

  const snapshot = await db.forecastSnapshot.create({
    data: {
      orgId,
      baseCurrency,
      smoothingAlpha: alpha,
      historicalData: historical as unknown as object,
      projections: projections as unknown as object,
      revenueRunRate: runRate as unknown as object,
      anomalies: anomalies.length > 0 ? (anomalies as unknown as object) : undefined,
      triggerType: trigger,
    },
    select: { id: true, generatedAt: true },
  });

  // Emit insights for detected anomalies
  if (anomalies.length > 0) {
    for (const anomaly of anomalies) {
      await upsertInsight({
        orgId,
        category: "SPENDING_ANOMALY",
        severity: Math.abs(anomaly.zScore) >= 3 ? "HIGH" : "MEDIUM",
        title: `${anomaly.type === "INFLOW" ? "Revenue" : "Spending"} anomaly in ${anomaly.month}`,
        summary: `${anomaly.type === "INFLOW" ? "Revenue" : "Spending"} of ${baseCurrency} ${anomaly.actual.toLocaleString()} deviated ${anomaly.zScore > 0 ? "above" : "below"} the mean by ${Math.abs(anomaly.zScore).toFixed(1)}σ.`,
        evidence: anomaly,
        sourceType: "RULE",
        sourceRecordType: "ForecastSnapshot",
        sourceRecordId: snapshot.id,
        dedupeKey: `spending-anomaly-${anomaly.month}-${anomaly.type}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }
  }

  return {
    id: snapshot.id,
    generatedAt: snapshot.generatedAt,
    baseCurrency,
    historical,
    projections,
    runRate,
    anomalies,
    readiness,
  };
}

// ─── Read Latest Forecast ─────────────────────────────────────────────────────

/**
 * Retrieve the latest forecast snapshot for an org, or null if none exists.
 */
export async function getLatestForecast(orgId: string): Promise<ForecastResult | null> {
  const snapshot = await db.forecastSnapshot.findFirst({
    where: { orgId },
    orderBy: { generatedAt: "desc" },
  });

  if (!snapshot) return null;

  const historical = snapshot.historicalData as unknown as MonthlyAggregate[];

  return {
    id: snapshot.id,
    generatedAt: snapshot.generatedAt,
    baseCurrency: snapshot.baseCurrency,
    historical,
    projections: snapshot.projections as unknown as ForecastMonth[],
    runRate: snapshot.revenueRunRate as unknown as RunRateMetrics,
    anomalies: (snapshot.anomalies as unknown as SpendingAnomaly[]) ?? [],
    readiness: summarizeForecastReadiness(historical),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function generateMonthKeys(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const current = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);

  while (current <= end) {
    keys.push(toMonthKey(current));
    current.setMonth(current.getMonth() + 1);
  }
  return keys;
}

function summarizeForecastReadiness(
  historical: MonthlyAggregate[]
): ForecastReadiness {
  const availableHistoryMonths = historical.filter(
    (month) => month.inflow > 0 || month.outflow > 0
  ).length;

  return {
    status:
      availableHistoryMonths >= MIN_FORECAST_HISTORY_MONTHS
        ? "ready"
        : "gathering_data",
    availableHistoryMonths,
    minimumHistoryMonths: MIN_FORECAST_HISTORY_MONTHS,
  };
}
