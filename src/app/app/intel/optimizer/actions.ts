"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { logAudit } from "@/lib/audit";
import {
  computeOptimizationPlan,
  computeBehaviorScore,
  computeDSO,
  evaluateAlerts,
  type BillInput,
  type PaymentOptimizationPlan,
  type CustomerBehaviorScore,
  type DSOResult,
  type CashFlowAlert,
  type CustomerPaymentHistory,
} from "@/lib/intel/optimizer";
import { Prisma } from "@/generated/prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Generate Payment Optimization Plan ─────────────────────────────────────

export async function generateOptimizationPlanAction(): Promise<
  ActionResult<PaymentOptimizationPlan>
> {
  const { orgId, userId } = await requireRole("admin");
  await checkFeature(orgId, "cashFlowOptimizer");

  // Fetch unpaid vendor bills
  const bills = await db.vendorBill.findMany({
    where: {
      orgId,
      status: { in: ["APPROVED", "PARTIALLY_PAID"] },
      archivedAt: null,
    },
    include: { vendor: true },
  });

  const billInputs: BillInput[] = bills.map((b) => ({
    vendorBillId: b.id,
    vendorName: b.vendor?.name ?? "Unknown Vendor",
    amountDue: b.remainingAmount,
    dueDate: b.dueDate ?? "2099-12-31",
    discountPct: 0,
    discountDeadline: null,
  }));

  // Get current balance from latest bank transaction or fallback to 0
  const latestTxn = await db.bankTransaction.findFirst({
    where: { orgId },
    orderBy: { txnDate: "desc" },
  });
  const currentBalance = latestTxn?.runningBalance ?? 0;

  // Get projected inflows from latest forecast snapshot
  const latestForecast = await db.forecastSnapshot.findFirst({
    where: { orgId },
    orderBy: { generatedAt: "desc" },
  });
  let projectedInflows30d = 0;
  if (latestForecast?.projections) {
    const projections = latestForecast.projections as Array<{
      inflow?: number;
      netCashFlow?: number;
    }>;
    if (projections.length > 0) {
      projectedInflows30d = projections[0]?.inflow ?? projections[0]?.netCashFlow ?? 0;
    }
  }

  // Get liquidity target from alert config or default to 20% of monthly outflow EMA
  const alertConfig = await db.cashFlowAlertConfig.findUnique({
    where: { orgId },
  });
  const liquidityTargetPct = alertConfig?.liquidityTargetPct ?? 20;

  // Compute monthly outflow as sum of recent vendor bill payments
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentOutflow = await db.vendorBillPayment.aggregate({
    where: {
      orgId,
      status: "SETTLED",
      paidAt: { gte: thirtyDaysAgo },
    },
    _sum: { amount: true },
  });
  const monthlyOutflow = recentOutflow._sum.amount ?? 0;
  const liquidityTarget = (Number(monthlyOutflow) * liquidityTargetPct) / 100;

  const plan = computeOptimizationPlan(
    orgId,
    billInputs,
    currentBalance,
    Math.max(0, projectedInflows30d),
    liquidityTarget
  );

  // Persist the run
  await db.paymentOptimizationRun.create({
    data: {
      orgId,
      currentBalance: new Prisma.Decimal(plan.currentBalance),
      projectedInflows30d: new Prisma.Decimal(plan.projectedInflows30d),
      liquidityTarget: new Prisma.Decimal(plan.liquidityTarget),
      totalDiscountCapturable: new Prisma.Decimal(plan.totalDiscountCapturable),
      totalDiscountRecommended: new Prisma.Decimal(
        plan.totalDiscountRecommended
      ),
      discountCaptureRate: plan.discountCaptureRate,
      recommendations:
        plan.recommendations as unknown as Prisma.InputJsonValue,
    },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "OPTIMIZER_RUN_GENERATED",
    entityType: "PaymentOptimizationRun",
    entityId: orgId,
    metadata: {
      billCount: billInputs.length,
      discountCaptureRate: plan.discountCaptureRate,
    },
  });

  return { success: true, data: plan };
}

// ─── Get Customer Behavior Scores ───────────────────────────────────────────

export async function getCustomerBehaviorScoresAction(): Promise<
  ActionResult<CustomerBehaviorScore[]>
