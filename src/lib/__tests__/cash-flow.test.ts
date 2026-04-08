import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    invoicePayment: { aggregate: vi.fn() },
    customer: { findMany: vi.fn() },
    paymentInstallment: { aggregate: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import {
  getCashFlowSnapshot,
  calculateDSO,
  getAgingReport,
  getCustomerHealthSummary,
  getCashFlowForecast,
} from "../cash-flow";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ORG = "org-1";

/** Shorthand to mock db.invoice.aggregate to return sequential results. */
function mockInvoiceAggregates(...results: Array<{ _sum: Record<string, number | null> }>) {
  const fn = vi.mocked(db.invoice.aggregate);
  for (const r of results) {
    fn.mockResolvedValueOnce(r as any);
  }
}

function mockPaymentAggregate(amount: number | null) {
  vi.mocked(db.invoicePayment.aggregate).mockResolvedValue({
    _sum: { amount },
  } as any);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("cash-flow service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ── getCashFlowSnapshot ─────────────────────────────────────────────────

  describe("getCashFlowSnapshot", () => {
    it("returns correct outstanding/overdue/expected/received totals", async () => {
      // getCashFlowSnapshot calls 4 aggregates then calculateDSO (which calls 4 more)
      // First 4: outstanding, overdue, expected, received
      mockInvoiceAggregates(
        { _sum: { remainingAmount: 10000 } },
        { _sum: { remainingAmount: 3000 } },
        { _sum: { remainingAmount: 5000 } },
      );
      vi.mocked(db.invoicePayment.aggregate).mockResolvedValueOnce({
        _sum: { amount: 2000 },
      } as any);

      // calculateDSO's 4 aggregates (currentAR, currentSales, previousAR, previousSales)
      mockInvoiceAggregates(
        { _sum: { remainingAmount: 10000 } },
        { _sum: { totalAmount: 50000 } },
        { _sum: { remainingAmount: 8000 } },
        { _sum: { totalAmount: 40000 } },
      );

      const snap = await getCashFlowSnapshot(ORG);

      expect(snap.totalOutstanding).toBe(10000);
      expect(snap.totalOverdue).toBe(3000);
      expect(snap.expectedThisMonth).toBe(5000);
      expect(snap.receivedThisMonth).toBe(2000);
      expect(typeof snap.dso).toBe("number");
    });

    it("handles org with no invoices (returns zeros)", async () => {
      mockInvoiceAggregates(
        { _sum: { remainingAmount: null } },
        { _sum: { remainingAmount: null } },
        { _sum: { remainingAmount: null } },
      );
      vi.mocked(db.invoicePayment.aggregate).mockResolvedValueOnce({
        _sum: { amount: null },
      } as any);

      // calculateDSO aggregates
      mockInvoiceAggregates(
        { _sum: { remainingAmount: null } },
        { _sum: { totalAmount: null } },
        { _sum: { remainingAmount: null } },
        { _sum: { totalAmount: null } },
      );

      const snap = await getCashFlowSnapshot(ORG);

      expect(snap.totalOutstanding).toBe(0);
      expect(snap.totalOverdue).toBe(0);
      expect(snap.expectedThisMonth).toBe(0);
      expect(snap.receivedThisMonth).toBe(0);
      expect(snap.dso).toBe(0);
    });
  });

  // ── calculateDSO ───────────────────────────────────────────────────────

  describe("calculateDSO", () => {
    it("DSO = (AR / Total Invoiced) × Days", async () => {
      mockInvoiceAggregates(
        { _sum: { remainingAmount: 10000 } },  // current AR
        { _sum: { totalAmount: 50000 } },       // current sales
        { _sum: { remainingAmount: 8000 } },    // previous AR
        { _sum: { totalAmount: 40000 } },        // previous sales
      );

      const result = await calculateDSO(ORG, 90);

      // DSO = (10000/50000) * 90 = 18
      expect(result.dso).toBe(18);
      // previousDso = (8000/40000)*90 = 18
      expect(result.previousDso).toBe(18);
    });

    it("returns 0 when no invoices exist", async () => {
      mockInvoiceAggregates(
        { _sum: { remainingAmount: null } },
        { _sum: { totalAmount: null } },
        { _sum: { remainingAmount: null } },
        { _sum: { totalAmount: null } },
      );

      const result = await calculateDSO(ORG);

      expect(result.dso).toBe(0);
      expect(result.previousDso).toBe(0);
    });

    it("computes trend comparing current vs previous period", async () => {
      // Current DSO = (5000/10000)*90 = 45
      // Previous DSO = (8000/10000)*90 = 72
      // diff = 45 - 72 = -27 → improving
      mockInvoiceAggregates(
        { _sum: { remainingAmount: 5000 } },
        { _sum: { totalAmount: 10000 } },
        { _sum: { remainingAmount: 8000 } },
        { _sum: { totalAmount: 10000 } },
      );

      const result = await calculateDSO(ORG, 90);

      expect(result.trend).toBe("improving");
    });
  });

  // ── getAgingReport ──────────────────────────────────────────────────────

  describe("getAgingReport", () => {
    const today = new Date();

    function daysAgo(days: number): string {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return d.toISOString().split("T")[0];
    }

    function daysFromNow(days: number): string {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d.toISOString().split("T")[0];
    }

    it("buckets invoices correctly by days overdue", async () => {
      vi.mocked(db.invoice.findMany).mockResolvedValue([
        { dueDate: daysFromNow(5), remainingAmount: 1000 },  // current
        { dueDate: daysAgo(10), remainingAmount: 2000 },      // 1-30
        { dueDate: daysAgo(45), remainingAmount: 3000 },      // 31-60
        { dueDate: daysAgo(75), remainingAmount: 4000 },      // 61-90
        { dueDate: daysAgo(120), remainingAmount: 5000 },     // 90+
      ] as any);

      const report = await getAgingReport(ORG);

      expect(report[0].label).toBe("Current");
      expect(report[0].total).toBe(1000);
      expect(report[1].label).toBe("1–30 days");
      expect(report[1].total).toBe(2000);
      expect(report[2].label).toBe("31–60 days");
      expect(report[2].total).toBe(3000);
      expect(report[3].label).toBe("61–90 days");
      expect(report[3].total).toBe(4000);
      expect(report[4].label).toBe("90+ days");
      expect(report[4].total).toBe(5000);
    });

    it("current bucket: not yet due", async () => {
      vi.mocked(db.invoice.findMany).mockResolvedValue([
        { dueDate: daysFromNow(10), remainingAmount: 500 },
      ] as any);

      const report = await getAgingReport(ORG);

      expect(report[0].label).toBe("Current");
      expect(report[0].count).toBe(1);
      expect(report[0].total).toBe(500);
    });

    it("calculates percentages correctly", async () => {
      vi.mocked(db.invoice.findMany).mockResolvedValue([
        { dueDate: daysFromNow(5), remainingAmount: 500 },   // current
        { dueDate: daysAgo(10), remainingAmount: 500 },       // 1-30
      ] as any);

      const report = await getAgingReport(ORG);

      expect(report[0].percentage).toBe(50);
      expect(report[1].percentage).toBe(50);
    });
  });

  // ── getCustomerHealthSummary ────────────────────────────────────────────

  describe("getCustomerHealthSummary", () => {
    it("groups customers by score tiers", async () => {
      vi.mocked(db.customer.findMany).mockResolvedValue([
        { id: "c1", name: "A", email: "a@a.com", paymentHealthScore: 90 },   // excellent
        { id: "c2", name: "B", email: "b@b.com", paymentHealthScore: 70 },   // good
        { id: "c3", name: "C", email: "c@c.com", paymentHealthScore: 50 },   // fair
        { id: "c4", name: "D", email: "d@d.com", paymentHealthScore: 30 },   // atRisk
        { id: "c5", name: "E", email: "e@e.com", paymentHealthScore: 10 },   // critical
      ] as any);

      // Outstanding for at-risk customers (score < 40 → c4 and c5)
      vi.mocked(db.invoice.aggregate)
        .mockResolvedValueOnce({ _sum: { remainingAmount: 5000 } } as any)
        .mockResolvedValueOnce({ _sum: { remainingAmount: 8000 } } as any);

      const summary = await getCustomerHealthSummary(ORG);

      expect(summary.distribution).toEqual({
        excellent: 1,
        good: 1,
        fair: 1,
        atRisk: 1,
        critical: 1,
      });
    });

    it("returns top 5 at-risk customers", async () => {
      const customers = Array.from({ length: 8 }, (_, i) => ({
        id: `c${i}`,
        name: `Cust ${i}`,
        email: `c${i}@x.com`,
        paymentHealthScore: 5 + i * 3, // all < 40 except last few
      }));

      vi.mocked(db.customer.findMany).mockResolvedValue(customers as any);

      // Mock outstanding for each at-risk customer (score < 40)
      const atRiskCount = customers.filter((c) => c.paymentHealthScore < 40).length;
      for (let i = 0; i < atRiskCount; i++) {
        vi.mocked(db.invoice.aggregate).mockResolvedValueOnce({
          _sum: { remainingAmount: 1000 * (i + 1) },
        } as any);
      }

      const summary = await getCustomerHealthSummary(ORG);

      expect(summary.topAtRisk.length).toBeLessThanOrEqual(5);
    });

    it("handles org with no customers", async () => {
      vi.mocked(db.customer.findMany).mockResolvedValue([]);

      const summary = await getCustomerHealthSummary(ORG);

      expect(summary.distribution).toEqual({
        excellent: 0,
        good: 0,
        fair: 0,
        atRisk: 0,
        critical: 0,
      });
      expect(summary.topAtRisk).toEqual([]);
    });
  });

  // ── getCashFlowForecast ─────────────────────────────────────────────────

  describe("getCashFlowForecast", () => {
    it("generates monthly forecasts", async () => {
      // Use mockResolvedValue with combined fields so every call returns both
      // totalAmount (used by historical query) and remainingAmount (used by per-month query)
      vi.mocked(db.invoice.aggregate).mockResolvedValue({
        _sum: { totalAmount: 100000, remainingAmount: 10000 },
      } as any);
      vi.mocked(db.invoicePayment.aggregate).mockResolvedValue({
        _sum: { amount: 80000 },
      } as any);
      vi.mocked(db.paymentInstallment.aggregate).mockResolvedValue({
        _sum: { amount: 2000 },
      } as any);

      const forecasts = await getCashFlowForecast(ORG, 3);

      expect(forecasts).toHaveLength(3);
      expect(forecasts[0].expectedInflow).toBe(10000);
      expect(forecasts[0].arrangementsDue).toBe(2000);
    });

    it("adjusts conservative estimate by collection rate", async () => {
      // 80% collection rate: 80000 / 100000 = 0.8
      vi.mocked(db.invoice.aggregate).mockResolvedValue({
        _sum: { totalAmount: 100000, remainingAmount: 10000 },
      } as any);
      vi.mocked(db.invoicePayment.aggregate).mockResolvedValue({
        _sum: { amount: 80000 },
      } as any);
      vi.mocked(db.paymentInstallment.aggregate).mockResolvedValue({
        _sum: { amount: 0 },
      } as any);

      const forecasts = await getCashFlowForecast(ORG, 1);

      // estimatedCollection = 10000 * 0.8 = 8000
      expect(forecasts[0].estimatedCollection).toBe(8000);
    });

    it("includes arrangement installments", async () => {
      vi.mocked(db.invoice.aggregate).mockResolvedValueOnce({
        _sum: { totalAmount: 50000 },
      } as any);
      vi.mocked(db.invoicePayment.aggregate).mockResolvedValueOnce({
        _sum: { amount: 50000 },
      } as any);

      vi.mocked(db.invoice.aggregate).mockResolvedValueOnce({
        _sum: { remainingAmount: 5000 },
      } as any);
      vi.mocked(db.paymentInstallment.aggregate).mockResolvedValueOnce({
        _sum: { amount: 3000 },
      } as any);

      const forecasts = await getCashFlowForecast(ORG, 1);

      expect(forecasts[0].arrangementsDue).toBe(3000);
    });
  });
});
