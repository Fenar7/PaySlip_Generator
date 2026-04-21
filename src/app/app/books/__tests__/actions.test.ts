import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    reportSnapshot: {
      create: vi.fn(),
    },
    journalLine: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    journalEntry: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    glAccount: {
      findMany: vi.fn(),
    },
    orgDefaults: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    fileAttachment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    vendorBill: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    paymentRun: {
      findFirst: vi.fn(),
    },
    approvalRequest: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    fiscalPeriod: {
      findFirst: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/books-permissions", () => ({
  canApprovePaymentRun: vi.fn(),
  canExecuteBooksPaymentRun: vi.fn(),
  canReadBooks: vi.fn(),
  canRejectPaymentRun: vi.fn(),
  canWriteBooks: vi.fn(),
}));

vi.mock("@/lib/plans", () => ({
  checkFeature: vi.fn(),
  checkLimit: vi.fn(),
  getOrgPlan: vi.fn(),
}));

vi.mock("@/lib/accounting", () => ({
  archiveGlAccount: vi.fn(),
  approvePaymentRun: vi.fn(),
  buildAuditPackage: vi.fn(),
  completeCloseRun: vi.fn(),
  confirmBankTransactionMatch: vi.fn(),
  createAdjustingJournalFromBankTransaction: vi.fn(),
  createAndPostJournal: vi.fn(),
  createBankAccount: vi.fn(),
  createGlAccount: vi.fn(),
  createPaymentRun: vi.fn(),
  createVendorBill: vi.fn(),
  createVendorBillPayment: vi.fn(),
  ensureBooksSetup: vi.fn(),
  executePaymentRun: vi.fn(),
  exportReconciliationCsv: vi.fn(),
  getAccountsPayableAging: vi.fn(),
  getAccountsReceivableAging: vi.fn(),
  getBalanceSheet: vi.fn(),
  getBankStatementImportDetail: vi.fn(),
  getCashFlowStatement: vi.fn(),
  getCloseWorkspace: vi.fn(),
  getFiscalPeriodReopenImpact: vi.fn(),
  getGeneralLedger: vi.fn(),
  getGstTieOut: vi.fn(),
  getPaymentRun: vi.fn(),
  getProfitAndLoss: vi.fn(),
  getReconciliationWorkspace: vi.fn(),
  getTdsTieOut: vi.fn(),
  getTrialBalance: vi.fn(),
  getVendorBill: vi.fn(),
  ignoreBankTransaction: vi.fn(),
  importBankStatement: vi.fn(),
  listBankAccounts: vi.fn(),
  listFiscalPeriods: vi.fn(),
  listGlAccounts: vi.fn(),
  listJournalEntries: vi.fn(),
  listPaymentRuns: vi.fn(),
  listVendorBills: vi.fn(),
  lockFiscalPeriod: vi.fn(),
  postJournalEntry: vi.fn(),
  refreshReconciliationSuggestions: vi.fn(),
  rejectBankTransactionMatch: vi.fn(),
  resubmitPaymentRun: vi.fn(),
  reverseJournalEntry: vi.fn(),
  updateCloseTaskStatus: vi.fn(),
  updateVendorBill: vi.fn(),
}));

vi.mock("@/lib/storage/upload-server", () => ({
  getSignedUrlServer: vi.fn(),
  uploadFileServer: vi.fn(),
}));
vi.mock("@/lib/flow/approvals", () => ({
  createApprovalRequest: vi.fn(),
}));
vi.mock("../../flow/approvals/actions", () => ({
  approveRequest: vi.fn(),
  rejectRequest: vi.fn(),
  requestApproval: vi.fn(),
}));

