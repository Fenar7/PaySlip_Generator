import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    reportSnapshot: {
      create: vi.fn(),
    },
    journalLine: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("@/lib/accounting", () => ({
  archiveGlAccount: vi.fn(),
  createAndPostJournal: vi.fn(),
  createGlAccount: vi.fn(),
  ensureBooksSetup: vi.fn(),
  getGeneralLedger: vi.fn(),
  getTrialBalance: vi.fn(),
  listFiscalPeriods: vi.fn(),
  listGlAccounts: vi.fn(),
  listJournalEntries: vi.fn(),
  lockFiscalPeriod: vi.fn(),
  postJournalEntry: vi.fn(),
  reopenFiscalPeriod: vi.fn(),
  reverseJournalEntry: vi.fn(),
}));

import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkFeature } from "@/lib/plans/enforcement";
import {
  getTrialBalance,
  listGlAccounts,
  listJournalEntries,
} from "@/lib/accounting";
import {
  exportBooksJournalRegisterCsv,
  exportBooksTrialBalanceCsv,
  exportChartOfAccountsCsv,
} from "../actions";

const ORG_ID = "org-1";
const USER_ID = "user-1";

describe("Books export actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: ORG_ID,
      userId: USER_ID,
      role: "admin",
    });
    vi.mocked(checkFeature).mockResolvedValue(true);
    vi.mocked(db.reportSnapshot.create).mockResolvedValue({} as never);
  });

  it("exports chart of accounts balances and records a snapshot", async () => {
    vi.mocked(listGlAccounts).mockResolvedValue([
      {
        id: "cash",
        code: "1100",
        name: "Cash",
        accountType: "ASSET",
        normalBalance: "DEBIT",
        parentId: null,
        parent: null,
        isSystem: true,
        isProtected: true,
        isActive: true,
        allowManualEntries: true,
      },
    ] as never);
    vi.mocked(getTrialBalance).mockResolvedValue({
      rows: [
        {
          id: "cash",
          code: "1100",
          name: "Cash",
          accountType: "ASSET",
          normalBalance: "DEBIT",
          totalDebit: 1000,
          totalCredit: 200,
          balance: 800,
          debitBalance: 800,
          creditBalance: 0,
        },
      ],
      totals: { debit: 800, credit: 0 },
      balanced: false,
    } as never);
    vi.mocked(db.journalLine.findMany).mockResolvedValue([
      { accountId: "cash" },
      { accountId: "cash" },
    ] as never);

    const result = await exportChartOfAccountsCsv();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toContain('"Code","Account","Type"');
      expect(result.data).toContain('"1100","Cash","ASSET","DEBIT","","2","1000.00","200.00","800.00","System","Active"');
    }

    expect(db.reportSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: ORG_ID,
        reportType: "books.chart_of_accounts",
        filters: { includeInactive: true },
        rowCount: 1,
        createdBy: USER_ID,
        downloadedAt: expect.any(Date),
      }),
    });
  });

  it("exports the journal register with active filters and snapshot metadata", async () => {
    vi.mocked(listJournalEntries).mockResolvedValue([
      {
        id: "journal-1",
        entryNumber: "JRN-20260401-ABCD1234",
        entryDate: new Date("2026-04-01T12:00:00Z"),
        source: "INVOICE",
        sourceRef: "INV-001",
        status: "POSTED",
        memo: "Invoice issue",
        totalDebit: 1180,
        totalCredit: 1180,
        fiscalPeriod: { label: "2026-04" },
        lines: [{ id: "line-1" }, { id: "line-2" }],
      },
    ] as never);

    const result = await exportBooksJournalRegisterCsv({
      status: "POSTED",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(listJournalEntries).toHaveBeenCalledWith(ORG_ID, {
      status: "POSTED",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toContain('"Entry Number","Entry Date","Source"');
      expect(result.data).toContain('"JRN-20260401-ABCD1234","2026-04-01","INVOICE","INV-001","POSTED","Invoice issue","2026-04","1180.00","1180.00","2"');
    }

    expect(db.reportSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reportType: "books.journal_register",
        filters: {
          status: "POSTED",
          startDate: "2026-04-01",
          endDate: "2026-04-30",
        },
        rowCount: 1,
      }),
    });
  });

  it("exports the trial balance and stores snapshot filter metadata", async () => {
    vi.mocked(getTrialBalance).mockResolvedValue({
      rows: [
        {
          id: "revenue",
          code: "4100",
          name: "Service Revenue",
          accountType: "INCOME",
          normalBalance: "CREDIT",
          totalDebit: 0,
          totalCredit: 5000,
          balance: 5000,
          debitBalance: 0,
          creditBalance: 5000,
        },
      ],
      totals: { debit: 5000, credit: 5000 },
      balanced: true,
    } as never);

    const result = await exportBooksTrialBalanceCsv({ startDate: "2026-04-01" });

    expect(getTrialBalance).toHaveBeenCalledWith(ORG_ID, { startDate: "2026-04-01" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toContain('"Code","Account","Type","Normal Balance"');
      expect(result.data).toContain('"4100","Service Revenue","INCOME","CREDIT","0.00","5000.00","0.00","5000.00","5000.00"');
    }

    expect(db.reportSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reportType: "books.trial_balance",
        filters: { startDate: "2026-04-01" },
        rowCount: 1,
      }),
    });
  });
});
