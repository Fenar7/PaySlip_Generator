"use strict";

// ─── Types ──────────────────────────────────────────────────────────────────

export type RecommendedAction =
  | "PAY_NOW_DISCOUNT"
  | "PAY_BY_DUE"
  | "DEFER"
  | "PARTIAL";

export interface BillInput {
  vendorBillId: string;
  vendorName: string;
  amountDue: number;
  dueDate: string; // ISO date string
  discountPct: number; // e.g. 2 means 2%
  discountDeadline: string | null; // ISO date string
}

export interface BillPaymentRecommendation {
  vendorBillId: string;
  vendorName: string;
  amountDue: number;
  discountAmount: number;
  discountDeadline: string | null;
  dueDate: string;
  recommendedAction: RecommendedAction;
  recommendedPayDate: string;
  savingsIfFollowed: number;
  reasoning: string;
}

export interface PaymentOptimizationPlan {
  orgId: string;
  generatedAt: Date;
  currentBalance: number;
  projectedInflows30d: number;
  liquidityTarget: number;
  recommendations: BillPaymentRecommendation[];
  totalDiscountCapturable: number;
  totalDiscountRecommended: number;
  discountCaptureRate: number; // 0..100
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseDate(s: string): Date {
  return new Date(s);
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isBefore(a: string, b: string): boolean {
  return a < b;
}

function isBeforeOrEqual(a: string, b: string): boolean {
  return a <= b;
}

// ─── Greedy Discount-Capture with Liquidity Constraint ──────────────────────

export function computeOptimizationPlan(
  orgId: string,
  bills: BillInput[],
  currentBalance: number,
  projectedInflows30d: number,
  liquidityTarget: number,
  today: Date = new Date()
): PaymentOptimizationPlan {
  const todayStr = toISODate(today);

  // Separate discount-eligible from non-discount bills
  const discountBills: BillInput[] = [];
  const nonDiscountBills: BillInput[] = [];

  for (const bill of bills) {
    if (
      bill.discountPct > 0 &&
      bill.discountDeadline &&
      isBefore(todayStr, bill.discountDeadline)
    ) {
      discountBills.push(bill);
    } else {
      nonDiscountBills.push(bill);
    }
  }

  // Sort discount bills by absolute discount value descending (greedy)
  discountBills.sort((a, b) => {
    const aDiscount = a.amountDue * (a.discountPct / 100);
    const bDiscount = b.amountDue * (b.discountPct / 100);
    return bDiscount - aDiscount;
  });

  // Sort non-discount bills by due date ascending (pay soonest first)
  nonDiscountBills.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  let availableFunds = currentBalance + projectedInflows30d - liquidityTarget;
  const recommendations: BillPaymentRecommendation[] = [];
  let totalDiscountCapturable = 0;
  let totalDiscountRecommended = 0;

  // Phase 1: process discount-eligible bills
  for (const bill of discountBills) {
    const discountAmount = round2(bill.amountDue * (bill.discountPct / 100));
    const discountedAmount = round2(bill.amountDue - discountAmount);
    totalDiscountCapturable += discountAmount;

    if (discountedAmount <= availableFunds) {
      recommendations.push({
        vendorBillId: bill.vendorBillId,
        vendorName: bill.vendorName,
        amountDue: bill.amountDue,
        discountAmount,
        discountDeadline: bill.discountDeadline,
        dueDate: bill.dueDate,
        recommendedAction: "PAY_NOW_DISCOUNT",
        recommendedPayDate: todayStr,
        savingsIfFollowed: discountAmount,
        reasoning: `Pay now to capture ${bill.discountPct}% early-payment discount (save ₹${discountAmount.toFixed(2)}).`,
      });
      availableFunds -= discountedAmount;
      totalDiscountRecommended += discountAmount;
    } else if (bill.amountDue <= availableFunds + liquidityTarget) {
      // Can pay full amount by due date (no discount capture)
      recommendations.push({
        vendorBillId: bill.vendorBillId,
        vendorName: bill.vendorName,
        amountDue: bill.amountDue,
        discountAmount,
        discountDeadline: bill.discountDeadline,
        dueDate: bill.dueDate,
        recommendedAction: "PAY_BY_DUE",
        recommendedPayDate: bill.dueDate,
        savingsIfFollowed: 0,
        reasoning: `Insufficient liquidity for early payment discount. Pay by due date.`,
      });
    } else {
      recommendations.push({
        vendorBillId: bill.vendorBillId,
        vendorName: bill.vendorName,
        amountDue: bill.amountDue,
        discountAmount,
        discountDeadline: bill.discountDeadline,
        dueDate: bill.dueDate,
        recommendedAction: "DEFER",
        recommendedPayDate: bill.dueDate,
        savingsIfFollowed: 0,
        reasoning: `Insufficient funds. Defer payment and consider partial payment or negotiating terms.`,
      });
    }
  }

  // Phase 2: process non-discount bills
  for (const bill of nonDiscountBills) {
    if (bill.amountDue <= availableFunds) {
      recommendations.push({
        vendorBillId: bill.vendorBillId,
        vendorName: bill.vendorName,
        amountDue: bill.amountDue,
        discountAmount: 0,
        discountDeadline: null,
        dueDate: bill.dueDate,
        recommendedAction: "PAY_BY_DUE",
        recommendedPayDate: bill.dueDate,
        savingsIfFollowed: 0,
        reasoning: `No discount terms. Pay by due date to maintain vendor relationship.`,
      });
      availableFunds -= bill.amountDue;
    } else if (availableFunds > 0) {
      recommendations.push({
        vendorBillId: bill.vendorBillId,
        vendorName: bill.vendorName,
        amountDue: bill.amountDue,
        discountAmount: 0,
        discountDeadline: null,
        dueDate: bill.dueDate,
        recommendedAction: "PARTIAL",
        recommendedPayDate: bill.dueDate,
        savingsIfFollowed: 0,
        reasoning: `Only ₹${round2(availableFunds).toFixed(2)} available. Consider partial payment.`,
      });
    } else {
      recommendations.push({
        vendorBillId: bill.vendorBillId,
        vendorName: bill.vendorName,
        amountDue: bill.amountDue,
        discountAmount: 0,
        discountDeadline: null,
        dueDate: bill.dueDate,
        recommendedAction: "DEFER",
        recommendedPayDate: bill.dueDate,
        savingsIfFollowed: 0,
        reasoning: `Insufficient funds. Defer payment.`,
      });
    }
  }

  const discountCaptureRate =
    totalDiscountCapturable > 0
      ? round2((totalDiscountRecommended / totalDiscountCapturable) * 100)
      : 0;

  return {
    orgId,
    generatedAt: today,
    currentBalance,
    projectedInflows30d,
    liquidityTarget,
    recommendations,
    totalDiscountCapturable: round2(totalDiscountCapturable),
    totalDiscountRecommended: round2(totalDiscountRecommended),
    discountCaptureRate,
  };
}

// ─── Customer Behavior Scoring ──────────────────────────────────────────────

export type BehaviorClassification =
  | "RELIABLE"
  | "MODERATE"
  | "AT_RISK"
  | "CHRONIC";

export interface CustomerPaymentHistory {
  customerId: string;
  customerName: string;
  invoices: Array<{
    invoiceId: string;
    issuedAt: Date;
    paidAt: Date | null;
    totalAmount: number;
    daysToPayTerms: number; // credit period in days
  }>;
  reminders: Array<{
    sentAt: Date;
    paymentWithin3Days: boolean;
    wasEscalation: boolean;
    paymentAfterEscalation: boolean;
  }>;
}

export interface CustomerBehaviorScore {
  customerId: string;
  customerName: string;
  score: number; // 0..1
  classification: BehaviorClassification;
  paymentVelocity: number; // median days-to-pay
  consistencyScore: number;
  responseToReminders: number;
  escalationSensitivity: number;
  invoiceCount: number;
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function stddev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  const variance = vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length;
  return Math.sqrt(variance);
}

function normalize01LowerIsBetter(value: number, maxExpected: number): number {
  if (maxExpected <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - value / maxExpected));
}

function classify(score: number): BehaviorClassification {
  if (score > 0.8) return "RELIABLE";
  if (score >= 0.5) return "MODERATE";
  if (score >= 0.2) return "AT_RISK";
  return "CHRONIC";
}

export function computeBehaviorScore(
  history: CustomerPaymentHistory,
  maxExpectedDays: number = 90
): CustomerBehaviorScore {
  const paidInvoices = history.invoices.filter((i) => i.paidAt !== null);
  if (paidInvoices.length === 0) {
    return {
      customerId: history.customerId,
      customerName: history.customerName,
      score: 0,
      classification: "CHRONIC",
      paymentVelocity: 0,
      consistencyScore: 0,
      responseToReminders: 0,
      escalationSensitivity: 0,
      invoiceCount: history.invoices.length,
    };
  }

  const daysToPay = paidInvoices
    .map((inv) => {
      const issued = inv.issuedAt.getTime();
      const paid = inv.paidAt!.getTime();
      return Math.max(0, Math.round((paid - issued) / 86400000));
    })
    .sort((a, b) => a - b);

  const paymentVelocity = median(daysToPay);
  const m = mean(daysToPay);
  const sd = stddev(daysToPay);
  const consistencyScore = m > 0 ? Math.max(0, Math.min(1, 1 - sd / m)) : 1;

  const responseToReminders =
    history.reminders.length > 0
      ? history.reminders.filter((r) => r.paymentWithin3Days).length /
        history.reminders.length
      : 0.5; // neutral if no reminders sent

  const escalations = history.reminders.filter((r) => r.wasEscalation);
  const escalationSensitivity =
    escalations.length > 0
      ? escalations.filter((r) => r.paymentAfterEscalation).length /
        escalations.length
      : 0.5; // neutral if no escalations

  const velocityNormalized = normalize01LowerIsBetter(
    paymentVelocity,
    maxExpectedDays
  );
  const score = round2(
    0.3 * velocityNormalized +
      0.3 * consistencyScore +
      0.2 * responseToReminders +
      0.2 * escalationSensitivity
  );

  return {
    customerId: history.customerId,
    customerName: history.customerName,
    score: Math.max(0, Math.min(1, score)),
    classification: classify(score),
    paymentVelocity,
    consistencyScore: round2(consistencyScore),
    responseToReminders: round2(responseToReminders),
    escalationSensitivity: round2(escalationSensitivity),
    invoiceCount: history.invoices.length,
  };
}

// ─── DSO Computation ────────────────────────────────────────────────────────

export interface DSOResult {
  dso: number;
  accountsReceivable: number;
  revenueInPeriod: number;
  daysInPeriod: number;
}

export function computeDSO(
  accountsReceivable: number,
  revenueInPeriod: number,
  daysInPeriod: number
): DSOResult {
  if (revenueInPeriod <= 0) {
    return { dso: 0, accountsReceivable, revenueInPeriod, daysInPeriod };
  }
  const dso = round2((accountsReceivable / revenueInPeriod) * daysInPeriod);
  return { dso, accountsReceivable, revenueInPeriod, daysInPeriod };
}

// ─── Dunning Interval Adjustment ────────────────────────────────────────────

export function adjustDunningInterval(
  baseIntervalDays: number,
  classification: BehaviorClassification
): number {
  switch (classification) {
    case "RELIABLE":
      return Math.round(baseIntervalDays * 1.5);
    case "MODERATE":
      return baseIntervalDays;
    case "AT_RISK":
      return Math.round(baseIntervalDays * 0.75);
    case "CHRONIC":
      return Math.max(1, Math.round(baseIntervalDays * 0.25));
  }
}

// ─── Cash-Flow Alert Evaluation ─────────────────────────────────────────────

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM";
export type CashFlowAlertType =
  | "CASH_BELOW_TARGET"
  | "FORECAST_DEVIATION"
  | "LARGE_OUTFLOW_PENDING"
  | "DISCOUNT_EXPIRING"
  | "DSO_SPIKE"
  | "COLLECTION_STALL";

export interface CashFlowAlert {
  type: CashFlowAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}

export interface AlertInputs {
  currentBalance: number;
  liquidityTarget: number;
  actualInflow30d: number;
  forecastedInflow30d: number;
  bills: Array<{
    vendorBillId: string;
    vendorName: string;
    totalAmount: number;
    dueDate: string;
    discountDeadline: string | null;
    discountPct: number;
  }>;
  dsoCurrent: number;
  dsoPriorMonth: number;
  daysSinceLastPaymentReceived: number;
  // thresholds (from CashFlowAlertConfig, with defaults)
  forecastDeviationPct?: number; // default 20
  largeOutflowPct?: number; // default 20
  discountExpiryHours?: number; // default 48
  dsoSpikePct?: number; // default 15
  collectionStallDays?: number; // default 7
}

export function evaluateAlerts(
  inputs: AlertInputs,
  today: Date = new Date()
): CashFlowAlert[] {
  const alerts: CashFlowAlert[] = [];
  const todayMs = today.getTime();
  const forecastDeviationPct = inputs.forecastDeviationPct ?? 20;
  const largeOutflowPct = inputs.largeOutflowPct ?? 20;
  const discountExpiryHours = inputs.discountExpiryHours ?? 48;
  const dsoSpikePct = inputs.dsoSpikePct ?? 15;
  const collectionStallDays = inputs.collectionStallDays ?? 7;

  // 1. CASH_BELOW_TARGET
  if (inputs.currentBalance < inputs.liquidityTarget) {
    alerts.push({
      type: "CASH_BELOW_TARGET",
      severity: "CRITICAL",
      title: "Cash below liquidity target",
      message: `Current balance (₹${inputs.currentBalance.toFixed(2)}) is below the target (₹${inputs.liquidityTarget.toFixed(2)}).`,
      metadata: {
        currentBalance: inputs.currentBalance,
        liquidityTarget: inputs.liquidityTarget,
        shortfall: round2(
          inputs.liquidityTarget - inputs.currentBalance
        ),
      },
    });
  }

  // 2. FORECAST_DEVIATION
  if (
    inputs.forecastedInflow30d > 0 &&
    inputs.actualInflow30d <
      inputs.forecastedInflow30d * (1 - forecastDeviationPct / 100)
  ) {
    const deviationPct = round2(
      ((inputs.forecastedInflow30d - inputs.actualInflow30d) /
        inputs.forecastedInflow30d) *
        100
    );
    alerts.push({
      type: "FORECAST_DEVIATION",
      severity: "HIGH",
      title: "Inflow below forecast",
      message: `Actual inflow is ${deviationPct}% below the 30-day forecast.`,
      metadata: {
        actual: inputs.actualInflow30d,
        forecast: inputs.forecastedInflow30d,
        deviationPct,
      },
    });
  }

  // 3. LARGE_OUTFLOW_PENDING
  const sevenDaysMs = 7 * 86400000;
  for (const bill of inputs.bills) {
    const dueDateMs = parseDate(bill.dueDate).getTime();
    if (
      dueDateMs - todayMs <= sevenDaysMs &&
      dueDateMs >= todayMs &&
      inputs.currentBalance > 0 &&
      bill.totalAmount > inputs.currentBalance * (largeOutflowPct / 100)
    ) {
      alerts.push({
        type: "LARGE_OUTFLOW_PENDING",
        severity: "HIGH",
        title: `Large bill due soon: ${bill.vendorName}`,
        message: `₹${bill.totalAmount.toFixed(2)} due on ${bill.dueDate} exceeds ${largeOutflowPct}% of current balance.`,
        metadata: {
          vendorBillId: bill.vendorBillId,
          vendorName: bill.vendorName,
          amount: bill.totalAmount,
          dueDate: bill.dueDate,
          pctOfBalance: round2(
            (bill.totalAmount / inputs.currentBalance) * 100
          ),
        },
      });
    }
  }

  // 4. DISCOUNT_EXPIRING
  const expiryThresholdMs = discountExpiryHours * 3600000;
  for (const bill of inputs.bills) {
    if (
      bill.discountPct > 0 &&
      bill.discountDeadline
    ) {
      const deadlineMs = parseDate(bill.discountDeadline).getTime();
      if (deadlineMs > todayMs && deadlineMs - todayMs <= expiryThresholdMs) {
        const saveable = round2(bill.totalAmount * (bill.discountPct / 100));
        alerts.push({
          type: "DISCOUNT_EXPIRING",
          severity: "MEDIUM",
          title: `Discount expiring: ${bill.vendorName}`,
          message: `${bill.discountPct}% discount (₹${saveable.toFixed(2)}) expires on ${bill.discountDeadline}.`,
          metadata: {
            vendorBillId: bill.vendorBillId,
            vendorName: bill.vendorName,
            discountPct: bill.discountPct,
            saveable,
            deadline: bill.discountDeadline,
          },
        });
      }
    }
  }

  // 5. DSO_SPIKE
  if (
    inputs.dsoPriorMonth > 0 &&
    inputs.dsoCurrent >
      inputs.dsoPriorMonth * (1 + dsoSpikePct / 100)
  ) {
    const spikePct = round2(
      ((inputs.dsoCurrent - inputs.dsoPriorMonth) / inputs.dsoPriorMonth) * 100
    );
    alerts.push({
      type: "DSO_SPIKE",
      severity: "MEDIUM",
      title: "DSO spike detected",
      message: `Days Sales Outstanding increased ${spikePct}% (from ${inputs.dsoPriorMonth} to ${inputs.dsoCurrent}).`,
      metadata: {
        dsoCurrent: inputs.dsoCurrent,
        dsoPrior: inputs.dsoPriorMonth,
        spikePct,
      },
    });
  }

  // 6. COLLECTION_STALL
  if (inputs.daysSinceLastPaymentReceived >= collectionStallDays) {
    alerts.push({
      type: "COLLECTION_STALL",
      severity: "MEDIUM",
      title: "Collection stall",
      message: `No payments received in ${inputs.daysSinceLastPaymentReceived} days.`,
      metadata: {
        daysSinceLastPayment: inputs.daysSinceLastPaymentReceived,
        threshold: collectionStallDays,
      },
    });
  }

  return alerts;
}
