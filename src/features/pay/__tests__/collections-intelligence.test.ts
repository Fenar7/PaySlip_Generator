import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAgingBuckets } from "@/lib/pay/collections-intelligence";

// Mock db
vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    invoiceStateEvent: { findMany: vi.fn() },
    invoiceTicket: { findMany: vi.fn() },
    paymentArrangement: { findMany: vi.fn() },
    customer: { findMany: vi.fn() },
    invoicePayment: { findMany: vi.fn() },
  },
}));

import { db } from "@/lib/db";
const mockDb = db as unknown as {
  invoice: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>; groupBy: ReturnType<typeof vi.fn> };
  invoiceStateEvent: { findMany: ReturnType<typeof vi.fn> };
  invoiceTicket: { findMany: ReturnType<typeof vi.fn> };
  paymentArrangement: { findMany: ReturnType<typeof vi.fn> };
  customer: { findMany: ReturnType<typeof vi.fn> };
  invoicePayment: { findMany: ReturnType<typeof vi.fn> };
};

describe("getAgingBuckets", () => {
  const ORG_ID = "org-test-123";
  const now = new Date();

  const makeInvoice = (daysOverdue: number | null, amount = 1000) => {
    const dueDate =
      daysOverdue === null
        ? null
        : new Date(now.getTime() - daysOverdue * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
    return {
      id: `inv-${Math.random().toString(36).slice(2)}`,
      dueDate,
      remainingAmount: amount,
      totalAmount: amount,
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("places invoice with no due date into Current bucket", async () => {
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice(null, 500)]);
    const report = await getAgingBuckets(ORG_ID);
    const current = report.buckets.find((b) => b.label.includes("Current"))!;
    expect(current.count).toBe(1);
    expect(current.totalAmount).toBe(500);
  });

  it("places invoice due tomorrow into Current bucket", async () => {
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice(-1, 200)]);
    const report = await getAgingBuckets(ORG_ID);
    const current = report.buckets.find((b) => b.label.includes("Current"))!;
    expect(current.count).toBe(1);
  });

  it("places invoice 1 day overdue into 1–30 bucket", async () => {
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice(1, 300)]);
    const report = await getAgingBuckets(ORG_ID);
    const bucket = report.buckets.find((b) => b.label.includes("1–30"))!;
    expect(bucket.count).toBe(1);
    expect(bucket.totalAmount).toBe(300);
  });

  it("places invoice 45 days overdue into 31–60 bucket", async () => {
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice(45, 400)]);
    const report = await getAgingBuckets(ORG_ID);
    const bucket = report.buckets.find((b) => b.label.includes("31–60"))!;
    expect(bucket.count).toBe(1);
  });

  it("places invoice 75 days overdue into 61–90 bucket", async () => {
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice(75, 600)]);
    const report = await getAgingBuckets(ORG_ID);
    const bucket = report.buckets.find((b) => b.label.includes("61–90"))!;
    expect(bucket.count).toBe(1);
  });

  it("places invoice 100 days overdue into 90+ bucket", async () => {
    mockDb.invoice.findMany.mockResolvedValue([makeInvoice(100, 700)]);
    const report = await getAgingBuckets(ORG_ID);
    const bucket = report.buckets.find((b) => b.label.includes("90+"))!;
    expect(bucket.count).toBe(1);
    expect(bucket.totalAmount).toBe(700);
  });

  it("computes grandTotal and percentOfTotal correctly", async () => {
    mockDb.invoice.findMany.mockResolvedValue([
      makeInvoice(1, 400), // 1–30
      makeInvoice(45, 600), // 31–60
    ]);
    const report = await getAgingBuckets(ORG_ID);
    expect(report.grandTotal).toBe(1000);
    const b1_30 = report.buckets.find((b) => b.label.includes("1–30"))!;
    expect(b1_30.percentOfTotal).toBeCloseTo(40);
    const b31_60 = report.buckets.find((b) => b.label.includes("31–60"))!;
    expect(b31_60.percentOfTotal).toBeCloseTo(60);
  });

  it("returns 5 buckets even when no unpaid invoices", async () => {
    mockDb.invoice.findMany.mockResolvedValue([]);
    const report = await getAgingBuckets(ORG_ID);
    expect(report.buckets).toHaveLength(5);
    expect(report.grandTotal).toBe(0);
    report.buckets.forEach((b) => {
      expect(b.count).toBe(0);
      expect(b.totalAmount).toBe(0);
      expect(b.percentOfTotal).toBe(0);
    });
  });

  it("uses remainingAmount over totalAmount when remainingAmount > 0", async () => {
    mockDb.invoice.findMany.mockResolvedValue([
      {
        id: "inv-1",
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        remainingAmount: 300,
        totalAmount: 1000,
      },
    ]);
    const report = await getAgingBuckets(ORG_ID);
    expect(report.grandTotal).toBe(300);
  });

  it("falls back to totalAmount when remainingAmount is 0", async () => {
    mockDb.invoice.findMany.mockResolvedValue([
      {
        id: "inv-1",
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        remainingAmount: 0,
        totalAmount: 500,
      },
    ]);
    const report = await getAgingBuckets(ORG_ID);
    expect(report.grandTotal).toBe(500);
  });
});
