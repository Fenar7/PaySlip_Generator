import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (hoisted so vi.mock factories can reference them) ────────────────

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    customer: { findFirstOrThrow: vi.fn() },
    invoice: { findMany: vi.fn() },
    customerStatement: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));

import { generateStatement, getStatementHistory } from "../customer-statements";

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
    payments: [
      {
        id: "pay-1",
        amount: 10000,
        paidAt: new Date("2024-03-20"),
        method: "bank_transfer",
        status: "SETTLED",
      },
    ],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("customer-statements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.customerStatement.findFirst.mockResolvedValue(null);
    mockDb.customerStatement.upsert.mockImplementation(async (args: { create: Record<string, unknown> }) => ({
      id: "stmt-1",
      generatedAt: new Date("2024-04-01"),
      ...args.create,
    }));
  });

  describe("generateStatement", () => {
    it("calculates correct totals", async () => {
      mockDb.customer.findFirstOrThrow.mockResolvedValue({
        id: "cust-1",
        name: "Acme Corp",
      });

      const inv1 = makeInvoice({
        id: "inv-1",
        invoiceNumber: "INV-001",
        invoiceDate: "2024-03-15",
        totalAmount: 10000,
        payments: [
          {
            id: "pay-1",
            amount: 10000,
            paidAt: new Date("2024-03-20"),
            method: "bank_transfer",
            status: "SETTLED",
          },
        ],
      });
      const inv2 = makeInvoice({
        id: "inv-2",
        invoiceNumber: "INV-002",
        invoiceDate: "2024-03-25",
        totalAmount: 5000,
        payments: [
          {
            id: "pay-2",
            amount: 3000,
            paidAt: new Date("2024-03-28"),
            method: "upi",
            status: "SETTLED",
          },
        ],
      });

      // Invoices in the date range
      mockDb.invoice.findMany
        .mockResolvedValueOnce([inv1, inv2]) // in-range invoices
        .mockResolvedValueOnce([]); // prior invoices (for opening balance)

      const result = await generateStatement({
        orgId: "org-1",
        customerId: "cust-1",
        fromDate: new Date("2024-03-01"),
        toDate: new Date("2024-03-31"),
      });

      expect(result.totalInvoiced).toBe(15000);
      expect(result.totalReceived).toBe(13000);
      expect(result.openingBalance).toBe(0);
      expect(result.closingBalance).toBe(2000); // 15000 - 13000
      expect(result.customerName).toBe("Acme Corp");
      expect(result.lineItems.length).toBeGreaterThan(0);
    });

    it("handles empty period (no invoices)", async () => {
      mockDb.customer.findFirstOrThrow.mockResolvedValue({
        id: "cust-1",
        name: "Acme Corp",
      });

      mockDb.invoice.findMany
        .mockResolvedValueOnce([]) // no in-range invoices
        .mockResolvedValueOnce([]); // no prior invoices

      const result = await generateStatement({
        orgId: "org-1",
        customerId: "cust-1",
        fromDate: new Date("2024-03-01"),
        toDate: new Date("2024-03-31"),
      });

      expect(result.totalInvoiced).toBe(0);
      expect(result.totalReceived).toBe(0);
      expect(result.openingBalance).toBe(0);
      expect(result.closingBalance).toBe(0);
      expect(result.lineItems).toEqual([]);
    });

    it("includes payments in calculations", async () => {
      mockDb.customer.findFirstOrThrow.mockResolvedValue({
        id: "cust-1",
        name: "Acme Corp",
      });

      const invoice = makeInvoice({
        id: "inv-1",
        invoiceNumber: "INV-001",
        invoiceDate: "2024-03-10",
        totalAmount: 20000,
        payments: [
          {
            id: "pay-1",
            amount: 8000,
            paidAt: new Date("2024-03-15"),
            method: "bank_transfer",
            status: "SETTLED",
          },
          {
            id: "pay-2",
            amount: 5000,
            paidAt: new Date("2024-03-25"),
            method: "upi",
            status: "SETTLED",
          },
        ],
      });

      mockDb.invoice.findMany
        .mockResolvedValueOnce([invoice]) // in-range
        .mockResolvedValueOnce([]); // prior

      const result = await generateStatement({
        orgId: "org-1",
        customerId: "cust-1",
        fromDate: new Date("2024-03-01"),
        toDate: new Date("2024-03-31"),
      });

      expect(result.totalInvoiced).toBe(20000);
      expect(result.totalReceived).toBe(13000);
      expect(result.closingBalance).toBe(7000);

      // Should have line items for the invoice and both payments
      const invoiceLines = result.lineItems.filter((li) => li.debit > 0);
      const paymentLines = result.lineItems.filter((li) => li.credit > 0);
      expect(invoiceLines.length).toBe(1);
      expect(paymentLines.length).toBe(2);
    });
  });

  describe("getStatementHistory", () => {
    it("returns statements ordered by date", async () => {
      const statements = [
        {
          id: "stmt-2",
          fromDate: new Date("2024-02-01"),
          toDate: new Date("2024-02-28"),
          openingBalance: 0,
          closingBalance: 5000,
          totalInvoiced: 10000,
          totalReceived: 5000,
          fileUrl: null,
          generatedAt: new Date("2024-03-02"),
        },
        {
          id: "stmt-1",
          fromDate: new Date("2024-01-01"),
          toDate: new Date("2024-01-31"),
          openingBalance: 0,
          closingBalance: 3000,
          totalInvoiced: 8000,
          totalReceived: 5000,
          fileUrl: "https://files.example.com/stmt-1.pdf",
          generatedAt: new Date("2024-02-01"),
        },
      ];
      mockDb.customerStatement.findMany.mockResolvedValue(statements);

      const result = await getStatementHistory("org-1", "cust-1");

      expect(result).toHaveLength(2);
      expect(mockDb.customerStatement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { generatedAt: "desc" },
          where: { orgId: "org-1", customerId: "cust-1" },
        })
      );
      // First result should be the most recent (desc order)
      expect(result[0].id).toBe("stmt-2");
    });
  });
});
