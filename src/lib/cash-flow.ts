import "server-only";

import { db } from "@/lib/db";
import { toAccountingNumber } from "@/lib/accounting/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CashFlowSnapshot {
  totalOutstanding: number;
  totalOverdue: number;
  expectedThisMonth: number;
  receivedThisMonth: number;
  dso: number;
}

export interface DSOResult {
  dso: number;
  previousDso: number;
  trend: "improving" | "worsening" | "stable";
}

export interface AgingBucket {
  label: string;
  count: number;
  total: number;
  percentage: number;
}

export interface CustomerHealthSummary {
  distribution: {
    excellent: number;
    good: number;
    fair: number;
    atRisk: number;
    critical: number;
  };
  topAtRisk: Array<{
    id: string;
    name: string;
    email: string | null;
    score: number;
    outstandingAmount: number;
  }>;
}

export interface MonthForecast {
  month: string;
  expectedInflow: number;
  estimatedCollection: number;
  arrangementsDue: number;
}

// ─── 1. Cash Flow Snapshot ──────────────────────────────────────────────────

export async function getCashFlowSnapshot(
  orgId: string,
): Promise<CashFlowSnapshot> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const firstStr = firstOfMonth.toISOString().split("T")[0];
  const lastStr = lastOfMonth.toISOString().split("T")[0];

  const [outstandingAgg, overdueAgg, expectedAgg, receivedAgg] =
    await Promise.all([
      // Total outstanding: remaining on non-PAID/non-CANCELLED invoices
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          status: { notIn: ["PAID", "CANCELLED", "DRAFT"] },
          archivedAt: null,
        },
        _sum: { remainingAmount: true },
      }),
      // Total overdue
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          status: "OVERDUE",
          archivedAt: null,
        },
        _sum: { remainingAmount: true },
      }),
      // Expected this month (invoices due this month, not yet paid)
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          dueDate: { gte: firstStr, lte: lastStr },
          status: { notIn: ["PAID", "CANCELLED", "DRAFT"] },
          archivedAt: null,
        },
        _sum: { remainingAmount: true },
      }),
      // Received this month (payments settled this month)
      db.invoicePayment.aggregate({
        where: {
          orgId,
          status: "SETTLED",
          paidAt: { gte: firstOfMonth, lte: now },
        },
        _sum: { amount: true },
      }),
    ]);

  const dsoResult = await calculateDSO(orgId);

  return {
    totalOutstanding: toAccountingNumber(outstandingAgg._sum.remainingAmount ?? 0),
    totalOverdue: toAccountingNumber(overdueAgg._sum.remainingAmount ?? 0),
    expectedThisMonth: toAccountingNumber(expectedAgg._sum.remainingAmount ?? 0),
    receivedThisMonth: toAccountingNumber(receivedAgg._sum.amount ?? 0),
    dso: dsoResult.dso,
  };
}

// ─── 2. DSO Calculation ─────────────────────────────────────────────────────

export async function calculateDSO(
  orgId: string,
  periodDays: number = 90,
): Promise<DSOResult> {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(
    periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000,
  );

  const [currentAR, currentSales, previousAR, previousSales] =
    await Promise.all([
      // Current AR: remaining on outstanding invoices from this period
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: periodStart },
          status: { notIn: ["PAID", "CANCELLED", "DRAFT"] },
          archivedAt: null,
        },
        _sum: { remainingAmount: true },
      }),
      // Total credit sales in this period
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: periodStart },
          status: { notIn: ["DRAFT"] },
          archivedAt: null,
        },
        _sum: { totalAmount: true },
      }),
      // Previous period AR
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: previousPeriodStart, lt: periodStart },
          status: { notIn: ["PAID", "CANCELLED", "DRAFT"] },
          archivedAt: null,
        },
        _sum: { remainingAmount: true },
      }),
      // Previous period sales
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: previousPeriodStart, lt: periodStart },
          status: { notIn: ["DRAFT"] },
          archivedAt: null,
        },
        _sum: { totalAmount: true },
      }),
    ]);

  const ar = toAccountingNumber(currentAR._sum.remainingAmount ?? 0);
  const sales = toAccountingNumber(currentSales._sum.totalAmount ?? 0);
  const dso = sales > 0 ? Math.round((ar / sales) * periodDays) : 0;

  const prevAr = toAccountingNumber(previousAR._sum.remainingAmount ?? 0);
  const prevSales = toAccountingNumber(previousSales._sum.totalAmount ?? 0);
  const previousDso =
    prevSales > 0 ? Math.round((prevAr / prevSales) * periodDays) : 0;

  const diff = dso - previousDso;
  const trend: DSOResult["trend"] =
    diff < -2 ? "improving" : diff > 2 ? "worsening" : "stable";

  return { dso, previousDso, trend };
}

// ─── 3. Aging Report ────────────────────────────────────────────────────────