> {
  const { orgId } = await requireRole("admin");
  await checkFeature(orgId, "cashFlowOptimizer");

  // Get all customers with their invoices and payments
  const customers = await db.customer.findMany({
    where: { organizationId: orgId },
    include: {
      invoices: {
        where: {
          status: { in: ["ISSUED", "OVERDUE", "PAID"] },
        },
        include: {
          payments: { where: { status: "SETTLED" } },
          dunningLogs: true,
        },
      },
    },
  });

  const scores: CustomerBehaviorScore[] = [];

  for (const customer of customers) {
    if (customer.invoices.length === 0) continue;

    const invoices = customer.invoices.map((inv) => {
      const firstPayment = inv.payments[0];
      return {
        invoiceId: inv.id,
        issuedAt: inv.issuedAt ?? inv.createdAt,
        paidAt: firstPayment?.paidAt ?? null,
        totalAmount: inv.totalAmount,
        daysToPayTerms: 30,
      };
    });

    const reminders = customer.invoices.flatMap((inv) =>
      inv.dunningLogs
        .filter((log) => log.sentAt !== null)
        .map((log) => {
          const logDate = log.sentAt!;
          const paymentWithin3Days = inv.payments.some((p) => {
            const diff = p.paidAt.getTime() - logDate.getTime();
            return diff >= 0 && diff <= 3 * 86400000;
          });
          const isEscalation = log.stepNumber >= 3;
          return {
            sentAt: logDate,
            paymentWithin3Days,
            wasEscalation: isEscalation,
            paymentAfterEscalation:
              isEscalation &&
              inv.payments.some((p) => p.paidAt > logDate),
          };
        })
    );

    const history: CustomerPaymentHistory = {
      customerId: customer.id,
      customerName: customer.name,
      invoices,
      reminders,
    };

    scores.push(computeBehaviorScore(history));
  }

  scores.sort((a, b) => a.score - b.score);
  return { success: true, data: scores };
}

// ─── Get DSO ────────────────────────────────────────────────────────────────

export async function getDSOAction(): Promise<ActionResult<DSOResult>> {
  const { orgId } = await requireRole("admin");
  await checkFeature(orgId, "cashFlowOptimizer");

  // Accounts receivable: sum of remaining amounts on ISSUED/OVERDUE invoices
  const arResult = await db.invoice.aggregate({
    where: {
      organizationId: orgId,
      status: { in: ["ISSUED", "OVERDUE"] },
      archivedAt: null,
    },
    _sum: { remainingAmount: true },
  });
  const accountsReceivable = arResult._sum.remainingAmount ?? 0;

  // Revenue in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const revenueResult = await db.invoicePayment.aggregate({
    where: {
      orgId,
      status: "SETTLED",
      paidAt: { gte: thirtyDaysAgo },
    },
    _sum: { amount: true },
  });
  const revenueInPeriod = revenueResult._sum.amount ?? 0;

  return {
    success: true,
    data: computeDSO(accountsReceivable, revenueInPeriod, 30),
  };
}

// ─── Evaluate Cash-Flow Alerts ──────────────────────────────────────────────

export async function evaluateCashFlowAlertsAction(): Promise<
  ActionResult<CashFlowAlert[]>
> {
  const { orgId } = await requireRole("admin");
  await checkFeature(orgId, "cashFlowOptimizer");

  // Current balance
  const latestTxn = await db.bankTransaction.findFirst({
    where: { orgId },
    orderBy: { txnDate: "desc" },
  });
  const currentBalance = latestTxn?.runningBalance ?? 0;

  // Monthly outflow for liquidity target
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentOutflow = await db.vendorBillPayment.aggregate({
    where: { orgId, status: "SETTLED", paidAt: { gte: thirtyDaysAgo } },
    _sum: { amount: true },
  });
  const monthlyOutflow = Number(recentOutflow._sum.amount ?? 0);

  const alertConfig = await db.cashFlowAlertConfig.findUnique({
    where: { orgId },
  });
  const liquidityTargetPct = alertConfig?.liquidityTargetPct ?? 20;
  const liquidityTarget = (monthlyOutflow * liquidityTargetPct) / 100;

  // Actual inflow last 30 days
  const inflowResult = await db.invoicePayment.aggregate({
    where: { orgId, status: "SETTLED", paidAt: { gte: thirtyDaysAgo } },
    _sum: { amount: true },
  });
  const actualInflow30d = inflowResult._sum.amount ?? 0;

  // Forecasted inflow
  const latestForecast = await db.forecastSnapshot.findFirst({
    where: { orgId },
    orderBy: { generatedAt: "desc" },
  });
  let forecastedInflow30d = 0;
  if (latestForecast?.projections) {
    const projections = latestForecast.projections as Array<{
      inflow?: number;
      netCashFlow?: number;
    }>;
    if (projections.length > 0) {
      forecastedInflow30d = Math.max(0, projections[0]?.inflow ?? projections[0]?.netCashFlow ?? 0);
    }
  }

  // Unpaid bills for large-outflow & discount checks
  const unpaidBills = await db.vendorBill.findMany({
    where: {
      orgId,
      status: { in: ["APPROVED", "PARTIALLY_PAID"] },
      archivedAt: null,
    },
    include: { vendor: true },
  });
  const bills = unpaidBills.map((b) => ({
    vendorBillId: b.id,
    vendorName: b.vendor?.name ?? "Unknown",
    totalAmount: b.remainingAmount,
    dueDate: b.dueDate ?? "2099-12-31",
    discountDeadline: null as string | null,
    discountPct: 0,
  }));

  // DSO current vs prior
  const arResult = await db.invoice.aggregate({
    where: {
      organizationId: orgId,
      status: { in: ["ISSUED", "OVERDUE"] },
      archivedAt: null,
    },
    _sum: { remainingAmount: true },
  });
  const ar = arResult._sum.remainingAmount ?? 0;
  const revenue30d = actualInflow30d;
  const dsoCurrent = revenue30d > 0 ? (ar / revenue30d) * 30 : 0;

  // Prior month DSO (approximate: 30-60 days ago)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const priorInflowResult = await db.invoicePayment.aggregate({
    where: {
      orgId,
      status: "SETTLED",
      paidAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
    },
    _sum: { amount: true },
  });
  const priorRevenue = priorInflowResult._sum.amount ?? 0;
  const dsoPriorMonth = priorRevenue > 0 ? (ar / priorRevenue) * 30 : 0;

  // Days since last payment received
  const lastPayment = await db.invoicePayment.findFirst({
    where: { orgId, status: "SETTLED" },
    orderBy: { paidAt: "desc" },
  });
  const daysSinceLastPaymentReceived = lastPayment
    ? Math.round(
        (Date.now() - lastPayment.paidAt.getTime()) / 86400000
      )
    : 999;

  const alerts = evaluateAlerts(
    {
      currentBalance,
      liquidityTarget,
      actualInflow30d,
      forecastedInflow30d,
      bills,
      dsoCurrent: Math.round(dsoCurrent),
      dsoPriorMonth: Math.round(dsoPriorMonth),
      daysSinceLastPaymentReceived,
      forecastDeviationPct: alertConfig?.forecastDeviationPct,
      largeOutflowPct: alertConfig?.largeOutflowPct,
      discountExpiryHours: alertConfig?.discountExpiryHours,
      dsoSpikePct: alertConfig?.dsoSpikePct,
      collectionStallDays: alertConfig?.collectionStallDays,
    }
  );

  return { success: true, data: alerts };
}