import { requireOrgContext, requireRole } from "@/lib/auth";
import {
  canApprovePaymentRun,
  canExecuteBooksPaymentRun,
  canReadBooks,
  canRejectPaymentRun,
  canWriteBooks,
} from "@/lib/books-permissions";
import { db } from "@/lib/db";
import { createApprovalRequest } from "@/lib/flow/approvals";
import { checkFeature } from "@/lib/plans";
import {
  createAndPostJournal,
  ensureBooksSetup,
  createGlAccount,
  confirmBankTransactionMatch,
  buildAuditPackage,
  getPaymentRun,
  getFiscalPeriodReopenImpact,
  getTrialBalance,
  listFiscalPeriods,
  listGlAccounts,
  listJournalEntries,
  resubmitPaymentRun,
} from "@/lib/accounting";
import { getSignedUrlServer, uploadFileServer } from "@/lib/storage/upload-server";
import { revalidatePath } from "next/cache";
import {
  approveRequest,
  rejectRequest,
  requestApproval,
} from "../../flow/approvals/actions";
import {
  approveBooksPaymentRun,
  createChartAccount,
  exportBooksJournalRegisterCsv,
  exportBooksAuditPackageJson,
  exportBooksPaymentRunPayoutCsv,
  exportBooksTrialBalanceCsv,
  exportChartOfAccountsCsv,
  getBooksSettings,
  getBooksJournalAttachmentDownloadUrl,
  createManualJournal,
  confirmBooksReconciliationMatch,
  rejectBooksPaymentRun,
  reopenBooksClosedPeriod,
  requestBooksPaymentRunApproval,
  resubmitBooksPaymentRun,
  updateBooksSettingsDefaultMappings,
  uploadBooksJournalAttachment,
  requestBooksVendorBillApproval,
} from "../actions";

const ORG_ID = "org-1";
const USER_ID = "user-1";

const DEFAULT_MAPPING_FIELDS = [
  "defaultReceivableAccountId",
  "defaultPayableAccountId",
  "defaultBankAccountId",
  "defaultRevenueAccountId",
  "defaultExpenseAccountId",
  "defaultPayrollExpenseAccountId",
  "defaultPayrollPayableAccountId",
  "defaultGstOutputAccountId",
  "defaultTdsPayableAccountId",
  "defaultGatewayClearingAccountId",
  "defaultSuspenseAccountId",
] as const;

function mockReadAccess() {
  vi.mocked(requireOrgContext).mockResolvedValue({
    orgId: ORG_ID,
    userId: USER_ID,
    role: "admin",
    representedId: null,
    proxyGrantId: null,
    proxyScope: [],
  });
  vi.mocked(requireRole).mockResolvedValue({
    orgId: ORG_ID,
    userId: USER_ID,
    role: "admin",
    representedId: null,
    proxyGrantId: null,
    proxyScope: [],
  });
  vi.mocked(canReadBooks).mockReturnValue(true);
}

function mockWriteAccess() {
  vi.mocked(canWriteBooks).mockReturnValue(true);
  vi.mocked(canApprovePaymentRun).mockReturnValue(true);
  vi.mocked(canExecuteBooksPaymentRun).mockReturnValue(true);
  vi.mocked(canRejectPaymentRun).mockReturnValue(true);
}

