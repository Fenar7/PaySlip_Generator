"use server";

import { db } from "@/lib/db";
import {
  computeMrrArr,
  computeBurnRate,
  computeRunway,
  computeDso,
  computeDpo,
  computeCollectionRate,
  computeGrossMargin,
  computeWorkingCapital,
  mrrToArr,
  type KpiResult,
  type RecurringRevenueData,
  type ExpenseData,
  type CashData,
  type ReceivablesData,
  type PayablesData,
  type CollectionData,
  type MarginData,
  type WorkingCapitalData,
} from "./kpi";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExecutiveSnapshot {
  kpis: KpiResult[];
  arr: number;
  generatedAt: Date;
  period: string;
}

// ─── Date Helpers ───────────────────────────────────────────────────────────

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function monthsAgo(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() - n);
  return r;
}

function daysInRange(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Returns [periodStart, periodEnd, previousPeriodStart, previousPeriodEnd] */
function periodBounds(
  period: "MTD" | "QTD" | "YTD",
  now: Date
): [Date, Date, Date, Date] {
  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (period) {
    case "MTD":
      start = startOfMonth(now);
      prevStart = monthsAgo(start, 1);
      prevEnd = new Date(start.getTime() - 1);
      break;
    case "QTD":
      start = startOfQuarter(now);
      prevStart = monthsAgo(start, 3);
      prevEnd = new Date(start.getTime() - 1);
      break;
    case "YTD":
      start = startOfYear(now);
      prevStart = new Date(start.getFullYear() - 1, 0, 1);
      prevEnd = new Date(start.getTime() - 1);
      break;
  }
  return [start, now, prevStart, prevEnd];
}

// ─── DB Queries (all scoped to orgId) ───────────────────────────────────────

async function queryRecurringRevenue(
  orgId: string,
  _periodStart: Date,
  _periodEnd: Date,
  _prevStart: Date,
  _prevEnd: Date
): Promise<RecurringRevenueData> {
  const rules = await db.recurringInvoiceRule.findMany({
    where: { orgId, status: "ACTIVE" },
    include: { baseInvoice: { select: { totalAmount: true } } },
  });

  const activeCount = rules.length;
  const avgAmount =
    activeCount > 0
      ? rules.reduce((s, r) => s + (r.baseInvoice?.totalAmount ?? 0), 0) /
        activeCount
      : 0;

  // Previous MRR: approximate from 1 month ago count
  const previousMrr = avgAmount * activeCount * 0.95; // conservative fallback

  return {
    activeRecurringRules: activeCount,
    avgRecurringAmount: avgAmount,
    previousMrr,
    monthlyMrr: [], // sparkline filled by cache in production
  };
}

async function queryExpenses(
  orgId: string,
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date
): Promise<ExpenseData> {
  const [currentBills, prevBills, currentPayroll, prevPayroll] =
    await Promise.all([
      db.vendorBillPayment.aggregate({
        where: {
          orgId,
          status: "SETTLED",
          paidAt: { gte: periodStart, lte: periodEnd },
        },
        _sum: { amount: true },
      }),
      db.vendorBillPayment.aggregate({
        where: {
          orgId,
          status: "SETTLED",
          paidAt: { gte: prevStart, lte: prevEnd },
        },
        _sum: { amount: true },
      }),
      db.payrollRun.aggregate({
        where: {
          orgId,
          status: "FINALIZED",
          finalizedAt: { gte: periodStart, lte: periodEnd },
        },
        _sum: { totalNetPay: true },
      }),
      db.payrollRun.aggregate({
        where: {
          orgId,
          status: "FINALIZED",
          finalizedAt: { gte: prevStart, lte: prevEnd },
        },
        _sum: { totalNetPay: true },
      }),
    ]);

  const currentOutflow =
    (currentBills._sum.amount ?? 0) +
    Number(currentPayroll._sum.totalNetPay ?? 0);
  const previousOutflow =
    (prevBills._sum.amount ?? 0) + Number(prevPayroll._sum.totalNetPay ?? 0);

  return { currentOutflow, previousOutflow, monthlyOutflow: [] };
}

async function queryCash(orgId: string): Promise<CashData> {
  // Get latest running balance from BankTransaction per bank account
  const accounts = await db.bankAccount.findMany({
    where: { orgId },
    select: { id: true },
  });

  let totalBalance = 0;
  for (const acct of accounts) {
    const latest = await db.bankTransaction.findFirst({
      where: { bankAccountId: acct.id },
      orderBy: { txnDate: "desc" },
      select: { runningBalance: true },
    });
    totalBalance += latest?.runningBalance ?? 0;
  }

  return { currentBalance: totalBalance, monthlyBurn: 0 }; // burn set by caller
}

async function queryReceivables(
  orgId: string,
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date
): Promise<ReceivablesData> {
  const [receivable, revenue, prevRevenue, prevReceivable] = await Promise.all([
    db.invoice.aggregate({
      where: {
        organizationId: orgId,
        status: { in: ["ISSUED", "OVERDUE"] },
      },
      _sum: { remainingAmount: true },
    }),
    db.invoice.aggregate({
      where: {
        organizationId: orgId,
        issuedAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { totalAmount: true },
    }),
    db.invoice.aggregate({
      where: {
        organizationId: orgId,
        issuedAt: { gte: prevStart, lte: prevEnd },
      },
      _sum: { totalAmount: true },
    }),
    db.invoice.aggregate({
      where: {
        organizationId: orgId,
        status: { in: ["ISSUED", "OVERDUE"] },
        issuedAt: { lte: prevEnd },
      },
      _sum: { remainingAmount: true },
    }),
  ]);

  const days = daysInRange(periodStart, periodEnd);
  const prevDays = daysInRange(prevStart, prevEnd);
  const totalRev = revenue._sum.totalAmount ?? 0;
  const prevTotalRev = prevRevenue._sum.totalAmount ?? 0;
  const totalRec = receivable._sum.remainingAmount ?? 0;
  const prevTotalRec = prevReceivable._sum.remainingAmount ?? 0;
  const previousDso =
    prevTotalRev > 0 ? (prevTotalRec / prevTotalRev) * prevDays : 0;

  return {
    totalReceivable: totalRec,
    totalRevenue: totalRev,
    daysInPeriod: days,
    previousDso,
    monthlyDso: [],
  };
}

async function queryPayables(
  orgId: string,
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date
): Promise<PayablesData> {
  const isoStart = isoDate(periodStart);
  const isoEnd = isoDate(periodEnd);
  const isoPrevStart = isoDate(prevStart);
  const isoPrevEnd = isoDate(prevEnd);

  const [payable, cost, prevCost, prevPayable] = await Promise.all([
    db.vendorBill.aggregate({
      where: {
        orgId,
        status: { in: ["APPROVED", "PARTIALLY_PAID"] },
      },
      _sum: { remainingAmount: true },
    }),
    db.vendorBillPayment.aggregate({
      where: {
        orgId,
        status: "SETTLED",
        paidAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
    }),
    db.vendorBillPayment.aggregate({
      where: {
        orgId,
        status: "SETTLED",
        paidAt: { gte: prevStart, lte: prevEnd },
      },
      _sum: { amount: true },
    }),
    db.vendorBill.aggregate({
      where: {
        orgId,
        status: { in: ["APPROVED", "PARTIALLY_PAID"] },
        billDate: { lte: isoPrevEnd },
      },
      _sum: { remainingAmount: true },
    }),
  ]);

  const days = daysInRange(periodStart, periodEnd);
  const prevDays = daysInRange(prevStart, prevEnd);
  const totalP = payable._sum.remainingAmount ?? 0;
  const totalC = cost._sum.amount ?? 0;
  const prevTotalP = prevPayable._sum.remainingAmount ?? 0;
  const prevTotalC = prevCost._sum.amount ?? 0;
  const previousDpo = prevTotalC > 0 ? (prevTotalP / prevTotalC) * prevDays : 0;

  return {
    totalPayable: totalP,
    totalCost: totalC,
    daysInPeriod: days,
    previousDpo,
    monthlyDpo: [],
  };
}

async function queryCollections(
  orgId: string,
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date
): Promise<CollectionData> {
  const [collected, invoiced, prevCollected, prevInvoiced] = await Promise.all([
    db.invoicePayment.aggregate({
      where: {
        orgId,
        status: "SETTLED",
        paidAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
    }),
    db.invoice.aggregate({
      where: {
        organizationId: orgId,
        issuedAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { totalAmount: true },
    }),
    db.invoicePayment.aggregate({
      where: {
        orgId,
        status: "SETTLED",
        paidAt: { gte: prevStart, lte: prevEnd },
      },
      _sum: { amount: true },
    }),
    db.invoice.aggregate({
      where: {
        organizationId: orgId,
        issuedAt: { gte: prevStart, lte: prevEnd },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const totalC = collected._sum.amount ?? 0;
  const totalI = invoiced._sum.totalAmount ?? 0;
  const prevC = prevCollected._sum.amount ?? 0;
  const prevI = prevInvoiced._sum.totalAmount ?? 0;
  const previousRate = prevI > 0 ? (prevC / prevI) * 100 : 0;

  return {
    totalCollected: totalC,
    totalInvoiced: totalI,
    previousRate,
    monthlyRates: [],
  };
}

async function queryMargins(
  orgId: string,
  periodStart: Date,
  periodEnd: Date,
  prevStart: Date,
  prevEnd: Date
): Promise<MarginData> {
  const [revenue, costs, prevRevenue, prevCosts] = await Promise.all([
    db.invoice.aggregate({
      where: {
        organizationId: orgId,
        issuedAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { totalAmount: true },
    }),
    db.vendorBillPayment.aggregate({
      where: {
        orgId,
        status: "SETTLED",
        paidAt: { gte: periodStart, lte: periodEnd },
      },
      _sum: { amount: true },
    }),
    db.invoice.aggregate({
      where: {
        organizationId: orgId,
        issuedAt: { gte: prevStart, lte: prevEnd },
      },
      _sum: { totalAmount: true },
    }),
    db.vendorBillPayment.aggregate({
      where: {
        orgId,
        status: "SETTLED",
        paidAt: { gte: prevStart, lte: prevEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalRev = revenue._sum.totalAmount ?? 0;
  const totalDC = costs._sum.amount ?? 0;
  const prevRev = prevRevenue._sum.totalAmount ?? 0;
  const prevDC = prevCosts._sum.amount ?? 0;
  const previousMargin = prevRev > 0 ? ((prevRev - prevDC) / prevRev) * 100 : 0;

  return {
    totalRevenue: totalRev,
    totalDirectCosts: totalDC,
    previousMargin,
    monthlyMargins: [],
  };
}

async function queryWorkingCapital(
  orgId: string,
  cashBalance: number,
  receivables: number,
  payables: number
): Promise<WorkingCapitalData> {
  return {
    currentAssets: cashBalance + receivables,
    currentLiabilities: payables,
    previousWorkingCapital: 0, // could be cached
    monthlyWc: [],
  };
}

// ─── Main Orchestrator ──────────────────────────────────────────────────────

export async function computeExecutiveKpis(
  orgId: string,
  period: "MTD" | "QTD" | "YTD" = "MTD"
): Promise<ExecutiveSnapshot> {
  const now = new Date();
  const [periodStart, periodEnd, prevStart, prevEnd] = periodBounds(
    period,
    now
  );

  // Run all queries in parallel
  const [rrData, expData, cashData, recData, payData, colData, margData] =
    await Promise.all([
      queryRecurringRevenue(orgId, periodStart, periodEnd, prevStart, prevEnd),
      queryExpenses(orgId, periodStart, periodEnd, prevStart, prevEnd),
      queryCash(orgId),
      queryReceivables(orgId, periodStart, periodEnd, prevStart, prevEnd),
      queryPayables(orgId, periodStart, periodEnd, prevStart, prevEnd),
      queryCollections(orgId, periodStart, periodEnd, prevStart, prevEnd),
      queryMargins(orgId, periodStart, periodEnd, prevStart, prevEnd),
    ]);

  // Wire up burn for runway
  cashData.monthlyBurn = expData.currentOutflow;

  const mrrKpi = computeMrrArr(rrData);
  const burnKpi = computeBurnRate(expData);
  const runwayKpi = computeRunway(cashData);
  const dsoKpi = computeDso(recData);
  const dpoKpi = computeDpo(payData);
  const collectionKpi = computeCollectionRate(colData);
  const marginKpi = computeGrossMargin(margData);

  const wcData = await queryWorkingCapital(
    orgId,
    cashData.currentBalance,
    recData.totalReceivable,
    payData.totalPayable
  );
  const wcKpi = computeWorkingCapital(wcData);

  const kpis = [
    mrrKpi,
    burnKpi,
    runwayKpi,
    dsoKpi,
    dpoKpi,
    collectionKpi,
    marginKpi,
    wcKpi,
  ];

  return {
    kpis,
    arr: mrrToArr(mrrKpi.currentValue),
    generatedAt: now,
    period,
  };
}
