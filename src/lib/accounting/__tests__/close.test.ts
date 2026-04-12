import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    fiscalPeriod: {
      findFirst: vi.fn(),
    },
    closeRun: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    closeTask: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    journalEntry: {
      count: vi.fn(),
    },
    bankTransaction: {
      count: vi.fn(),
    },
    approvalRequest: {
      count: vi.fn(),
    },
    salarySlip: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../finance-reports", () => ({
  getAccountsPayableAging: vi.fn(),
  getAccountsReceivableAging: vi.fn(),
  getCashFlowStatement: vi.fn(),
  getGstTieOut: vi.fn(),
  getProfitAndLoss: vi.fn(),
  getTdsTieOut: vi.fn(),
}));

vi.mock("../journals", () => ({
  listJournalEntries: vi.fn(),
}));

vi.mock("../reports", () => ({
  getGeneralLedger: vi.fn(),
  getTrialBalance: vi.fn(),
}));

import { db } from "@/lib/db";
import {
  getAccountsPayableAging,
  getAccountsReceivableAging,
  getCashFlowStatement,
  getGstTieOut,
  getProfitAndLoss,
  getTdsTieOut,
} from "../finance-reports";
import { getCloseWorkspace } from "../close";

describe("close workspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(db.fiscalPeriod.findFirst).mockResolvedValue({
      id: "period-1",
      orgId: "org-1",
      label: "Apr 2026",
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2026-04-30T00:00:00Z"),
      status: "OPEN",
    } as never);

    vi.mocked(db.closeRun.findFirst).mockResolvedValue({
      id: "close-1",
      orgId: "org-1",
      fiscalPeriodId: "period-1",
      status: "DRAFT",
      blockerCount: 0,
      fiscalPeriod: {
        id: "period-1",
      },
      tasks: [],
    } as never);

    vi.mocked(db.journalEntry.count).mockResolvedValue(0 as never);
    vi.mocked(db.bankTransaction.count).mockResolvedValue(2 as never);
    vi.mocked(db.approvalRequest.count).mockResolvedValue(1 as never);
    vi.mocked(db.salarySlip.findMany).mockResolvedValue([] as never);

    vi.mocked(getAccountsReceivableAging).mockResolvedValue({
      totalOutstanding: 0,
      glBalance: 0,
      variance: 0,
    } as never);
    vi.mocked(getAccountsPayableAging).mockResolvedValue({
      totalOutstanding: 0,
      glBalance: 0,
      variance: 0,
    } as never);
    vi.mocked(getGstTieOut).mockResolvedValue({
      outputTax: { variance: 0 },
      inputTax: { variance: 0 },
    } as never);
    vi.mocked(getTdsTieOut).mockResolvedValue({
      receivable: { variance: 0 },
    } as never);
    vi.mocked(getProfitAndLoss).mockResolvedValue({
      current: { totals: { netProfit: 125 } },
    } as never);
    vi.mocked(getCashFlowStatement).mockResolvedValue({
      actualNetCashMovement: 80,
    } as never);

    vi.mocked(db.closeTask.upsert).mockResolvedValue({} as never);
    vi.mocked(db.closeTask.findMany).mockResolvedValue([
      { severity: "blocker", status: "PASSED", createdAt: new Date(), code: "journals_posted" },
      {
        severity: "blocker",
        status: "BLOCKED",
        createdAt: new Date(),
        code: "bank_reconciliation_complete",
      },
      { severity: "blocker", status: "PASSED", createdAt: new Date(), code: "ar_aging_reviewed" },
      { severity: "blocker", status: "PASSED", createdAt: new Date(), code: "ap_aging_reviewed" },
      { severity: "blocker", status: "PASSED", createdAt: new Date(), code: "payroll_posted" },
      { severity: "blocker", status: "PASSED", createdAt: new Date(), code: "gst_tie_out_reviewed" },
      { severity: "blocker", status: "PASSED", createdAt: new Date(), code: "tds_tie_out_reviewed" },
      {
        severity: "blocker",
        status: "BLOCKED",
        createdAt: new Date(),
        code: "approval_exceptions_resolved",
      },
    ] as never);
    vi.mocked(db.closeRun.update).mockImplementation(async ({ data }: any) => ({
      id: "close-1",
      status: data.status,
      blockerCount: data.blockerCount,
      summary: data.summary,
      tasks: vi.mocked(db.closeTask.findMany).mock.results[0]?.value ?? [],
      fiscalPeriod: { id: "period-1" },
    }));
  });

  it("keeps close blocked when reconciliation exceptions and pending approvals remain", async () => {
    const workspace = await getCloseWorkspace("org-1");

    expect(workspace.closeRun.blockerCount).toBe(2);
    expect(workspace.closeRun.status).toBe("BLOCKED");
    expect(db.closeRun.update).toHaveBeenCalledWith({
      where: { id: "close-1" },
      data: expect.objectContaining({
        blockerCount: 2,
        status: "BLOCKED",
        summary: expect.objectContaining({
          bankExceptionCount: 2,
          pendingApprovalCount: 1,
          netProfit: 125,
          cashMovement: 80,
        }),
      }),
      include: {
        fiscalPeriod: true,
        tasks: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });
  });
});