function buildValidAccounts() {
  return [
    {
      id: "ar",
      code: "1100",
      name: "Accounts Receivable",
      accountType: "ASSET",
      normalBalance: "DEBIT",
      isActive: true,
      isSystem: true,
      isProtected: true,
      systemKey: null,
    },
    {
      id: "ap",
      code: "2100",
      name: "Accounts Payable",
      accountType: "LIABILITY",
      normalBalance: "CREDIT",
      isActive: true,
      isSystem: true,
      isProtected: true,
      systemKey: null,
    },
    {
      id: "bank",
      code: "1110",
      name: "Primary Bank",
      accountType: "ASSET",
      normalBalance: "DEBIT",
      isActive: true,
      isSystem: true,
      isProtected: true,
      systemKey: null,
    },
    {
      id: "revenue",
      code: "4100",
      name: "Service Revenue",
      accountType: "INCOME",
      normalBalance: "CREDIT",
      isActive: true,
      isSystem: false,
      isProtected: false,
      systemKey: null,
    },
    {
      id: "expense",
      code: "5100",
      name: "Operating Expense",
      accountType: "EXPENSE",
      normalBalance: "DEBIT",
      isActive: true,
      isSystem: false,
      isProtected: false,
      systemKey: null,
    },
    {
      id: "payroll-expense",
      code: "5200",
      name: "Payroll Expense",
      accountType: "EXPENSE",
      normalBalance: "DEBIT",
      isActive: true,
      isSystem: true,
      isProtected: true,
      systemKey: null,
    },
    {
      id: "payroll-payable",
      code: "2210",
      name: "Payroll Payable",
      accountType: "LIABILITY",
      normalBalance: "CREDIT",
      isActive: true,
      isSystem: true,
      isProtected: true,
      systemKey: null,
    },
    {
      id: "gst-output",
      code: "2220",
      name: "GST Output",
      accountType: "LIABILITY",
      normalBalance: "CREDIT",
      isActive: true,
      isSystem: true,
      isProtected: true,
      systemKey: null,
    },
    {
      id: "tds-payable",
      code: "2230",
      name: "TDS Payable",
      accountType: "LIABILITY",
      normalBalance: "CREDIT",
      isActive: true,
      isSystem: true,
      isProtected: true,
      systemKey: null,
    },
    {
      id: "gateway-clearing",
      code: "1190",
      name: "Gateway Clearing",
      accountType: "ASSET",
      normalBalance: "DEBIT",
      isActive: true,
      isSystem: true,
      isProtected: true,
      systemKey: null,
    },
    {
      id: "suspense",
      code: "1199",
      name: "Suspense",
      accountType: "ASSET",
      normalBalance: "DEBIT",
      isActive: true,
      isSystem: true,
      isProtected: true,
      systemKey: null,
    },
    {
      id: "gst-input-tax",
      code: "1185",
      name: "GST Input Tax",
      accountType: "ASSET",
      normalBalance: "DEBIT",
      isActive: true,
      isSystem: true,
      isProtected: true,
      systemKey: "GST_INPUT_TAX",
    },
  ];
}

function buildValidMappings() {
  return {
    defaultReceivableAccountId: "ar",
    defaultPayableAccountId: "ap",
    defaultBankAccountId: "bank",
    defaultRevenueAccountId: "revenue",
    defaultExpenseAccountId: "expense",
    defaultPayrollExpenseAccountId: "payroll-expense",
    defaultPayrollPayableAccountId: "payroll-payable",
    defaultGstOutputAccountId: "gst-output",
    defaultTdsPayableAccountId: "tds-payable",
    defaultGatewayClearingAccountId: "gateway-clearing",
    defaultSuspenseAccountId: "suspense",
  };
}

