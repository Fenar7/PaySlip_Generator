"use strict";

/**
 * Executive KPI Engine — pure computation layer (no DB, no server-only).
 *
 * All monetary values are in the base currency's smallest sub-unit conceptually
 * (e.g. paise) but the DB stores Float, so callers should pass amounts as-is.
 * Every function uses safeDivide() to avoid NaN/Infinity when denominators are zero.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type KpiTrend = "UP" | "DOWN" | "FLAT";

export interface KpiResult {
  id: string;
  label: string;
  currentValue: number;
  previousValue: number;
  changePct: number; // positive = improvement (context-dependent)
  trend: KpiTrend;
  /** Whether the current trend direction is "good" for this KPI */
  trendIsPositive: boolean;
  unit: string;
  /** 6 historical data points for sparkline rendering */
  sparkline: number[];
}

// ─── Input types (caller provides from DB queries) ──────────────────────────

export interface RevenueData {
  /** Total revenue (invoices issued) in current period */
  currentRevenue: number;
  /** Total revenue in prior comparable period */
  previousRevenue: number;
  /** Monthly revenue totals (up to 6 months) for sparkline */
  monthlyRevenue: number[];
}

export interface RecurringRevenueData {
  /** Count of ACTIVE recurring invoice rules */
  activeRecurringRules: number;
  /** Average invoice amount across recurring rules */
  avgRecurringAmount: number;
  /** Prior period MRR for comparison */
  previousMrr: number;
  /** Monthly MRR totals for sparkline */
  monthlyMrr: number[];
}

export interface ExpenseData {
  /** Total cash outflow (vendor bill payments + payroll) in current period */
  currentOutflow: number;
  /** Prior period outflow */
  previousOutflow: number;
  /** Monthly outflows for sparkline */
  monthlyOutflow: number[];
}

export interface CashData {
  /** Current cash balance (sum of bank account balances / latest running balance) */
  currentBalance: number;
  /** Current monthly burn rate */
  monthlyBurn: number;
}

export interface ReceivablesData {
  /** Total accounts receivable (issued, unpaid invoices) */
  totalReceivable: number;
  /** Total revenue (invoices issued) in period */
  totalRevenue: number;
  /** Number of days in period */
  daysInPeriod: number;
  /** Previous period DSO for comparison */
  previousDso: number;
  /** Monthly DSO values for sparkline */
  monthlyDso: number[];
}

export interface PayablesData {
  /** Total accounts payable (open vendor bills) */
  totalPayable: number;
  /** Total cost of goods/services (vendor bill payments) in period */
  totalCost: number;
  /** Number of days in period */
  daysInPeriod: number;
  /** Previous period DPO */
  previousDpo: number;
  /** Monthly DPO values for sparkline */
  monthlyDpo: number[];
}

export interface CollectionData {
  /** Total amount collected (InvoicePayments SETTLED) in period */
  totalCollected: number;
  /** Total amount invoiced (Invoices issued) in period */
  totalInvoiced: number;
  /** Previous period collection rate */
  previousRate: number;
  /** Monthly collection rates for sparkline */
  monthlyRates: number[];
}

export interface MarginData {
  /** Total revenue in period */
  totalRevenue: number;
  /** Total direct costs (vendor bills) in period */
  totalDirectCosts: number;
  /** Previous period gross margin */
  previousMargin: number;
  /** Monthly gross margin pcts for sparkline */
  monthlyMargins: number[];
}

