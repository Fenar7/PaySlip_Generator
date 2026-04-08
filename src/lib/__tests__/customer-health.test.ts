import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted so vi.mock factories can reference them) ────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    invoice: { findMany: vi.fn() },
    customer: { findMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));

import { calculateHealthScore } from "../customer-health";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    invoiceNumber: "INV-001",
    invoiceDate: "2024-03-15",
    totalAmount: 10000,
    remainingAmount: 0,
    amountPaid: 10000,
    status: "PAID",
    issuedAt: new Date("2024-03-15"),
    paidAt: new Date("2024-03-17"), // paid 2 days after issue
    payments: [],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("customer-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.customer.update.mockResolvedValue({});
  });

  describe("calculateHealthScore", () => {
    it("perfect payer gets score near 100", async () => {
      // All invoices paid promptly, none overdue, no disputes
      const invoices = [
        makeInvoice({
          id: "inv-1",
          status: "PAID",
          totalAmount: 10000,
          remainingAmount: 0,
          issuedAt: new Date("2024-01-15"),
          paidAt: new Date("2024-01-17"), // 2 days
        }),
        makeInvoice({
          id: "inv-2",
          status: "PAID",
          totalAmount: 15000,
          remainingAmount: 0,
          issuedAt: new Date("2024-02-15"),
          paidAt: new Date("2024-02-16"), // 1 day
        }),
        makeInvoice({
          id: "inv-3",
          status: "PAID",
          totalAmount: 12000,
          remainingAmount: 0,
          issuedAt: new Date("2024-03-15"),
          paidAt: new Date("2024-03-18"), // 3 days
        }),
      ];
      mockDb.invoice.findMany.mockResolvedValue(invoices);

      const result = await calculateHealthScore("org-1", "cust-1");

      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.avgDaysToPay.value).toBeLessThan(5);
    });

    it("chronically late payer gets low score", async () => {
      // All invoices paid very late, some overdue, high outstanding
      const invoices = [
        makeInvoice({
          id: "inv-1",
          status: "OVERDUE",
          totalAmount: 10000,
          remainingAmount: 10000,
          issuedAt: new Date("2024-01-15"),
          paidAt: null,
        }),
        makeInvoice({
          id: "inv-2",
          status: "OVERDUE",
          totalAmount: 15000,
          remainingAmount: 15000,
          issuedAt: new Date("2024-02-15"),
          paidAt: null,
        }),
        makeInvoice({
          id: "inv-3",
          status: "PAID",
          totalAmount: 8000,
          remainingAmount: 0,
          issuedAt: new Date("2024-01-01"),
          paidAt: new Date("2024-03-31"), // paid 89 days late
        }),
        makeInvoice({
          id: "inv-4",
          status: "DISPUTED",
          totalAmount: 12000,
          remainingAmount: 12000,
          issuedAt: new Date("2024-03-01"),
          paidAt: null,
        }),
      ];
      mockDb.invoice.findMany.mockResolvedValue(invoices);

      const result = await calculateHealthScore("org-1", "cust-1");

      expect(result.score).toBeLessThan(40);
      expect(result.overdueRatio.value).toBeGreaterThan(0);
    });

    it("handles customer with no invoices", async () => {
      mockDb.invoice.findMany.mockResolvedValue([]);

      const result = await calculateHealthScore("org-1", "cust-1");

      // Default score for no invoices is 100
      expect(result.score).toBe(100);
      expect(result.avgDaysToPay.value).toBe(0);
      expect(result.overdueRatio.value).toBe(0);
    });

    it("updates Customer record", async () => {
      const invoices = [
        makeInvoice({
          id: "inv-1",
          status: "PAID",
          totalAmount: 10000,
          remainingAmount: 0,
          issuedAt: new Date("2024-03-15"),
          paidAt: new Date("2024-03-17"),
        }),
      ];
      mockDb.invoice.findMany.mockResolvedValue(invoices);

      const result = await calculateHealthScore("org-1", "cust-1");

      expect(mockDb.customer.update).toHaveBeenCalledWith({
        where: { id: "cust-1" },
        data: { paymentHealthScore: result.score },
      });
    });
  });
});