export async function getAgingReport(orgId: string): Promise<AgingBucket[]> {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const invoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { notIn: ["PAID", "CANCELLED", "DRAFT"] },
      archivedAt: null,
    },
    select: {
      dueDate: true,
      remainingAmount: true,
    },
  });

  const buckets = [
    { label: "Current", min: -Infinity, max: 0, count: 0, total: 0 },
    { label: "1–30 days", min: 1, max: 30, count: 0, total: 0 },
    { label: "31–60 days", min: 31, max: 60, count: 0, total: 0 },
    { label: "61–90 days", min: 61, max: 90, count: 0, total: 0 },
    { label: "90+ days", min: 91, max: Infinity, count: 0, total: 0 },
  ];

  const todayMs = new Date(today).getTime();

  for (const inv of invoices) {
    if (!inv.dueDate) {
      // No due date → treat as current
      buckets[0].count++;
      buckets[0].total += toAccountingNumber(inv.remainingAmount);
      continue;
    }

    const dueDateMs = new Date(inv.dueDate).getTime();
    const daysOverdue = Math.floor((todayMs - dueDateMs) / (1000 * 60 * 60 * 24));

    const bucket = buckets.find(
      (b) => daysOverdue >= b.min && daysOverdue <= b.max,
    );
    if (bucket) {
      bucket.count++;
      bucket.total += toAccountingNumber(inv.remainingAmount);
    }
  }

  const totalAR = buckets.reduce((sum, b) => sum + b.total, 0);

  return buckets.map((b) => ({
    label: b.label,
    count: b.count,
    total: Math.round(b.total * 100) / 100,
    percentage: totalAR > 0 ? Math.round((b.total / totalAR) * 1000) / 10 : 0,
  }));
}

// ─── 4. Customer Health Summary ─────────────────────────────────────────────

export async function getCustomerHealthSummary(
  orgId: string,
): Promise<CustomerHealthSummary> {
  const customers = await db.customer.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      email: true,
      paymentHealthScore: true,
    },
  });

  const distribution = { excellent: 0, good: 0, fair: 0, atRisk: 0, critical: 0 };

  for (const c of customers) {
    const s = c.paymentHealthScore;
    if (s >= 80) distribution.excellent++;
    else if (s >= 60) distribution.good++;
    else if (s >= 40) distribution.fair++;
    else if (s >= 20) distribution.atRisk++;
    else distribution.critical++;
  }

  // Top 5 at-risk: lowest scores
  const atRiskCustomers = customers
    .filter((c) => c.paymentHealthScore < 40)
    .sort((a, b) => a.paymentHealthScore - b.paymentHealthScore)
    .slice(0, 5);

  // Fetch outstanding amounts for at-risk customers
  const topAtRisk = await Promise.all(
    atRiskCustomers.map(async (c) => {
      const outstanding = await db.invoice.aggregate({
        where: {
          organizationId: orgId,
          customerId: c.id,
          status: { notIn: ["PAID", "CANCELLED", "DRAFT"] },
          archivedAt: null,
        },
        _sum: { remainingAmount: true },
      });

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        score: c.paymentHealthScore,
        outstandingAmount: toAccountingNumber(outstanding._sum.remainingAmount ?? 0),
      };
    }),
  );

  return { distribution, topAtRisk };
}

// ─── 5. Cash Flow Forecast ──────────────────────────────────────────────────

export async function getCashFlowForecast(
  orgId: string,
  months: number = 3,
): Promise<MonthForecast[]> {
  const now = new Date();

  // Calculate historical collection rate from last 6 months
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const [totalInvoiced, totalCollected] = await Promise.all([
    db.invoice.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: sixMonthsAgo },
        status: { notIn: ["DRAFT"] },
        archivedAt: null,
      },
      _sum: { totalAmount: true },
    }),
    db.invoicePayment.aggregate({
      where: {
        orgId,
        status: "SETTLED",
        paidAt: { gte: sixMonthsAgo },
      },
      _sum: { amount: true },
    }),
  ]);

  const invoicedAmount = toAccountingNumber(totalInvoiced._sum.totalAmount ?? 0);
  const collectedAmount = toAccountingNumber(totalCollected._sum.amount ?? 0);
  const collectionRate =
    invoicedAmount > 0
      ? Math.min(collectedAmount / invoicedAmount, 1)
      : 0.85; // default 85% if no history

  const forecasts: MonthForecast[] = [];

  for (let i = 1; i <= months; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const monthEndStr = monthEnd.toISOString().split("T")[0];

    const monthLabel = monthStart.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });

    const [invoiceDue, arrangementInstallments] = await Promise.all([
      // Invoices due in this month
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          dueDate: { gte: monthStartStr, lte: monthEndStr },
          status: { notIn: ["PAID", "CANCELLED", "DRAFT"] },
          archivedAt: null,
        },
        _sum: { remainingAmount: true },
      }),
      // Arrangement installments due this month
      db.paymentInstallment.aggregate({
        where: {
          arrangement: { orgId },
          dueDate: { gte: monthStart, lte: monthEnd },
          status: { in: ["PENDING", "OVERDUE"] },
        },
        _sum: { amount: true },
      }),
    ]);

    const expectedInflow = toAccountingNumber(invoiceDue._sum.remainingAmount ?? 0);
    const arrangementsDue = toAccountingNumber(arrangementInstallments._sum.amount ?? 0);

    forecasts.push({
      month: monthLabel,
      expectedInflow: Math.round(expectedInflow * 100) / 100,
      estimatedCollection:
        Math.round(expectedInflow * collectionRate * 100) / 100,
      arrangementsDue: Math.round(arrangementsDue * 100) / 100,
    });
  }

  return forecasts;
}
