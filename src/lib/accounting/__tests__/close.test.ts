import { beforeEach, describe, expect, it, vi } from "vitest";
import { canonicalize } from "@/lib/audit/forensic";

vi.mock("@/lib/db", () => ({
  db: {
    fiscalPeriod: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
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
    fileAttachment: {
      findMany: vi.fn(),
    },
    auditLog: {
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
import { getGeneralLedger, getTrialBalance } from "../reports";
import { listJournalEntries } from "../journals";
import { buildAuditPackage, getCloseWorkspace } from "../close";

describe("close workspace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    const closeTasks = [
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
    ];

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
      completedAt: new Date("2026-04-30T09:00:00Z"),
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
    vi.mocked(db.closeTask.findMany).mockResolvedValue(closeTasks as never);
    vi.mocked(listJournalEntries).mockResolvedValue([
      { id: "je-2", entryNumber: "JE-002", entryDate: new Date("2026-04-02T00:00:00Z") },
      { id: "je-1", entryNumber: "JE-001", entryDate: new Date("2026-04-01T00:00:00Z") },
    ] as never);
    vi.mocked(getTrialBalance).mockResolvedValue([
      { accountCode: "1100", debit: 10, credit: 0 },
    ] as never);
    vi.mocked(getGeneralLedger).mockResolvedValue([
      {
        id: "line-b",
        accountId: "cash",
        accountCode: "1010",
        accountName: "Cash",
        accountType: "ASSET",
        entryId: "entry-2",
        entryNumber: "JE-002",
        entryDate: new Date("2026-04-01T00:00:00Z"),
        source: "MANUAL",
        sourceRef: null,
        memo: null,
        description: "Later tie-break",
        debit: 0,
        credit: 5,
        movement: -5,
        runningBalance: 5,
      },
      {
        id: "line-a",
        accountId: "cash",
        accountCode: "1010",
        accountName: "Cash",
        accountType: "ASSET",
        entryId: "entry-1",
        entryNumber: "JE-001",
        entryDate: new Date("2026-04-01T00:00:00Z"),
        source: "MANUAL",
        sourceRef: null,
        memo: null,
        description: "Earlier tie-break",
        debit: 10,
        credit: 0,
        movement: 10,
        runningBalance: 10,
      },
    ] as never);
    vi.mocked(db.fileAttachment.findMany).mockResolvedValue([
      {
        id: "att-2",
        entityType: "journal_entry",
        entityId: "entry-2",
        fileName: "b.pdf",
        mimeType: "application/pdf",
        size: 20,
        storageKey: "files/b.pdf",
        createdAt: new Date("2026-04-02T00:00:00Z"),
      },
      {
        id: "att-1",
        entityType: "journal_entry",
        entityId: "entry-1",
        fileName: "a.pdf",
        mimeType: "application/pdf",
        size: 10,
        storageKey: "files/a.pdf",
        createdAt: new Date("2026-04-02T00:00:00Z"),
      },
    ] as never);
    vi.mocked(db.fiscalPeriod.findMany).mockResolvedValue([
      {
        id: "period-older",
        label: "Mar 2026",
        reopenReason: "Older",
        reopenedAt: new Date("2026-04-10T00:00:00Z"),
      },
      {
        id: "period-newer",
        label: "Apr 2026",
        reopenReason: "Newer",
        reopenedAt: new Date("2026-04-10T00:00:00Z"),
      },
    ] as never);
    vi.mocked(db.auditLog.findMany).mockResolvedValue([] as never);
    vi.mocked(db.closeRun.update).mockImplementation(async ({ data }: any) => ({
      id: "close-1",
      status: data.status,
      blockerCount: data.blockerCount,
      summary: data.summary,
      tasks: closeTasks,
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

  it("builds audit packages with deterministic real assembly ordering assumptions", async () => {
    const first = await buildAuditPackage("org-1", "period-1");
    const second = await buildAuditPackage("org-1", "period-1");

    expect(canonicalize(first)).toBe(canonicalize(second));
    expect(first.generalLedger.map((line) => line.id)).toEqual(["line-b", "line-a"]);
    expect(first.attachmentIndex.map((attachment) => attachment.id)).toEqual(["att-2", "att-1"]);
    expect(first.reopenedPeriods.map((period) => period.id)).toEqual([
      "period-older",
      "period-newer",
    ]);
  });
});