describe("Books actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockReadAccess();
    mockWriteAccess();
    vi.mocked(checkFeature).mockResolvedValue(true);
    vi.mocked(db.reportSnapshot.create).mockResolvedValue({} as never);
    vi.mocked(db.fileAttachment.findMany).mockResolvedValue([] as never);
  });

  it("returns the Books settings contract with metadata, mappings, and periods", async () => {
    const accounts = buildValidAccounts();

    vi.mocked(ensureBooksSetup).mockResolvedValue({
      templateKey: "india_small_business",
      accountsCreated: 25,
      periodsCreated: 12,
    } as never);
    vi.mocked(db.glAccount.findMany).mockResolvedValue(accounts as never);
    vi.mocked(db.orgDefaults.findUnique).mockResolvedValue({
      booksEnabled: true,
      coaTemplate: "india_small_business",
      coaSeededAt: new Date("2026-04-01T00:00:00Z"),
      country: "IN",
      baseCurrency: "INR",
      fiscalYearStart: 4,
      ...buildValidMappings(),
    } as never);
    vi.mocked(listFiscalPeriods).mockResolvedValue([
      {
        id: "period-1",
        label: "FY26-APR",
        startDate: new Date("2026-04-01T00:00:00Z"),
        endDate: new Date("2026-04-30T00:00:00Z"),
        status: "OPEN",
      },
    ] as never);

    const result = await getBooksSettings();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.templateKey).toBe("india_small_business");
      expect(result.data.metadata.baseCurrency).toBe("INR");
      expect(result.data.defaultMappings).toHaveLength(DEFAULT_MAPPING_FIELDS.length);
      expect(result.data.defaultMappings[0]?.account?.id).toBe("ar");
      expect(result.data.systemAccounts.find((item) => item.key === "GST_INPUT_TAX")?.account?.id).toBe(
        "gst-input-tax",
      );
      expect(result.data.periods[0]?.label).toBe("FY26-APR");
    }
  });

  it("updates valid Books default mappings without rewriting historical journals", async () => {
    const accounts = buildValidAccounts();
    const mappings = buildValidMappings();

    vi.mocked(ensureBooksSetup).mockResolvedValue({
      templateKey: "india_small_business",
      accountsCreated: 25,
      periodsCreated: 12,
    } as never);
    vi.mocked(db.glAccount.findMany).mockResolvedValue(
      accounts.filter((account) => Object.values(mappings).includes(account.id)) as never,
    );
    vi.mocked(db.orgDefaults.update).mockResolvedValue({ id: "defaults-1" } as never);

    const result = await updateBooksSettingsDefaultMappings(mappings);

    expect(result.success).toBe(true);
    expect(db.orgDefaults.update).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      data: mappings,
    });
    expect(db.journalEntry.update).not.toHaveBeenCalled();
    expect(db.journalLine.updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/app/books/settings");
  });

  it("rejects incompatible Books default mappings", async () => {
    const invalidAccounts = [
      {
        id: "bad-payable",
        code: "1101",
        name: "Wrong AP Mapping",
        accountType: "ASSET",
        normalBalance: "DEBIT",
        isActive: true,
        isSystem: false,
        isProtected: false,
        systemKey: null,
      },
    ];

    vi.mocked(ensureBooksSetup).mockResolvedValue({
      templateKey: "india_small_business",
      accountsCreated: 25,
      periodsCreated: 12,
    } as never);
    vi.mocked(db.glAccount.findMany).mockResolvedValue(invalidAccounts as never);

    const result = await updateBooksSettingsDefaultMappings({
      ...buildValidMappings(),
      defaultReceivableAccountId: "bad-payable",
      defaultPayableAccountId: "bad-payable",
      defaultBankAccountId: "bad-payable",
      defaultRevenueAccountId: "bad-payable",
      defaultExpenseAccountId: "bad-payable",
      defaultPayrollExpenseAccountId: "bad-payable",
      defaultPayrollPayableAccountId: "bad-payable",
      defaultGstOutputAccountId: "bad-payable",
      defaultTdsPayableAccountId: "bad-payable",
      defaultGatewayClearingAccountId: "bad-payable",
      defaultSuspenseAccountId: "bad-payable",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Payable control account must use a liability account");
    }
    expect(db.orgDefaults.update).not.toHaveBeenCalled();
  });

  it("uploads journal evidence for posted journals with org-scoped storage", async () => {
    vi.mocked(db.journalEntry.findFirst).mockResolvedValue({
      id: "journal-1",
      status: "POSTED",
    } as never);
    vi.mocked(uploadFileServer).mockResolvedValue({
      storageKey: "attachments/journal-1/support.pdf",
    } as never);
    vi.mocked(db.fileAttachment.create).mockResolvedValue({
      id: "attachment-1",
      fileName: "support.pdf",
    } as never);

    const formData = new FormData();
    formData.set("journalEntryId", "journal-1");
    formData.set("file", new File(["proof"], "support.pdf", { type: "application/pdf" }));

    const result = await uploadBooksJournalAttachment(formData);

    expect(result.success).toBe(true);
    expect(uploadFileServer).toHaveBeenCalledWith(
      "attachments",
      expect.stringContaining(`/journal-1/`),
      expect.any(Buffer),
      "application/pdf",
    );
    expect(db.fileAttachment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG_ID,
        entityType: "journal_entry",
        entityId: "journal-1",
        fileName: "support.pdf",
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/app/books/journals/journal-1");
  });

  it("rejects new evidence uploads for reversed journals", async () => {
    vi.mocked(db.journalEntry.findFirst).mockResolvedValue({
      id: "journal-1",
      status: "REVERSED",
    } as never);

    const formData = new FormData();
    formData.set("journalEntryId", "journal-1");
    formData.set("file", new File(["proof"], "support.pdf", { type: "application/pdf" }));

    const result = await uploadBooksJournalAttachment(formData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("cannot accept new attachments");
    }
    expect(uploadFileServer).not.toHaveBeenCalled();
    expect(db.fileAttachment.create).not.toHaveBeenCalled();
  });

  it("returns signed download URLs only for scoped journal attachments", async () => {
    vi.mocked(db.fileAttachment.findFirst).mockResolvedValue({
      fileName: "support.pdf",
      storageKey: "attachments/journal-1/support.pdf",
    } as never);
    vi.mocked(getSignedUrlServer).mockResolvedValue("https://signed.example/support.pdf" as never);

    const result = await getBooksJournalAttachmentDownloadUrl("attachment-1");

    expect(result.success).toBe(true);
    expect(db.fileAttachment.findFirst).toHaveBeenCalledWith({
      where: {
        id: "attachment-1",
        organizationId: ORG_ID,
        entityType: "journal_entry",
      },
      select: {
        fileName: true,
        storageKey: true,
      },
    });
    expect(getSignedUrlServer).toHaveBeenCalledWith(
      "attachments",
      "attachments/journal-1/support.pdf",
    );
  });

  it("exports the chart of accounts and records a snapshot", async () => {
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
      expect(result.data).toContain(
        '"1100","Cash","ASSET","DEBIT","","2","1000.00","200.00","800.00","System","Active"',
      );
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

  it("exports the journal register with attachment-aware reads and snapshot metadata", async () => {
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
    vi.mocked(db.fileAttachment.findMany).mockResolvedValue([
      { entityId: "journal-1" },
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
      expect(result.data).toContain('"Entry Number","Entry Date","Source","Source Ref"');
      expect(result.data).toContain(
        '"JRN-20260401-ABCD1234","2026-04-01","INVOICE","INV-001","POSTED","Invoice issue","2026-04","1180.00","1180.00","2"',
      );
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
      expect(result.data).toContain(
        '"4100","Service Revenue","INCOME","CREDIT","0.00","5000.00","0.00","5000.00","5000.00"',
      );
    }

    expect(db.reportSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reportType: "books.trial_balance",
        filters: { startDate: "2026-04-01" },
        rowCount: 1,
      }),
    });
  });

  it("creates manual journals and returns the detail target id", async () => {
    vi.mocked(createAndPostJournal).mockResolvedValue({
      id: "journal-9",
      entryNumber: "JRN-20260412-XYZ12345",
    } as never);

    const result = await createManualJournal({
      entryDate: "2026-04-12",
      memo: "Manual adjustment",
      lines: [
        { accountId: "expense", debit: 100 },
        { accountId: "bank", credit: 100 },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("journal-9");
      expect(result.data.entryNumber).toBe("JRN-20260412-XYZ12345");
    }
  });

  it("allows finance managers to perform Books write actions", async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: ORG_ID,
      userId: USER_ID,
      role: "finance_manager",
      representedId: null,
      proxyGrantId: null,
      proxyScope: [],
    });
    vi.mocked(canWriteBooks).mockReturnValue(true);
    vi.mocked(createGlAccount).mockResolvedValue({
      id: "acct-1",
    } as never);

    const result = await createChartAccount({
      code: "5100",
      name: "Office Supplies",
      accountType: "EXPENSE",
    });

    expect(result).toEqual({
      success: true,
      data: { id: "acct-1" },
    });
    expect(createGlAccount).toHaveBeenCalledWith({
      orgId: ORG_ID,
      code: "5100",
      name: "Office Supplies",
      accountType: "EXPENSE",
      parentId: null,
      normalBalance: undefined,
      description: undefined,
    });
  });

  it("blocks Books reads for non-finance roles", async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: ORG_ID,
      userId: USER_ID,
      role: "viewer",
      representedId: null,
      proxyGrantId: null,
      proxyScope: [],
    });
    vi.mocked(canReadBooks).mockReturnValue(false);

    const result = await exportChartOfAccountsCsv();

    expect(result).toEqual({
      success: false,
      error: "Insufficient permissions.",
    });
    expect(listGlAccounts).not.toHaveBeenCalled();
  });

  it("resubmits a draft vendor bill with a fresh approval request", async () => {
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: ORG_ID,
      userId: USER_ID,
      role: "finance_manager",
      representedId: null,
      proxyGrantId: null,
      proxyScope: [],
    });
    vi.mocked(canWriteBooks).mockReturnValue(true);
    vi.mocked(db.vendorBill.findFirst).mockResolvedValue({
      id: "bill-1",
      status: "DRAFT",
    } as never);
    vi.mocked(db.vendorBill.update).mockResolvedValue({} as never);
    vi.mocked(requestApproval)
      .mockResolvedValueOnce({
        success: true,
        data: { id: "approval-1" },
      } as never)
      .mockResolvedValueOnce({
        success: true,
        data: { id: "approval-2" },
      } as never);

    const first = await requestBooksVendorBillApproval("bill-1");
    const second = await requestBooksVendorBillApproval("bill-1");

    expect(first).toEqual({
      success: true,
      data: { id: "approval-1" },
    });
    expect(second).toEqual({
      success: true,
      data: { id: "approval-2" },
    });
    expect(requestApproval).toHaveBeenNthCalledWith(
      1,
      "vendor-bill",
      "bill-1",
    );
    expect(requestApproval).toHaveBeenNthCalledWith(
      2,
      "vendor-bill",
      "bill-1",
    );
    expect(db.vendorBill.update).toHaveBeenCalledTimes(2);
    expect(db.vendorBill.update).toHaveBeenCalledWith({
      where: { id: "bill-1" },
      data: {
        status: "PENDING_APPROVAL",
      },
    });
  });

  it("prevents duplicate payment run approval requests", async () => {
    vi.mocked(db.paymentRun.findFirst).mockResolvedValue({
      id: "run-1",
      status: "DRAFT",
    } as never);
    vi.mocked(db.approvalRequest.findFirst).mockResolvedValue({
      id: "approval-existing",
    } as never);

    const result = await requestBooksPaymentRunApproval("run-1");

    expect(result).toEqual({
      success: false,
      error: "This payment run already has an active approval request.",
    });
    expect(requestApproval).not.toHaveBeenCalled();
  });

  it("routes payment run approvals through the flow approval queue", async () => {
    vi.mocked(db.approvalRequest.findFirst).mockResolvedValue({
      id: "approval-1",
    } as never);
    vi.mocked(approveRequest).mockResolvedValue({
      success: true,
      data: undefined,
    } as never);

    const result = await approveBooksPaymentRun("run-1");

    expect(result).toEqual({ success: true, data: null });
    expect(approveRequest).toHaveBeenCalledWith("approval-1");
  });

  it("routes payment run rejections through the flow approval queue", async () => {
    vi.mocked(db.approvalRequest.findFirst).mockResolvedValue({
      id: "approval-2",
    } as never);
    vi.mocked(rejectRequest).mockResolvedValue({
      success: true,
      data: undefined,
    } as never);

    const result = await rejectBooksPaymentRun({
      paymentRunId: "run-1",
      reason: "Totals need another review",
    });

    expect(result).toEqual({ success: true, data: null });
    expect(rejectRequest).toHaveBeenCalledWith("approval-2", "Totals need another review");
  });

  it("allows only the original requester to resubmit a rejected payment run", async () => {
    vi.mocked(resubmitPaymentRun).mockResolvedValue({
      id: "run-1",
      status: "DRAFT",
    } as never);

    const result = await resubmitBooksPaymentRun("run-1");

    expect(result).toEqual({ success: true, data: null });
    expect(resubmitPaymentRun).toHaveBeenCalledWith({
      orgId: ORG_ID,
      paymentRunId: "run-1",
      actorId: USER_ID,
    });
  });

  it("submits fiscal period reopen requests into the approval workflow", async () => {
    vi.mocked(db.fiscalPeriod.findFirst).mockResolvedValue({
      id: "period-1",
      label: "FY26-MAR",
      status: "LOCKED",
    } as never);
    vi.mocked(db.approvalRequest.findFirst).mockResolvedValue(null as never);
    vi.mocked(db.profile.findUnique).mockResolvedValue({
      name: "Admin User",
    } as never);
    vi.mocked(createApprovalRequest).mockResolvedValue({
      id: "approval-period-1",
    } as never);
    vi.mocked(getFiscalPeriodReopenImpact).mockResolvedValue({
      journalCount: 4,
      postedJournalCount: 3,
      draftJournalCount: 1,
      affectedAccountCount: 2,
      affectedAccounts: [
        { id: "bank", code: "1110", name: "Primary Bank" },
        { id: "ar", code: "1100", name: "Accounts Receivable" },
      ],
      earliestEntryDate: "2026-03-01T00:00:00.000Z",
      latestEntryDate: "2026-03-31T00:00:00.000Z",
      closeCompletedAt: "2026-04-01T09:00:00.000Z",
      sampleEntries: [
        {
          id: "jrnl-1",
          entryNumber: "JE-001",
          entryDate: "2026-03-31T00:00:00.000Z",
          status: "POSTED",
          source: "MANUAL",
          sourceRef: null,
        },
      ],
    } as never);
    vi.mocked(db.approvalRequest.update).mockResolvedValue({} as never);
    vi.mocked(db.auditLog.create).mockResolvedValue({} as never);

    const result = await reopenBooksClosedPeriod("period-1", "Bank statement correction required");

    expect(result).toEqual({ success: true, data: null });
    expect(createApprovalRequest).toHaveBeenCalledWith({
      docType: "fiscal-period-reopen",
      docId: "period-1",
      orgId: ORG_ID,
      requestedById: USER_ID,
      requestedByName: "Admin User",
      docNumber: "FY26-MAR",
    });
    expect(db.approvalRequest.update).toHaveBeenCalledWith({
      where: { id: "approval-period-1" },
      data: { note: "Bank statement correction required" },
    });
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "books.period.reopen_requested",
        metadata: expect.objectContaining({
          reopenImpact: expect.objectContaining({
            journalCount: 4,
            affectedAccountCount: 2,
          }),
        }),
      }),
    });
  });

  it("passes reconciliation reasons through the Books action", async () => {
    vi.mocked(confirmBankTransactionMatch).mockResolvedValue({
      id: "match-1",
    } as never);

    const result = await confirmBooksReconciliationMatch({
      bankTransactionId: "txn-1",
      matchId: "match-1",
      matchedAmount: 125.5,
      reason: "Matched against the customer collection advice.",
    });

    expect(result).toEqual({ success: true, data: { id: "match-1" } });
    expect(confirmBankTransactionMatch).toHaveBeenCalledWith({
      orgId: ORG_ID,
      actorId: USER_ID,
      bankTransactionId: "txn-1",
      matchId: "match-1",
      matchedAmount: 125.5,
      reason: "Matched against the customer collection advice.",
    });
  });

  it("serializes audit package exports deterministically", async () => {
    vi.mocked(buildAuditPackage).mockResolvedValue({
      orgId: ORG_ID,
      generatedAt: "2026-04-30T00:00:00.000Z",
      closeRun: {
        tasks: [{ code: "bank_reconciliation_complete" }],
      },
      fiscalPeriod: {
        label: "FY26-APR",
      },
      reports: {
        zeta: 2,
        alpha: 1,
      },
    } as never);

    const result = await exportBooksAuditPackageJson("period-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(
        JSON.stringify(
          {
            closeRun: {
              tasks: [{ code: "bank_reconciliation_complete" }],
            },
            fiscalPeriod: {
              label: "FY26-APR",
            },
            generatedAt: "2026-04-30T00:00:00.000Z",
            orgId: ORG_ID,
            reports: {
              alpha: 1,
              zeta: 2,
            },
          },
          null,
          2,
        ),
      );
    }
  });

  it("blocks payout exports until a payment run is approved", async () => {
    vi.mocked(getPaymentRun).mockResolvedValue({
      id: "run-1",
      runNumber: "RUN-001",
      status: "REJECTED",
    } as never);

    const result = await exportBooksPaymentRunPayoutCsv("run-1");

    expect(result).toEqual({
      success: false,
      error: "Payout exports are only available for approved, processing, or completed runs.",
    });
  });
});