// ─── Alert Config ───────────────────────────────────────────────────────────

export async function getAlertConfigAction(): Promise<
  ActionResult<{
    liquidityTargetPct: number;
    forecastDeviationPct: number;
    largeOutflowPct: number;
    discountExpiryHours: number;
    dsoSpikePct: number;
    collectionStallDays: number;
    isActive: boolean;
  }>
> {
  const { orgId } = await requireRole("admin");
  await checkFeature(orgId, "cashFlowOptimizer");

  const config = await db.cashFlowAlertConfig.findUnique({
    where: { orgId },
  });

  return {
    success: true,
    data: {
      liquidityTargetPct: config?.liquidityTargetPct ?? 20,
      forecastDeviationPct: config?.forecastDeviationPct ?? 20,
      largeOutflowPct: config?.largeOutflowPct ?? 20,
      discountExpiryHours: config?.discountExpiryHours ?? 48,
      dsoSpikePct: config?.dsoSpikePct ?? 15,
      collectionStallDays: config?.collectionStallDays ?? 7,
      isActive: config?.isActive ?? true,
    },
  };
}

export async function updateAlertConfigAction(input: {
  liquidityTargetPct: number;
}): Promise<ActionResult<{ updated: boolean }>> {
  const { orgId, userId } = await requireRole("admin");
  await checkFeature(orgId, "cashFlowOptimizer");

  await db.cashFlowAlertConfig.upsert({
    where: { orgId },
    create: {
      orgId,
      liquidityTargetPct: input.liquidityTargetPct,
    },
    update: {
      liquidityTargetPct: input.liquidityTargetPct,
    },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "CASHFLOW_ALERT_CONFIG_UPDATED",
    entityType: "CashFlowAlertConfig",
    entityId: orgId,
    metadata: { liquidityTargetPct: input.liquidityTargetPct },
  });

  return { success: true, data: { updated: true } };
}

// ─── Get Optimization History ───────────────────────────────────────────────

export async function getOptimizationHistoryAction(): Promise<
  ActionResult<
    Array<{
      id: string;
      generatedAt: Date;
      discountCaptureRate: number;
      totalDiscountRecommended: number;
      recommendationCount: number;
    }>
  >
> {
  const { orgId } = await requireRole("admin");
  await checkFeature(orgId, "cashFlowOptimizer");

  const runs = await db.paymentOptimizationRun.findMany({
    where: { orgId },
    orderBy: { generatedAt: "desc" },
    take: 10,
  });

  return {
    success: true,
    data: runs.map((r) => ({
      id: r.id,
      generatedAt: r.generatedAt,
      discountCaptureRate: r.discountCaptureRate,
      totalDiscountRecommended: Number(r.totalDiscountRecommended),
      recommendationCount: Array.isArray(r.recommendations)
        ? (r.recommendations as unknown[]).length
        : 0,
    })),
  };
}