export interface WorkingCapitalData {
  /** Current assets (cash + receivables) */
  currentAssets: number;
  /** Current liabilities (payables) */
  currentLiabilities: number;
  /** Previous period working capital */
  previousWorkingCapital: number;
  /** Monthly working capital values for sparkline */
  monthlyWc: number[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Safe division returning 0 when denominator is zero or near-zero */
function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0 || !Number.isFinite(denominator)) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

function computeTrend(current: number, previous: number): KpiTrend {
  if (current > previous) return "UP";
  if (current < previous) return "DOWN";
  return "FLAT";
}

function computeChangePct(current: number, previous: number): number {
  return round2(safeDivide(current - previous, Math.abs(previous)) * 100);
}

function padSparkline(data: number[], length: number = 6): number[] {
  if (data.length >= length) return data.slice(-length);
  const pad = Array<number>(length - data.length).fill(0);
  return [...pad, ...data];
}

// ─── KPI Computation Functions ──────────────────────────────────────────────

/** 1. MRR/ARR — Monthly Recurring Revenue / Annual Recurring Revenue */
export function computeMrrArr(data: RecurringRevenueData): KpiResult {
  const mrr = round2(data.activeRecurringRules * data.avgRecurringAmount);
  const arr = round2(mrr * 12);
  const changePct = computeChangePct(mrr, data.previousMrr);
  const trend = computeTrend(mrr, data.previousMrr);

  return {
    id: "mrr-arr",
    label: "MRR / ARR",
    currentValue: mrr,
    previousValue: data.previousMrr,
    changePct,
    trend,
    trendIsPositive: trend === "UP" || trend === "FLAT",
    unit: "currency",
    sparkline: padSparkline(data.monthlyMrr),
  };
}

/** Extract ARR from an MRR result for display */
export function mrrToArr(mrr: number): number {
  return round2(mrr * 12);
}

/** 2. Burn Rate — Monthly cash outflow */
export function computeBurnRate(data: ExpenseData): KpiResult {
  const current = round2(data.currentOutflow);
  const previous = round2(data.previousOutflow);
  const changePct = computeChangePct(current, previous);
  const trend = computeTrend(current, previous);

  return {
    id: "burn-rate",
    label: "Burn Rate",
    currentValue: current,
    previousValue: previous,
    changePct,
    trend,
    // Lower burn is better
    trendIsPositive: trend === "DOWN" || trend === "FLAT",
    unit: "currency",
    sparkline: padSparkline(data.monthlyOutflow),
  };
}

/** 3. Runway — Months of cash remaining at current burn rate */
export function computeRunway(data: CashData): KpiResult {
  const months = round2(safeDivide(data.currentBalance, data.monthlyBurn));
  // No previous/sparkline data — caller can supply from cache
  return {
    id: "runway",
    label: "Runway",
    currentValue: months,
    previousValue: 0,
    changePct: 0,
    trend: months > 6 ? "UP" : months > 3 ? "FLAT" : "DOWN",
    trendIsPositive: months > 3,
    unit: "months",
    sparkline: padSparkline([months]),
  };
}

/** 4. DSO — Days Sales Outstanding */
export function computeDso(data: ReceivablesData): KpiResult {
  const dso = round2(
    safeDivide(data.totalReceivable, data.totalRevenue) * data.daysInPeriod
  );
  const changePct = computeChangePct(dso, data.previousDso);
  const trend = computeTrend(dso, data.previousDso);

  return {
    id: "dso",
    label: "Days Sales Outstanding",
    currentValue: dso,
    previousValue: data.previousDso,
    changePct,
    trend,
    // Lower DSO is better
    trendIsPositive: trend === "DOWN" || trend === "FLAT",
    unit: "days",
    sparkline: padSparkline(data.monthlyDso),
  };
}

/** 5. DPO — Days Payable Outstanding */
export function computeDpo(data: PayablesData): KpiResult {
  const dpo = round2(
    safeDivide(data.totalPayable, data.totalCost) * data.daysInPeriod
  );
  const changePct = computeChangePct(dpo, data.previousDpo);
  const trend = computeTrend(dpo, data.previousDpo);

  return {
    id: "dpo",
    label: "Days Payable Outstanding",
    currentValue: dpo,
    previousValue: data.previousDpo,
    changePct,
    trend,
    // Higher DPO = better cash retention (but context-dependent)
    trendIsPositive: trend === "UP" || trend === "FLAT",
    unit: "days",
    sparkline: padSparkline(data.monthlyDpo),
  };
}

/** 6. Collection Rate — % of invoiced amount collected */
export function computeCollectionRate(data: CollectionData): KpiResult {
  const rate = round2(safeDivide(data.totalCollected, data.totalInvoiced) * 100);
  const changePct = computeChangePct(rate, data.previousRate);
  const trend = computeTrend(rate, data.previousRate);

  return {
    id: "collection-rate",
    label: "Collection Rate",
    currentValue: rate,
    previousValue: data.previousRate,
    changePct,
    trend,
    trendIsPositive: trend === "UP" || trend === "FLAT",
    unit: "%",
    sparkline: padSparkline(data.monthlyRates),
  };
}

/** 7. Gross Margin — (Revenue - Direct Costs) / Revenue × 100 */
export function computeGrossMargin(data: MarginData): KpiResult {
  const margin = round2(
    safeDivide(data.totalRevenue - data.totalDirectCosts, data.totalRevenue) * 100
  );
  const changePct = computeChangePct(margin, data.previousMargin);
  const trend = computeTrend(margin, data.previousMargin);

  return {
    id: "gross-margin",
    label: "Gross Margin",
    currentValue: margin,
    previousValue: data.previousMargin,
    changePct,
    trend,
    trendIsPositive: trend === "UP" || trend === "FLAT",
    unit: "%",
    sparkline: padSparkline(data.monthlyMargins),
  };
}

/** 8. Working Capital — Current Assets - Current Liabilities */
export function computeWorkingCapital(data: WorkingCapitalData): KpiResult {
  const wc = round2(data.currentAssets - data.currentLiabilities);
  const changePct = computeChangePct(wc, data.previousWorkingCapital);
  const trend = computeTrend(wc, data.previousWorkingCapital);

  return {
    id: "working-capital",
    label: "Working Capital",
    currentValue: wc,
    previousValue: data.previousWorkingCapital,
    changePct,
    trend,
    trendIsPositive: trend === "UP" || trend === "FLAT",
    unit: "currency",
    sparkline: padSparkline(data.monthlyWc),
  };
}
