/**
 * Collections intelligence service — aging analysis, at-risk customer signals,
 * payment recovery metrics, and gateway performance metrics.
 * All queries are org-scoped; no cross-tenant data exposure.
 */
import { db } from "@/lib/db";
import { InvoiceStatus } from "@/generated/prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgingBucket {
  label: string;
  daysMin: number;
  daysMax: number | null;
  count: number;
  totalAmount: number;
  invoiceIds: string[];
  percentOfTotal: number;
}

export interface AgingReport {
  buckets: AgingBucket[];
  grandTotal: number;
  asOf: string;
}

export type AtRiskSignal =
  | "critical_overdue"
  | "late_payer"
  | "disputed"
  | "arrangement_defaulted";

export interface AtRiskCustomer {
  customerId: string;
  customerName: string;
  signals: AtRiskSignal[];
  totalOutstanding: number;
  oldestInvoiceDays: number;
}

export interface RecoveryMetrics {
  months: {
    month: string; // YYYY-MM
    issuedCount: number;
    paidWithin30: number;
    paidWithin30Rate: number;
    overdueRecovered: number;
    avgDaysToPayment: number | null;
  }[];
}

export interface GatewayMetrics {
  linksCreated: number;
  linksPaid: number;
  linksExpired: number;
  paymentSuccessRate: number;
  avgMinutesToPayment: number | null;
  methodBreakdown: Record<string, number>;
}

// ─── Aging Analysis ──────────────────────────────────────────────────────────

const UNPAID_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.VIEWED,
  InvoiceStatus.DUE,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.ARRANGEMENT_MADE,
];

/**
 * Bucket all unpaid invoices into 5 aging categories based on dueDate.
 * "Current" = due within next 30 days (not yet overdue).
 * Remaining buckets = days past due date.
 */
