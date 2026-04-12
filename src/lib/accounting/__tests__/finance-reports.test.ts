import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findMany: vi.fn(),
    },
    vendorBill: {
      findMany: vi.fn(),
    },
    glAccount: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/cash-flow", () => ({
  getAgingReport: vi.fn(),
}));

vi.mock("../reports", () => ({
  getTrialBalance: vi.fn(),
}));

vi.mock("../vendor-bills", () => ({
  refreshVendorBillOverdueStates: vi.fn(),
}));

import { db } from "@/lib/db";
import { getAgingReport } from "@/lib/cash-flow";
import { getTrialBalance } from "../reports";
import { refreshVendorBillOverdueStates } from "../vendor-bills";
import {
  getAccountsPayableAging,
  getAccountsReceivableAging,
} from "../finance-reports";

describe("finance report tie-outs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("keeps AR aging aligned to the receivables control balance", async () => {
    vi.mocked(db.invoice.findMany).mockResolvedValue([
      {
        id: "inv-1",
        invoiceNumber: "INV-001",
        invoiceDate: "2026-04-01",
        dueDate: "2026-04-10",
        remainingAmount: 40,
        customer: { name: "Acme" },
      },
      {
        id: "inv-2",
        invoiceNumber: "INV-002",
        invoiceDate: "2026-04-02",
        dueDate: "2026-04-15",
        remainingAmount: 60,
        customer: { name: "Beta" },
      },
    ] as never);
    vi.mocked(db.glAccount.findMany).mockResolvedValue([
      {
        id: "ar-gl",
        code: "1100",
        name: "Accounts Receivable",
        accountType: "ASSET",
        normalBalance: "DEBIT",
        systemKey: "ACCOUNTS_RECEIVABLE",
      },
    ] as never);
    vi.mocked(getTrialBalance).mockResolvedValue({
      rows: [
        {
          id: "ar-gl",
          code: "1100",
          name: "Accounts Receivable",
          accountType: "ASSET",
          normalBalance: "DEBIT",
          totalDebit: 120,
          totalCredit: 0,
          balance: 120,
          debitBalance: 120,
          creditBalance: 0,
        },
      ],
      totals: { debit: 120, credit: 120 },
      balanced: true,
    } as never);
    vi.mocked(getAgingReport).mockResolvedValue([
      { label: "Current", count: 2, total: 100, percentage: 100 },
    ] as never);

    const result = await getAccountsReceivableAging("org-1", {
      asOfDate: "2026-04-30",
    });

    expect(result.totalOutstanding).toBe(100);
    expect(result.glBalance).toBe(120);
    expect(result.variance).toBe(20);
    expect(result.summaryBuckets).toEqual([
      { label: "Current", count: 2, total: 100, percentage: 100 },
    ]);
  });

  it("keeps AP aging aligned to the payables control balance", async () => {
    vi.mocked(db.vendorBill.findMany).mockResolvedValue([
      {
        id: "bill-1",
        billNumber: "BILL-001",
        billDate: "2026-04-01",
        dueDate: "2026-04-20",
        remainingAmount: 100,
        vendor: { name: "Vendor A" },
      },
    ] as never);
    vi.mocked(db.glAccount.findMany).mockResolvedValue([
      {
        id: "ap-gl",
        code: "2100",
        name: "Accounts Payable",
        accountType: "LIABILITY",
        normalBalance: "CREDIT",
        systemKey: "ACCOUNTS_PAYABLE",
      },
    ] as never);
    vi.mocked(getTrialBalance).mockResolvedValue({
      rows: [
        {
          id: "ap-gl",
          code: "2100",
          name: "Accounts Payable",
          accountType: "LIABILITY",
          normalBalance: "CREDIT",
          totalDebit: 0,
          totalCredit: 80,
          balance: 80,
          debitBalance: 0,
          creditBalance: 80,
        },
      ],
      totals: { debit: 80, credit: 80 },
      balanced: true,
    } as never);

    const result = await getAccountsPayableAging("org-1", {
      asOfDate: "2026-04-30",
    });

    expect(refreshVendorBillOverdueStates).toHaveBeenCalledWith("org-1");
    expect(result.totalOutstanding).toBe(100);
    expect(result.glBalance).toBe(80);
    expect(result.variance).toBe(-20);
  });
});