export async function getAgingBuckets(orgId: string): Promise<AgingReport> {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const unpaid = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { in: UNPAID_STATUSES },
      archivedAt: null,
    },
    select: {
      id: true,
      dueDate: true,
      remainingAmount: true,
      totalAmount: true,
    },
  });

  type BucketKey = "current" | "1_30" | "31_60" | "61_90" | "91plus";

  const bucketDefs: { key: BucketKey; label: string; daysMin: number; daysMax: number | null }[] =
    [
      { key: "current", label: "Current (0–30 days)", daysMin: -30, daysMax: 0 },
      { key: "1_30", label: "1–30 days overdue", daysMin: 1, daysMax: 30 },
      { key: "31_60", label: "31–60 days overdue", daysMin: 31, daysMax: 60 },
      { key: "61_90", label: "61–90 days overdue", daysMin: 61, daysMax: 90 },
      { key: "91plus", label: "90+ days overdue", daysMin: 91, daysMax: null },
    ];

  const accum: Record<BucketKey, { count: number; total: number; ids: string[] }> = {
    current: { count: 0, total: 0, ids: [] },
    "1_30": { count: 0, total: 0, ids: [] },
    "31_60": { count: 0, total: 0, ids: [] },
    "61_90": { count: 0, total: 0, ids: [] },
    "91plus": { count: 0, total: 0, ids: [] },
  };

  for (const inv of unpaid) {
    const amount = inv.remainingAmount > 0 ? inv.remainingAmount : inv.totalAmount;
    if (!inv.dueDate) {
      // No due date — treat as current
      accum.current.count++;
      accum.current.total += amount;
      accum.current.ids.push(inv.id);
      continue;
    }

    const daysOverdue = Math.floor(
      (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    let key: BucketKey;
    if (daysOverdue <= 0 && daysOverdue >= -30) {
      key = "current";
    } else if (daysOverdue >= 1 && daysOverdue <= 30) {
      key = "1_30";
    } else if (daysOverdue >= 31 && daysOverdue <= 60) {
      key = "31_60";
    } else if (daysOverdue >= 61 && daysOverdue <= 90) {
      key = "61_90";
    } else {
      key = "91plus";
    }

    accum[key].count++;
    accum[key].total += amount;
    accum[key].ids.push(inv.id);
  }

  const grandTotal = Object.values(accum).reduce((s, b) => s + b.total, 0);

  const buckets: AgingBucket[] = bucketDefs.map((def) => ({
    label: def.label,
    daysMin: def.daysMin,
    daysMax: def.daysMax,
    count: accum[def.key].count,
    totalAmount: accum[def.key].total,
    invoiceIds: accum[def.key].ids,
    percentOfTotal: grandTotal > 0 ? (accum[def.key].total / grandTotal) * 100 : 0,
  }));

  return { buckets, grandTotal, asOf: todayStr };
}

// ─── At-Risk Customer Detection ───────────────────────────────────────────────

/**
 * Flag customers that show at least one risk signal:
 * - critical_overdue: 2+ invoices 61-90 or 90+ days overdue
 * - late_payer: average days-to-payment > 15 from InvoiceStateEvent history
 * - disputed: open InvoiceTicket with AMOUNT_DISPUTE
 * - arrangement_defaulted: PaymentArrangement with status DEFAULTED
 */
export async function getAtRiskCustomers(orgId: string): Promise<AtRiskCustomer[]> {
  const [overdue, stateEvents, disputes, defaulted] = await Promise.all([
    // Customers with 2+ invoices 61+ days overdue
    db.invoice.groupBy({
      by: ["customerId"],
      where: {
        organizationId: orgId,
        status: { in: UNPAID_STATUSES },
        archivedAt: null,
        customerId: { not: null },
        dueDate: {
          lt: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        },
      },
      _count: { id: true },
      _sum: { remainingAmount: true },
      having: { id: { _count: { gte: 2 } } },
    }),

    // State events for late-payer detection
    db.invoiceStateEvent.findMany({
      where: {
        invoice: { organizationId: orgId },
        toStatus: "PAID",
      },
      select: {
        invoiceId: true,
        createdAt: true,
        invoice: { select: { customerId: true, issuedAt: true } },
      },
    }),

    // Customers with open AMOUNT_DISPUTE tickets
    db.invoiceTicket.findMany({
      where: {
        invoice: { organizationId: orgId },
        category: "AMOUNT_DISPUTE",
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      select: { invoice: { select: { customerId: true } } },
    }),

    // Customers with defaulted arrangements
    db.paymentArrangement.findMany({
      where: { orgId, status: "DEFAULTED" },
      select: { customerId: true },
    }),
  ]);

  // Build customer signal map
  const signalMap = new Map<string, Set<AtRiskSignal>>();
  const outstandingMap = new Map<string, number>();
  const oldestDayMap = new Map<string, number>();

  const ensureEntry = (cid: string) => {
    if (!signalMap.has(cid)) signalMap.set(cid, new Set());
  };

  for (const row of overdue) {
    if (!row.customerId) continue;
    ensureEntry(row.customerId);
    signalMap.get(row.customerId)!.add("critical_overdue");
    outstandingMap.set(row.customerId, row._sum.remainingAmount ?? 0);
  }

  // Late-payer signal: avg days from issuedAt to PAID state event > 15
  const customerPaidDelays = new Map<string, number[]>();
  for (const evt of stateEvents) {
    const cid = evt.invoice.customerId;
    if (!cid || !evt.invoice.issuedAt) continue;
    const delay = Math.floor(
      (evt.createdAt.getTime() - evt.invoice.issuedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (!customerPaidDelays.has(cid)) customerPaidDelays.set(cid, []);
    customerPaidDelays.get(cid)!.push(delay);
  }
  for (const [cid, delays] of customerPaidDelays) {
    const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
    if (avg > 15) {
      ensureEntry(cid);
      signalMap.get(cid)!.add("late_payer");
    }
  }

  for (const ticket of disputes) {
    const cid = ticket.invoice.customerId;
    if (!cid) continue;
    ensureEntry(cid);
    signalMap.get(cid)!.add("disputed");
  }

  for (const arr of defaulted) {
    ensureEntry(arr.customerId);
    signalMap.get(arr.customerId)!.add("arrangement_defaulted");
  }

  if (signalMap.size === 0) return [];

  const customerIds = [...signalMap.keys()];
  const customers = await db.customer.findMany({
    where: { id: { in: customerIds }, organizationId: orgId },
    select: { id: true, name: true },
  });

  const now = new Date();
  const oldestDueInvoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      customerId: { in: customerIds },
      status: { in: UNPAID_STATUSES },
      archivedAt: null,
    },
    select: { customerId: true, dueDate: true },
    orderBy: { dueDate: "asc" },
  });

  for (const inv of oldestDueInvoices) {
    if (!inv.customerId || !inv.dueDate) continue;
    if (!oldestDayMap.has(inv.customerId)) {
      const days = Math.max(
        0,
        Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      );
      oldestDayMap.set(inv.customerId, days);
    }
  }

  return customers
    .filter((c) => signalMap.has(c.id))
    .map((c) => ({
      customerId: c.id,
      customerName: c.name,
      signals: [...signalMap.get(c.id)!],
      totalOutstanding: outstandingMap.get(c.id) ?? 0,
      oldestInvoiceDays: oldestDayMap.get(c.id) ?? 0,
    }));
}

// ─── Payment Recovery Metrics ─────────────────────────────────────────────────

/**
 * Month-over-month recovery stats for the last `months` months.
 */
export async function getPaymentRecoveryMetrics(
  orgId: string,
  months = 6
): Promise<RecoveryMetrics> {
  const now = new Date();

  const result: RecoveryMetrics["months"] = [];

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const monthStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;

    const [issued, paidEvents] = await Promise.all([
      db.invoice.count({
        where: {
          organizationId: orgId,
          issuedAt: { gte: start, lte: end },
          archivedAt: null,
        },
      }),

      // Payment events in this month — calculate days-to-pay
      db.invoiceStateEvent.findMany({
        where: {
          invoice: { organizationId: orgId },
          toStatus: "PAID",
          createdAt: { gte: start, lte: end },
        },
        select: {
          createdAt: true,
          invoice: { select: { issuedAt: true } },
        },
      }),
    ]);

    const paidWithin30 = paidEvents.filter((evt) => {
      if (!evt.invoice.issuedAt) return false;
      const days =
        (evt.createdAt.getTime() - evt.invoice.issuedAt.getTime()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;

    const delays = paidEvents
      .filter((evt) => evt.invoice.issuedAt !== null)
      .map((evt) =>
        Math.max(
          0,
          (evt.createdAt.getTime() - evt.invoice.issuedAt!.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

    result.push({
      month: monthStr,
      issuedCount: issued,
      paidWithin30,
      paidWithin30Rate: issued > 0 ? paidWithin30 / issued : 0,
      overdueRecovered: paidEvents.length,
      avgDaysToPayment: delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : null,
    });
  }

  return { months: result };
}

// ─── Gateway Performance Metrics ──────────────────────────────────────────────

/**
 * Razorpay gateway metrics for the given period (default: last 30 days).
 */
export async function getGatewayMetrics(
  orgId: string,
  periodDays = 30
): Promise<GatewayMetrics> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const [linksCreated, linksPaid, linksExpired, payments] = await Promise.all([
    db.invoice.count({
      where: {
        organizationId: orgId,
        razorpayPaymentLinkId: { not: null },
        createdAt: { gte: since },
      },
    }),

    db.invoice.count({
      where: {
        organizationId: orgId,
        paymentLinkStatus: "paid",
        updatedAt: { gte: since },
      },
    }),

    db.invoice.count({
      where: {
        organizationId: orgId,
        paymentLinkStatus: "expired",
        updatedAt: { gte: since },
      },
    }),

    db.invoicePayment.findMany({
      where: {
        orgId,
        source: "razorpay_gateway",
        paidAt: { gte: since },
      },
      select: { method: true, paidAt: true, invoice: { select: { razorpayPaymentLinkId: true, createdAt: true } } },
    }),
  ]);

  const methodBreakdown: Record<string, number> = {};
  for (const p of payments) {
    const m = p.method ?? "unknown";
    methodBreakdown[m] = (methodBreakdown[m] ?? 0) + 1;
  }

  const delays = payments
    .filter((p) => p.invoice.createdAt)
    .map((p) => (p.paidAt.getTime() - p.invoice.createdAt.getTime()) / (1000 * 60));

  return {
    linksCreated,
    linksPaid,
    linksExpired,
    paymentSuccessRate: linksCreated > 0 ? linksPaid / linksCreated : 0,
    avgMinutesToPayment: delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : null,
    methodBreakdown,
  };
}
