"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import type {
  BankAccountType,
  GlAccountType,
  JournalEntryStatus,
  JournalSource,
  NormalBalance,
  PaymentRunStatus,
  Prisma,
  VendorBillStatus,
} from "@/generated/prisma/client";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCSV } from "@/lib/csv";
import { isCsvUpload, isUploadedFile } from "@/lib/server/form-data";
import { getSignedUrlServer, uploadFileServer } from "@/lib/storage/upload-server";
import {
  archiveGlAccount,
  archiveVendorBill,
  approvePaymentRun,
  buildAuditPackage,
  completeCloseRun,
  createAdjustingJournalFromBankTransaction,
  createBankAccount as createBankAccountRecord,
  createAndPostJournal,
  createGlAccount,
  createPaymentRun,
  createVendorBill,
  createVendorBillPayment,
  executePaymentRun,
  exportReconciliationCsv,
  ensureBooksSetup,
  generateBankStatementStoragePath,
  getAccountsPayableAging,
  getAccountsReceivableAging,
  getBalanceSheet,
  getGeneralLedger,
  getBankStatementImportDetail,
  getCloseWorkspace,
  getCashFlowStatement,
  getGstTieOut,
  getPaymentRun,
  getProfitAndLoss,
  getReconciliationWorkspace,
  getTdsTieOut,
  getTrialBalance,
  getVendorBill,
  importBankStatement,
  listFiscalPeriods,
  listGlAccounts,
  listJournalEntries,
  listBankAccounts,
  listPaymentRuns,
  listVendorBills,
  lockFiscalPeriod,
  markCloseRunReopened,
  postJournalEntry,
  refreshReconciliationSuggestions,
  confirmBankTransactionMatch,
  rejectBankTransactionMatch,
  ignoreBankTransaction,
  reopenFiscalPeriod,
  reverseJournalEntry,
  updateCloseTaskStatus,
  updateVendorBill,
} from "@/lib/accounting";
import { checkFeature, checkLimit, getOrgPlan } from "@/lib/plans";
import { requestApproval } from "../flow/approvals/actions";

type ActionResult<T = null> = { success: true; data: T } | { success: false; error: string };

type ChartOfAccountsRow = {
  id: string;
  code: string;
  name: string;
  accountType: GlAccountType;
  normalBalance: NormalBalance;
  parentId: string | null;
  parentName: string | null;
  isSystem: boolean;
  isProtected: boolean;
  isActive: boolean;
  allowManualEntries: boolean;
  entryCount: number;
  totalDebit: number;
  totalCredit: number;
  balance: number;
};

type BooksJournalRegisterRow = {
  id: string;
  entryNumber: string;
  entryDate: Date;
  source: JournalSource;
  sourceRef: string | null;
  status: JournalEntryStatus;
  memo: string | null;
  totalDebit: number;
  totalCredit: number;
  periodLabel: string;
  lineCount: number;
};

async function requireBooksRead() {
  const context = await requireOrgContext();
  const allowed = await checkFeature(context.orgId, "accountingCore");

  if (!allowed) {
    throw new Error("SW Books requires the Starter plan or above.");
  }

  return context;
}

function compactJson(
  input: Record<string, Prisma.InputJsonValue | undefined>,
): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Prisma.InputJsonObject;
}

function formatCsvDate(value: Date | string | null | undefined): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

function formatCsvNumber(value: number): string {
  return value.toFixed(2);
}

async function createBooksReportSnapshot(input: {
  orgId: string;
  userId: string;
  reportType: string;
  filters: Prisma.InputJsonValue;
  rowCount: number;
}) {
  await db.reportSnapshot.create({
    data: {
      orgId: input.orgId,
      reportType: input.reportType,
      filters: input.filters,
      rowCount: input.rowCount,
      downloadedAt: new Date(),
      createdBy: input.userId,
    },
  });
}

function sanitizeStorageSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";
}

function generateVendorBillAttachmentStoragePath(
  orgId: string,
  vendorBillId: string,
  fileName: string,
): string {
  const safeName = sanitizeStorageSegment(fileName);
  return `books/vendor-bills/${orgId}/${vendorBillId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}

async function loadChartOfAccountsData(orgId: string): Promise<ChartOfAccountsRow[]> {
  const [accounts, trialBalance, lineUsage] = await Promise.all([
    listGlAccounts(orgId),
    getTrialBalance(orgId, { includeInactive: true }),
    db.journalLine.findMany({
      where: { orgId },
      select: { accountId: true },
    }),
  ]);

  const balanceByAccount = new Map(
    trialBalance.rows.map((row) => [
      row.id,
      {
        totalDebit: row.totalDebit,
        totalCredit: row.totalCredit,
        balance: row.balance,
      },
    ]),
  );

  const usageByAccount = lineUsage.reduce<Map<string, number>>((acc, line) => {
    acc.set(line.accountId, (acc.get(line.accountId) ?? 0) + 1);
    return acc;
  }, new Map());

  return accounts.map((account) => ({
    id: account.id,
    code: account.code,
    name: account.name,
    accountType: account.accountType,
    normalBalance: account.normalBalance,
    parentId: account.parentId,
    parentName: account.parent?.name ?? null,
    isSystem: account.isSystem,
    isProtected: account.isProtected,
    isActive: account.isActive,
    allowManualEntries: account.allowManualEntries,
    entryCount: usageByAccount.get(account.id) ?? 0,
    totalDebit: balanceByAccount.get(account.id)?.totalDebit ?? 0,
    totalCredit: balanceByAccount.get(account.id)?.totalCredit ?? 0,
    balance: balanceByAccount.get(account.id)?.balance ?? 0,
  }));
}

async function loadBooksJournalRegisterData(
  orgId: string,
  input: {
    status?: JournalEntryStatus;
    source?: JournalSource;
    startDate?: string;
    endDate?: string;
    accountId?: string;
  } = {},
): Promise<BooksJournalRegisterRow[]> {
  const journals = await listJournalEntries(orgId, input);

  return journals.map((journal) => ({
    id: journal.id,
    entryNumber: journal.entryNumber,
    entryDate: journal.entryDate,
    source: journal.source,
    sourceRef: journal.sourceRef,
    status: journal.status,
    memo: journal.memo,
    totalDebit: journal.totalDebit,
    totalCredit: journal.totalCredit,
    periodLabel: journal.fiscalPeriod.label,
    lineCount: journal.lines.length,
  }));
}

async function requireBooksWrite() {
  const context = await requireRole("admin");
  const allowed = await checkFeature(context.orgId, "accountingCore");

  if (!allowed) {
    throw new Error("SW Books requires the Starter plan or above.");
  }

  return context;
}

async function requireBankingRead() {
  const context = await requireBooksRead();
  const allowed = await checkFeature(context.orgId, "bankReconciliation");

  if (!allowed) {
    throw new Error("Bank reconciliation requires the Pro plan or above.");
  }

  return context;
}

async function requireBankingWrite() {
  const context = await requireRole("admin");
  const allowed = await checkFeature(context.orgId, "bankReconciliation");

  if (!allowed) {
    throw new Error("Bank reconciliation requires the Pro plan or above.");
  }

  return context;
}

async function requireVendorBillsRead() {
  const context = await requireBooksRead();
  const allowed = await checkFeature(context.orgId, "vendorBills");

  if (!allowed) {
    throw new Error("Vendor bills require the Starter plan or above.");
  }

  return context;
}

async function requireVendorBillsWrite() {
  const context = await requireRole("admin");
  const allowed = await checkFeature(context.orgId, "vendorBills");

  if (!allowed) {
    throw new Error("Vendor bills require the Starter plan or above.");
  }

  return context;
}

async function requireFinanceReportsRead() {
  const context = await requireBooksRead();
  const allowed = await checkFeature(context.orgId, "financialStatements");

  if (!allowed) {
    throw new Error("Financial statements require the Starter plan or above.");
  }

  return context;
}

async function requireCloseWorkflowRead() {
  const context = await requireBooksRead();
  const allowed = await checkFeature(context.orgId, "closeWorkflow");

  if (!allowed) {
    throw new Error("Financial close requires the Pro plan or above.");
  }

  return context;
}

async function requireCloseWorkflowWrite() {
  const context = await requireRole("admin");
  const allowed = await checkFeature(context.orgId, "closeWorkflow");

  if (!allowed) {
    throw new Error("Financial close requires the Pro plan or above.");
  }

  return context;
}

async function requireAuditPackageRead() {
  const context = await requireRole("admin");
  const allowed = await checkFeature(context.orgId, "auditPackExports");

  if (!allowed) {
    throw new Error("Audit package exports require the Enterprise plan.");
  }

  return context;
}

function revalidateBooksBanking() {
  revalidatePath("/app/books");
  revalidatePath("/app/books/banks");
  revalidatePath("/app/books/reconciliation");
}

function revalidateBooksVendorBills() {
  revalidatePath("/app/books");
  revalidatePath("/app/books/vendor-bills");
  revalidatePath("/app/books/payment-runs");
}

function revalidateBooksReports() {
  revalidatePath("/app/books");
  revalidatePath("/app/books/close");
  revalidatePath("/app/books/reports/profit-loss");
  revalidatePath("/app/books/reports/balance-sheet");
  revalidatePath("/app/books/reports/cash-flow");
  revalidatePath("/app/books/reports/ar-aging");
  revalidatePath("/app/books/reports/ap-aging");
}

export async function getBooksOverview(): Promise<
  ActionResult<{
    setup: { templateKey: string; accountsCreated: number; periodsCreated: number };
    metrics: {
      totalAccounts: number;
      postedJournals: number;
      draftJournals: number;
      openPeriods: number;
      lockedPeriods: number;
    };
    recentJournals: Array<{
      id: string;
      entryNumber: string;
      entryDate: Date;
      source: JournalSource;
      sourceRef: string | null;
      status: JournalEntryStatus;
      totalDebit: number;
      lineCount: number;
    }>;
    periods: Array<{
      id: string;
      label: string;
      startDate: Date;
      endDate: Date;
      status: string;
    }>;
    trialBalance: {
      balanced: boolean;
      debit: number;
      credit: number;
    };
  }>
> {
  try {
    const { orgId } = await requireBooksRead();
    const setup = await ensureBooksSetup(orgId);

    const [totalAccounts, postedJournals, draftJournals, openPeriods, lockedPeriods, periods, recentJournals, trialBalance] =
      await Promise.all([
        db.glAccount.count({ where: { orgId } }),
        db.journalEntry.count({ where: { orgId, status: "POSTED" } }),
        db.journalEntry.count({ where: { orgId, status: "DRAFT" } }),
        db.fiscalPeriod.count({ where: { orgId, status: "OPEN" } }),
        db.fiscalPeriod.count({ where: { orgId, status: "LOCKED" } }),
        db.fiscalPeriod.findMany({
          where: { orgId },
          orderBy: [{ startDate: "desc" }],
          take: 8,
          select: {
            id: true,
            label: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        }),
        db.journalEntry.findMany({
          where: { orgId },
          orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
          take: 8,
          include: {
            lines: {
              select: { id: true },
            },
          },
        }),
        getTrialBalance(orgId),
      ]);

    return {
      success: true,
      data: {
        setup,
        metrics: {
          totalAccounts,
          postedJournals,
          draftJournals,
          openPeriods,
          lockedPeriods,
        },
        recentJournals: recentJournals.map((journal) => ({
          id: journal.id,
          entryNumber: journal.entryNumber,
          entryDate: journal.entryDate,
          source: journal.source,
          sourceRef: journal.sourceRef,
          status: journal.status,
          totalDebit: journal.totalDebit,
          lineCount: journal.lines.length,
        })),
        periods,
        trialBalance: {
          balanced: trialBalance.balanced,
          debit: trialBalance.totals.debit,
          credit: trialBalance.totals.credit,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load SW Books overview.",
    };
  }
}

export async function getChartOfAccounts(): Promise<
  ActionResult<ChartOfAccountsRow[]>
> {
  try {
    const { orgId } = await requireBooksRead();
    const accounts = await loadChartOfAccountsData(orgId);

    return {
      success: true,
      data: accounts,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load chart of accounts.",
    };
  }
}

export async function createChartAccount(input: {
  code: string;
  name: string;
  accountType: GlAccountType;
  parentId?: string;
  normalBalance?: NormalBalance;
  description?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireBooksWrite();
    const account = await createGlAccount({
      orgId,
      code: input.code,
      name: input.name,
      accountType: input.accountType,
      parentId: input.parentId ?? null,
      normalBalance: input.normalBalance,
      description: input.description,
    });

    revalidatePath("/app/books");
    revalidatePath("/app/books/chart-of-accounts");

    return { success: true, data: { id: account.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create account.",
    };
  }
}

export async function archiveChartAccount(accountId: string): Promise<ActionResult> {
  try {
    const { orgId } = await requireBooksWrite();
    await archiveGlAccount(orgId, accountId);

    revalidatePath("/app/books");
    revalidatePath("/app/books/chart-of-accounts");

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive account.",
    };
  }
}

export async function getBooksJournalRegister(input: {
  status?: JournalEntryStatus;
  source?: JournalSource;
  startDate?: string;
  endDate?: string;
  accountId?: string;
} = {}): Promise<ActionResult<BooksJournalRegisterRow[]>> {
  try {
    const { orgId } = await requireBooksRead();
    const journals = await loadBooksJournalRegisterData(orgId, input);

    return {
      success: true,
      data: journals,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load journals.",
    };
  }
}

export async function createManualJournal(input: {
  entryDate: string;
  memo?: string;
  lines: Array<{
    accountId: string;
    description?: string;
    debit?: number;
    credit?: number;
  }>;
}): Promise<ActionResult<{ id: string; entryNumber: string }>> {
  try {
    const { orgId, userId } = await requireBooksWrite();
    const journal = await createAndPostJournal({
      orgId,
      source: "MANUAL",
      entryDate: input.entryDate,
      actorId: userId,
      memo: input.memo,
      manualEntry: true,
      lines: input.lines,
    });

    revalidatePath("/app/books");
    revalidatePath("/app/books/journals");
    revalidatePath("/app/books/ledger");
    revalidatePath("/app/books/trial-balance");

    return {
      success: true,
      data: {
        id: journal.id,
        entryNumber: journal.entryNumber,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create journal.",
    };
  }
}

export async function postBooksJournal(journalEntryId: string): Promise<ActionResult> {
  try {
    const { orgId, userId } = await requireBooksWrite();
    await postJournalEntry({
      orgId,
      journalEntryId,
      actorId: userId,
    });

    revalidatePath("/app/books");
    revalidatePath("/app/books/journals");
    revalidatePath("/app/books/ledger");
    revalidatePath("/app/books/trial-balance");

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post journal.",
    };
  }
}

export async function reverseBooksJournal(
  journalEntryId: string,
  memo?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireBooksWrite();
    const reversal = await reverseJournalEntry({
      orgId,
      journalEntryId,
      actorId: userId,
      memo,
    });

    revalidatePath("/app/books");
    revalidatePath("/app/books/journals");
    revalidatePath("/app/books/ledger");
    revalidatePath("/app/books/trial-balance");

    return {
      success: true,
      data: { id: reversal.id },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reverse journal.",
    };
  }
}

export async function getBooksLedger(input: {
  startDate?: string;
  endDate?: string;
  accountId?: string;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof getGeneralLedger>>>> {
  try {
    const { orgId } = await requireBooksRead();
    const ledger = await getGeneralLedger(orgId, input);

    return {
      success: true,
      data: ledger,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load general ledger.",
    };
  }
}

export async function getBooksTrialBalance(input: {
  startDate?: string;
  endDate?: string;
  includeInactive?: boolean;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof getTrialBalance>>>> {
  try {
    const { orgId } = await requireBooksRead();
    const trialBalance = await getTrialBalance(orgId, input);

    return {
      success: true,
      data: trialBalance,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load trial balance.",
    };
  }
}

export async function exportChartOfAccountsCsv(): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireBooksRead();
    const accounts = await loadChartOfAccountsData(orgId);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.chart_of_accounts",
      filters: compactJson({ includeInactive: true }),
      rowCount: accounts.length,
    });

    return {
      success: true,
      data: generateCSV(
        [
          "Code",
          "Account",
          "Type",
          "Normal Balance",
          "Parent",
          "Entry Count",
          "Total Debit",
          "Total Credit",
          "Net Balance",
          "Class",
          "Status",
        ],
        accounts.map((account) => [
          account.code,
          account.name,
          account.accountType,
          account.normalBalance,
          account.parentName ?? "",
          String(account.entryCount),
          formatCsvNumber(account.totalDebit),
          formatCsvNumber(account.totalCredit),
          formatCsvNumber(account.balance),
          account.isSystem ? "System" : "Custom",
          account.isActive ? "Active" : "Archived",
        ]),
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export chart of accounts.",
    };
  }
}

export async function exportBooksJournalRegisterCsv(input: {
  status?: JournalEntryStatus;
  source?: JournalSource;
  startDate?: string;
  endDate?: string;
  accountId?: string;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireBooksRead();
    const journals = await loadBooksJournalRegisterData(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.journal_register",
      filters: compactJson(input),
      rowCount: journals.length,
    });

    return {
      success: true,
      data: generateCSV(
        [
          "Entry Number",
          "Entry Date",
          "Source",
          "Source Ref",
          "Status",
          "Memo",
          "Period",
          "Total Debit",
          "Total Credit",
          "Line Count",
        ],
        journals.map((journal) => [
          journal.entryNumber,
          formatCsvDate(journal.entryDate),
          journal.source,
          journal.sourceRef ?? "",
          journal.status,
          journal.memo ?? "",
          journal.periodLabel,
          formatCsvNumber(journal.totalDebit),
          formatCsvNumber(journal.totalCredit),
          String(journal.lineCount),
        ]),
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export journal register.",
    };
  }
}

export async function exportBooksLedgerCsv(input: {
  startDate?: string;
  endDate?: string;
  accountId?: string;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireBooksRead();
    const ledger = await getGeneralLedger(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.general_ledger",
      filters: compactJson(input),
      rowCount: ledger.length,
    });

    return {
      success: true,
      data: generateCSV(
        [
          "Entry Date",
          "Entry Number",
          "Account Code",
          "Account Name",
          "Source",
          "Source Ref",
          "Memo",
          "Description",
          "Debit",
          "Credit",
          "Movement",
          "Running Balance",
        ],
        ledger.map((line) => [
          formatCsvDate(line.entryDate),
          line.entryNumber,
          line.accountCode,
          line.accountName,
          line.source,
          line.sourceRef ?? "",
          line.memo ?? "",
          line.description ?? "",
          formatCsvNumber(line.debit),
          formatCsvNumber(line.credit),
          formatCsvNumber(line.movement),
          formatCsvNumber(line.runningBalance),
        ]),
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export general ledger.",
    };
  }
}

export async function exportBooksTrialBalanceCsv(input: {
  startDate?: string;
  endDate?: string;
  includeInactive?: boolean;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireBooksRead();
    const trialBalance = await getTrialBalance(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.trial_balance",
      filters: compactJson(input),
      rowCount: trialBalance.rows.length,
    });

    return {
      success: true,
      data: generateCSV(
        [
          "Code",
          "Account",
          "Type",
          "Normal Balance",
          "Total Debit",
          "Total Credit",
          "Debit Balance",
          "Credit Balance",
          "Net Balance",
        ],
        trialBalance.rows.map((row) => [
          row.code,
          row.name,
          row.accountType,
          row.normalBalance,
          formatCsvNumber(row.totalDebit),
          formatCsvNumber(row.totalCredit),
          formatCsvNumber(row.debitBalance),
          formatCsvNumber(row.creditBalance),
          formatCsvNumber(row.balance),
        ]),
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export trial balance.",
    };
  }
}

export async function getBooksPeriods(): Promise<ActionResult<Awaited<ReturnType<typeof listFiscalPeriods>>>> {
  try {
    const { orgId } = await requireBooksRead();
    const periods = await listFiscalPeriods(orgId);

    return {
      success: true,
      data: periods,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load fiscal periods.",
    };
  }
}

export async function lockBooksPeriod(periodId: string): Promise<ActionResult> {
  try {
    const { orgId, userId } = await requireBooksWrite();
    await lockFiscalPeriod({
      orgId,
      periodId,
      actorId: userId,
    });

    revalidatePath("/app/books");

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to lock fiscal period.",
    };
  }
}

export async function reopenBooksPeriod(
  periodId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await requireBooksWrite();
    await reopenFiscalPeriod({
      orgId,
      periodId,
      actorId: userId,
      reason,
    });

    revalidatePath("/app/books");

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reopen fiscal period.",
    };
  }
}

export async function getBooksBankAccounts(): Promise<
  ActionResult<Awaited<ReturnType<typeof listBankAccounts>>>
> {
  try {
    const { orgId } = await requireBankingRead();
    const accounts = await listBankAccounts(orgId);

    return { success: true, data: accounts };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load bank accounts.",
    };
  }
}

export async function createBooksBankAccount(input: {
  name: string;
  type: BankAccountType;
  bankName?: string;
  maskedAccountNo?: string;
  ifscOrSwift?: string;
  currency?: string;
  openingBalance?: number;
  openingBalanceDate?: string;
  isPrimary?: boolean;
  gatewayClearingAccountId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireBankingWrite();
    const orgPlan = await getOrgPlan(orgId);
    const limit = orgPlan.limits.bankAccounts;
    const current = await db.bankAccount.count({ where: { orgId } });

    if (limit !== -1 && current >= limit) {
      return {
        success: false,
        error: `Your current plan allows ${limit} bank account${limit === 1 ? "" : "s"}.`,
      };
    }

    const account = await createBankAccountRecord({
      orgId,
      actorId: userId,
      name: input.name,
      type: input.type,
      bankName: input.bankName,
      maskedAccountNo: input.maskedAccountNo,
      ifscOrSwift: input.ifscOrSwift,
      currency: input.currency,
      openingBalance: input.openingBalance,
      openingBalanceDate: input.openingBalanceDate,
      isPrimary: input.isPrimary,
      gatewayClearingAccountId: input.gatewayClearingAccountId,
    });

    revalidateBooksBanking();

    return { success: true, data: { id: account.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create bank account.",
    };
  }
}

export async function uploadBooksBankStatement(
  formData: FormData,
): Promise<
  ActionResult<{
    importId: string;
    importedRows: number;
    failedRows: Array<{ rowNumber: number; error: string; raw: Record<string, string> }>;
    transactionCount: number;
  }>
> {
  try {
    const { orgId, userId } = await requireBankingWrite();
    const limitCheck = await checkLimit(orgId, "statementImportsPerMonth");

    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `Statement import limit reached for this month (${limitCheck.current}/${limitCheck.limit}).`,
      };
    }

    const bankAccountId = String(formData.get("bankAccountId") ?? "").trim();
    const mappingRaw = String(formData.get("mapping") ?? "").trim();
    const file = formData.get("file");

    if (!bankAccountId) {
      return { success: false, error: "Bank account is required." };
    }

    if (!isUploadedFile(file)) {
      return { success: false, error: "CSV file is required." };
    }

    if (!isCsvUpload(file)) {
      return { success: false, error: "Only CSV bank statements are supported." };
    }

    const csvText = await file.text();
    const checksum = crypto.createHash("sha256").update(csvText).digest("hex");
    const storagePath = generateBankStatementStoragePath(orgId, bankAccountId, file.name);
    const uploaded = await uploadFileServer(
      "attachments",
      storagePath,
      Buffer.from(csvText, "utf8"),
      file.type || "text/csv",
    );

    const result = await importBankStatement({
      orgId,
      actorId: userId,
      bankAccountId,
      fileName: file.name,
      storageKey: uploaded.storageKey,
      checksum,
      csvText,
      mapping: JSON.parse(mappingRaw || "{}") as Record<string, unknown>,
    });

    revalidateBooksBanking();
    revalidatePath(`/app/books/reconciliation/imports/${result.importId}`);

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import bank statement.",
    };
  }
}

export async function getBooksReconciliationWorkspace(input: {
  bankAccountId?: string;
  importId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof getReconciliationWorkspace>>>> {
  try {
    const { orgId } = await requireBankingRead();
    const workspace = await getReconciliationWorkspace(orgId, input);
    return { success: true, data: workspace };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load reconciliation workspace.",
    };
  }
}

export async function getBooksBankImportDetail(
  importId: string,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof getBankStatementImportDetail>>>>> {
  try {
    const { orgId } = await requireBankingRead();
    const detail = await getBankStatementImportDetail(orgId, importId);

    if (!detail) {
      return { success: false, error: "Bank statement import not found." };
    }

    return { success: true, data: detail };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load import detail.",
    };
  }
}

export async function refreshBooksReconciliationSuggestions(input: {
  bankAccountId?: string;
  importId?: string;
} = {}): Promise<ActionResult<{ refreshed: number }>> {
  try {
    const { orgId } = await requireBankingWrite();
    const result = await refreshReconciliationSuggestions(orgId, input);
    revalidateBooksBanking();
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh suggestions.",
    };
  }
}

export async function confirmBooksReconciliationMatch(input: {
  bankTransactionId: string;
  matchId: string;
  matchedAmount?: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireBankingWrite();
    const match = await confirmBankTransactionMatch({
      orgId,
      actorId: userId,
      bankTransactionId: input.bankTransactionId,
      matchId: input.matchId,
      matchedAmount: input.matchedAmount,
    });

    revalidateBooksBanking();

    return { success: true, data: { id: match.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to confirm reconciliation match.",
    };
  }
}

export async function rejectBooksReconciliationMatch(input: {
  bankTransactionId: string;
  matchId: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireBankingWrite();
    const match = await rejectBankTransactionMatch({
      orgId,
      actorId: userId,
      bankTransactionId: input.bankTransactionId,
      matchId: input.matchId,
    });

    revalidateBooksBanking();

    return { success: true, data: { id: match.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject reconciliation match.",
    };
  }
}

export async function ignoreBooksBankTransaction(
  bankTransactionId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireBankingWrite();
    const transaction = await ignoreBankTransaction({
      orgId,
      actorId: userId,
      bankTransactionId,
    });

    revalidateBooksBanking();

    return { success: true, data: { id: transaction.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to ignore bank transaction.",
    };
  }
}

export async function createBooksBankAdjustmentJournal(input: {
  bankTransactionId: string;
  offsetAccountId: string;
  memo?: string;
}): Promise<ActionResult<{ id: string; entryNumber: string }>> {
  try {
    const { orgId, userId } = await requireBankingWrite();
    const journal = await createAdjustingJournalFromBankTransaction({
      orgId,
      actorId: userId,
      bankTransactionId: input.bankTransactionId,
      offsetAccountId: input.offsetAccountId,
      memo: input.memo,
    });

    revalidateBooksBanking();
    revalidatePath("/app/books/journals");
    revalidatePath("/app/books/ledger");
    revalidatePath("/app/books/trial-balance");

    return {
      success: true,
      data: {
        id: journal.id,
        entryNumber: journal.entryNumber,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create adjusting journal.",
    };
  }
}

export async function exportBooksReconciliationCsv(input: {
  bankAccountId?: string;
  importId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireBankingRead();
    const workspace = await getReconciliationWorkspace(orgId, input);
    const csv = await exportReconciliationCsv(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.reconciliation",
      filters: compactJson({
        bankAccountId: input.bankAccountId,
        importId: input.importId,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        minAmount: input.minAmount,
        maxAmount: input.maxAmount,
      }),
      rowCount: workspace.transactions.length,
    });

    return { success: true, data: csv };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export reconciliation data.",
    };
  }
}

export async function getBooksVendorBillFormOptions(): Promise<
  ActionResult<{
    vendors: Array<{ id: string; name: string; gstin: string | null }>;
    expenseAccounts: Array<{ id: string; code: string; name: string }>;
  }>
> {
  try {
    const { orgId } = await requireVendorBillsRead();
    const [vendors, expenseAccounts] = await Promise.all([
      db.vendor.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          gstin: true,
        },
        orderBy: { name: "asc" },
      }),
      db.glAccount.findMany({
        where: {
          orgId,
          isActive: true,
          accountType: "EXPENSE",
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: [{ code: "asc" }],
      }),
    ]);

    return {
      success: true,
      data: {
        vendors,
        expenseAccounts,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load vendor bill options.",
    };
  }
}

export async function getBooksPaymentRunOptions(): Promise<
  ActionResult<{
    bills: Array<{
      id: string;
      billNumber: string;
      dueDate: string | null;
      remainingAmount: number;
      vendorName: string | null;
      status: VendorBillStatus;
    }>;
  }>
> {
  try {
    const { orgId } = await requireVendorBillsRead();
    const bills = await db.vendorBill.findMany({
      where: {
        orgId,
        archivedAt: null,
        status: {
          in: ["APPROVED", "OVERDUE", "PARTIALLY_PAID"],
        },
        remainingAmount: { gt: 0 },
      },
      select: {
        id: true,
        billNumber: true,
        dueDate: true,
        remainingAmount: true,
        status: true,
        vendor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { billNumber: "asc" }],
    });

    return {
      success: true,
      data: {
        bills: bills.map((bill) => ({
          id: bill.id,
          billNumber: bill.billNumber,
          dueDate: bill.dueDate,
          remainingAmount: bill.remainingAmount,
          vendorName: bill.vendor?.name ?? null,
          status: bill.status,
        })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load payment run options.",
    };
  }
}

export async function getBooksVendorBills(input: {
  status?: VendorBillStatus;
  vendorId?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof listVendorBills>>>> {
  try {
    const { orgId } = await requireVendorBillsRead();
    const data = await listVendorBills(orgId, input);

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load vendor bills.",
    };
  }
}

export async function getBooksVendorBill(
  vendorBillId: string,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof getVendorBill>>>>> {
  try {
    const { orgId } = await requireVendorBillsRead();
    const bill = await getVendorBill(orgId, vendorBillId);

    if (!bill) {
      return { success: false, error: "Vendor bill not found." };
    }

    return { success: true, data: bill };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load vendor bill.",
    };
  }
}

export async function createBooksVendorBill(input: {
  vendorId?: string | null;
  expenseAccountId?: string | null;
  billDate: string;
  dueDate?: string | null;
  currency?: string | null;
  notes?: string | null;
  status?: VendorBillStatus;
  formData?: Prisma.InputJsonValue;
  lines: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    taxRate?: number;
  }>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireVendorBillsWrite();
    const limitCheck = await checkLimit(orgId, "vendorBillsPerMonth");

    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `Vendor bill limit reached for this month (${limitCheck.current}/${limitCheck.limit}).`,
      };
    }

    const bill = await createVendorBill({
      orgId,
      actorId: userId,
      vendorId: input.vendorId,
      expenseAccountId: input.expenseAccountId,
      billDate: input.billDate,
      dueDate: input.dueDate,
      currency: input.currency,
      notes: input.notes,
      status: input.status,
      formData: input.formData,
      lines: input.lines,
    });

    revalidateBooksVendorBills();
    revalidateBooksReports();

    return { success: true, data: { id: bill.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create vendor bill.",
    };
  }
}

export async function updateBooksVendorBill(
  vendorBillId: string,
  input: {
    vendorId?: string | null;
    expenseAccountId?: string | null;
    billDate?: string;
    dueDate?: string | null;
    currency?: string | null;
    notes?: string | null;
    status?: VendorBillStatus;
    formData?: Prisma.InputJsonValue;
    lines?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      taxRate?: number;
    }>;
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireVendorBillsWrite();
    const bill = await updateVendorBill(orgId, vendorBillId, {
      ...input,
      actorId: userId,
    });

    revalidateBooksVendorBills();
    revalidatePath(`/app/books/vendor-bills/${vendorBillId}`);
    revalidateBooksReports();

    return { success: true, data: { id: bill.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update vendor bill.",
    };
  }
}

export async function archiveBooksVendorBill(vendorBillId: string): Promise<ActionResult> {
  try {
    const { orgId } = await requireVendorBillsWrite();
    await archiveVendorBill(orgId, vendorBillId);

    revalidateBooksVendorBills();
    revalidateBooksReports();

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive vendor bill.",
    };
  }
}

export async function requestBooksVendorBillApproval(
  vendorBillId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireVendorBillsWrite();
    const bill = await db.vendorBill.findFirst({
      where: {
        id: vendorBillId,
        orgId,
        archivedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!bill) {
      return { success: false, error: "Vendor bill not found." };
    }

    if (bill.status !== "DRAFT") {
      return { success: false, error: "Only draft vendor bills can be submitted for approval." };
    }

    await db.vendorBill.update({
      where: { id: vendorBillId },
      data: {
        status: "PENDING_APPROVAL",
      },
    });

    const approval = await requestApproval("vendor-bill", vendorBillId);
    if (!approval.success) {
      await db.vendorBill.update({
        where: { id: vendorBillId },
        data: {
          status: "DRAFT",
        },
      });
      return approval;
    }

    revalidateBooksVendorBills();
    revalidatePath(`/app/books/vendor-bills/${vendorBillId}`);

    return approval;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to request vendor bill approval.",
    };
  }
}

export async function recordBooksVendorBillPayment(input: {
  vendorBillId: string;
  amount: number;
  paidAt?: string;
  method?: string | null;
  note?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireVendorBillsWrite();
    const payment = await createVendorBillPayment({
      orgId,
      actorId: userId,
      vendorBillId: input.vendorBillId,
      amount: input.amount,
      paidAt: input.paidAt ? new Date(`${input.paidAt}T00:00:00.000Z`) : undefined,
      method: input.method,
      note: input.note,
    });

    revalidateBooksVendorBills();
    revalidatePath(`/app/books/vendor-bills/${input.vendorBillId}`);
    revalidateBooksReports();
    revalidateBooksBanking();

    return { success: true, data: { id: payment.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record vendor bill payment.",
    };
  }
}

export async function uploadBooksVendorBillAttachment(
  formData: FormData,
): Promise<ActionResult<{ id: string; fileName: string }>> {
  try {
    const { orgId } = await requireVendorBillsWrite();
    const vendorBillId = String(formData.get("vendorBillId") ?? "").trim();
    const file = formData.get("file");

    if (!vendorBillId) {
      return { success: false, error: "Vendor bill is required." };
    }

    if (!isUploadedFile(file)) {
      return { success: false, error: "Attachment file is required." };
    }

    const bill = await db.vendorBill.findFirst({
      where: {
        id: vendorBillId,
        orgId,
        archivedAt: null,
      },
      select: { id: true },
    });

    if (!bill) {
      return { success: false, error: "Vendor bill not found." };
    }

    const uploaded = await uploadFileServer(
      "attachments",
      generateVendorBillAttachmentStoragePath(orgId, vendorBillId, file.name),
      Buffer.from(await file.arrayBuffer()),
      file.type || "application/octet-stream",
    );

    const attachment = await db.fileAttachment.create({
      data: {
        organizationId: orgId,
        entityType: "vendor_bill",
        entityId: vendorBillId,
        fileName: file.name,
        storageKey: uploaded.storageKey,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      },
    });

    revalidateBooksVendorBills();
    revalidatePath(`/app/books/vendor-bills/${vendorBillId}`);

    return {
      success: true,
      data: {
        id: attachment.id,
        fileName: attachment.fileName,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload vendor bill attachment.",
    };
  }
}

export async function getBooksVendorBillAttachmentDownloadUrl(
  attachmentId: string,
): Promise<ActionResult<{ url: string; fileName: string }>> {
  try {
    const { orgId } = await requireVendorBillsRead();
    const attachment = await db.fileAttachment.findFirst({
      where: {
        id: attachmentId,
        organizationId: orgId,
        entityType: "vendor_bill",
      },
      select: {
        fileName: true,
        storageKey: true,
      },
    });

    if (!attachment) {
      return { success: false, error: "Attachment not found." };
    }

    const url = await getSignedUrlServer("attachments", attachment.storageKey);

    return {
      success: true,
      data: {
        url,
        fileName: attachment.fileName,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to prepare attachment download.",
    };
  }
}

export async function getBooksPaymentRuns(input: {
  status?: PaymentRunStatus;
  page?: number;
  limit?: number;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof listPaymentRuns>>>> {
  try {
    const { orgId } = await requireVendorBillsRead();
    const data = await listPaymentRuns(orgId, input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load payment runs.",
    };
  }
}

export async function getBooksPaymentRun(
  paymentRunId: string,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof getPaymentRun>>>>> {
  try {
    const { orgId } = await requireVendorBillsRead();
    const run = await getPaymentRun(orgId, paymentRunId);

    if (!run) {
      return { success: false, error: "Payment run not found." };
    }

    return { success: true, data: run };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load payment run.",
    };
  }
}

export async function createBooksPaymentRun(input: {
  scheduledDate: string;
  notes?: string | null;
  items: Array<{
    vendorBillId: string;
    amount: number;
  }>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireVendorBillsWrite();
    const run = await createPaymentRun({
      orgId,
      actorId: userId,
      scheduledDate: new Date(`${input.scheduledDate}T00:00:00.000Z`),
      notes: input.notes,
      items: input.items,
    });

    revalidateBooksVendorBills();
    revalidatePath(`/app/books/payment-runs/${run.id}`);

    return { success: true, data: { id: run.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create payment run.",
    };
  }
}

export async function requestBooksPaymentRunApproval(
  paymentRunId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireVendorBillsWrite();
    const run = await db.paymentRun.findFirst({
      where: {
        id: paymentRunId,
        orgId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!run) {
      return { success: false, error: "Payment run not found." };
    }

    if (run.status !== "DRAFT") {
      return { success: false, error: "Only draft payment runs can be submitted for approval." };
    }

    await db.paymentRun.update({
      where: { id: paymentRunId },
      data: {
        status: "PENDING_APPROVAL",
      },
    });

    const approval = await requestApproval("payment-run", paymentRunId);
    if (!approval.success) {
      await db.paymentRun.update({
        where: { id: paymentRunId },
        data: {
          status: "DRAFT",
        },
      });
      return approval;
    }

    revalidateBooksVendorBills();
    revalidatePath(`/app/books/payment-runs/${paymentRunId}`);

    return approval;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to request payment run approval.",
    };
  }
}

export async function approveBooksPaymentRun(
  paymentRunId: string,
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await requireVendorBillsWrite();
    await approvePaymentRun(orgId, paymentRunId, userId);

    revalidateBooksVendorBills();
    revalidatePath(`/app/books/payment-runs/${paymentRunId}`);

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve payment run.",
    };
  }
}

export async function executeBooksPaymentRun(input: {
  paymentRunId: string;
  paidAt?: string;
  method?: string | null;
  note?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireVendorBillsWrite();
    const run = await executePaymentRun({
      orgId,
      actorId: userId,
      paymentRunId: input.paymentRunId,
      paidAt: input.paidAt ? new Date(`${input.paidAt}T00:00:00.000Z`) : undefined,
      method: input.method,
      note: input.note,
    });

    revalidateBooksVendorBills();
    revalidatePath(`/app/books/payment-runs/${input.paymentRunId}`);
    revalidateBooksReports();
    revalidateBooksBanking();

    return { success: true, data: { id: run.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute payment run.",
    };
  }
}

export async function markBooksPaymentRunItemFailed(input: {
  paymentRunId: string;
  paymentRunItemId: string;
  reason: string;
}): Promise<ActionResult> {
  try {
    const { orgId, userId } = await requireVendorBillsWrite();
    const reason = input.reason.trim();

    if (!reason) {
      return { success: false, error: "Failure reason is required." };
    }

    await db.$transaction(async (tx) => {
      const item = await tx.paymentRunItem.findFirst({
        where: {
          id: input.paymentRunItemId,
          paymentRunId: input.paymentRunId,
          paymentRun: {
            orgId,
          },
        },
        include: {
          paymentRun: {
            select: {
              id: true,
              runNumber: true,
              status: true,
            },
          },
          vendorBill: {
            select: {
              billNumber: true,
            },
          },
        },
      });

      if (!item) {
        throw new Error("Payment run item not found.");
      }

      if (item.paymentRun.status === "DRAFT" || item.paymentRun.status === "PENDING_APPROVAL") {
        throw new Error("Only approved or processing payment runs can mark items as failed.");
      }

      if (item.paymentRun.status === "COMPLETED" || item.paymentRun.status === "CANCELLED") {
        throw new Error("Completed or cancelled payment runs cannot be updated.");
      }

      if (item.status === "PAID") {
        throw new Error("Paid items cannot be marked as failed.");
      }

      if (item.status === "FAILED") {
        throw new Error("This payment run item is already marked as failed.");
      }

      await tx.paymentRunItem.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
        },
      });

      const remainingOpenItems = await tx.paymentRunItem.count({
        where: {
          paymentRunId: input.paymentRunId,
          status: {
            in: ["PENDING", "APPROVED"],
          },
        },
      });

      await tx.paymentRun.update({
        where: { id: input.paymentRunId },
        data: {
          status: remainingOpenItems === 0 ? "FAILED" : "PROCESSING",
        },
      });

      await tx.auditLog.create({
        data: {
          orgId,
          actorId: userId,
          action: "books.payment_run.item_failed",
          entityType: "payment_run_item",
          entityId: item.id,
          metadata: {
            paymentRunId: input.paymentRunId,
            runNumber: item.paymentRun.runNumber,
            billNumber: item.vendorBill.billNumber,
            reason,
          },
        },
      });
    });

    revalidateBooksVendorBills();
    revalidatePath(`/app/books/payment-runs/${input.paymentRunId}`);

    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update payment run item.",
    };
  }
}

export async function exportBooksPaymentRunPayoutCsv(
  paymentRunId: string,
): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireVendorBillsRead();
    const run = await getPaymentRun(orgId, paymentRunId);

    if (!run) {
      return { success: false, error: "Payment run not found." };
    }

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.payment_run_payout",
      filters: compactJson({ paymentRunId }),
      rowCount: run.items.length,
    });

    const csv = generateCSV(
      [
        "Run Number",
        "Scheduled Date",
        "Bill Number",
        "Vendor",
        "Due Date",
        "Proposed Amount",
        "Approved Amount",
        "Status",
        "Payment Reference",
      ],
      run.items.map((item, index) => [
        run.runNumber,
        formatCsvDate(run.scheduledDate),
        item.vendorBill.billNumber,
        item.vendorBill.vendor?.name ?? "",
        formatCsvDate(item.vendorBill.dueDate),
        formatCsvNumber(item.proposedAmount),
        formatCsvNumber(item.approvedAmount ?? item.proposedAmount),
        item.status,
        item.executedPayment?.externalReferenceId ??
          item.executedPayment?.externalPaymentId ??
          `${run.runNumber}-${String(index + 1).padStart(2, "0")}`,
      ]),
    );

    return { success: true, data: csv };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export payment run payout file.",
    };
  }
}

export async function getBooksCloseWorkspace(
  fiscalPeriodId?: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getCloseWorkspace>>>> {
  try {
    const { orgId } = await requireCloseWorkflowRead();
    const workspace = await getCloseWorkspace(orgId, fiscalPeriodId);
    return { success: true, data: workspace };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load close workspace.",
    };
  }
}

export async function markBooksCloseTaskReviewed(input: {
  fiscalPeriodId: string;
  code:
    | "ar_aging_reviewed"
    | "ap_aging_reviewed"
    | "gst_tie_out_reviewed"
    | "tds_tie_out_reviewed";
  status: "PASSED" | "WAIVED";
  note?: string | null;
}): Promise<ActionResult> {
  try {
    const { orgId, userId } = await requireCloseWorkflowWrite();
    await updateCloseTaskStatus({
      orgId,
      fiscalPeriodId: input.fiscalPeriodId,
      actorId: userId,
      code: input.code,
      status: input.status,
      note: input.note,
    });

    revalidateBooksReports();
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update close checklist.",
    };
  }
}

export async function completeBooksClose(input: {
  fiscalPeriodId: string;
  notes?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireCloseWorkflowWrite();
    const closeRun = await completeCloseRun({
      orgId,
      fiscalPeriodId: input.fiscalPeriodId,
      actorId: userId,
      notes: input.notes,
    });

    revalidateBooksReports();
    return { success: true, data: { id: closeRun.id } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to close fiscal period.",
    };
  }
}

export async function reopenBooksClosedPeriod(
  periodId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { orgId, userId } = await requireCloseWorkflowWrite();
    await reopenFiscalPeriod({
      orgId,
      periodId,
      actorId: userId,
      reason,
    });
    await markCloseRunReopened({
      orgId,
      fiscalPeriodId: periodId,
      actorId: userId,
      reason,
    });

    revalidateBooksReports();
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reopen fiscal period.",
    };
  }
}

export async function exportBooksAuditPackageJson(
  fiscalPeriodId: string,
): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireAuditPackageRead();
    const auditPackage = await buildAuditPackage(orgId, fiscalPeriodId);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.audit_package",
      filters: compactJson({ fiscalPeriodId }),
      rowCount: auditPackage.closeRun.tasks.length,
    });

    return {
      success: true,
      data: JSON.stringify(auditPackage, null, 2),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export audit package.",
    };
  }
}

export async function getBooksProfitLoss(input: {
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof getProfitAndLoss>>>> {
  try {
    const { orgId } = await requireFinanceReportsRead();
    const data = await getProfitAndLoss(orgId, input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load profit and loss.",
    };
  }
}

export async function getBooksBalanceSheet(input: {
  asOfDate?: string;
  compareAsOfDate?: string;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof getBalanceSheet>>>> {
  try {
    const { orgId } = await requireFinanceReportsRead();
    const data = await getBalanceSheet(orgId, input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load balance sheet.",
    };
  }
}

export async function getBooksCashFlow(input: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof getCashFlowStatement>>>> {
  try {
    const { orgId } = await requireFinanceReportsRead();
    const data = await getCashFlowStatement(orgId, input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load cash flow.",
    };
  }
}

export async function getBooksAccountsReceivableAging(input: {
  asOfDate?: string;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof getAccountsReceivableAging>>>> {
  try {
    const { orgId } = await requireFinanceReportsRead();
    const data = await getAccountsReceivableAging(orgId, input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load receivables aging.",
    };
  }
}

export async function getBooksAccountsPayableAging(input: {
  asOfDate?: string;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof getAccountsPayableAging>>>> {
  try {
    const { orgId } = await requireFinanceReportsRead();
    const data = await getAccountsPayableAging(orgId, input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load payables aging.",
    };
  }
}

export async function getBooksGstTieOutAction(input: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof getGstTieOut>>>> {
  try {
    const { orgId } = await requireFinanceReportsRead();
    const data = await getGstTieOut(orgId, input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load GST tie-out.",
    };
  }
}

export async function getBooksTdsTieOutAction(input: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<ActionResult<Awaited<ReturnType<typeof getTdsTieOut>>>> {
  try {
    const { orgId } = await requireFinanceReportsRead();
    const data = await getTdsTieOut(orgId, input);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load TDS tie-out.",
    };
  }
}

export async function exportBooksProfitLossCsv(input: {
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireFinanceReportsRead();
    const report = await getProfitAndLoss(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.profit_loss",
      filters: compactJson(input),
      rowCount: report.current.income.length + report.current.expenses.length,
    });

    return {
      success: true,
      data: generateCSV(
        ["Section", "Code", "Account", "Amount"],
        [
          ...report.current.income.map((row) => ["Income", row.code, row.name, formatCsvNumber(row.amount)]),
          ...report.current.expenses.map((row) => ["Expense", row.code, row.name, formatCsvNumber(row.amount)]),
          ["Summary", "", "Net Profit", formatCsvNumber(report.current.totals.netProfit)],
        ],
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export profit and loss.",
    };
  }
}

export async function exportBooksBalanceSheetCsv(input: {
  asOfDate?: string;
  compareAsOfDate?: string;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireFinanceReportsRead();
    const report = await getBalanceSheet(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.balance_sheet",
      filters: compactJson(input),
      rowCount:
        report.current.assets.length + report.current.liabilities.length + report.current.equity.length,
    });

    return {
      success: true,
      data: generateCSV(
        ["Section", "Code", "Account", "Amount"],
        [
          ...report.current.assets.map((row) => ["Assets", row.code, row.name, formatCsvNumber(row.amount)]),
          ...report.current.liabilities.map((row) => [
            "Liabilities",
            row.code,
            row.name,
            formatCsvNumber(row.amount),
          ]),
          ...report.current.equity.map((row) => ["Equity", row.code, row.name, formatCsvNumber(row.amount)]),
        ],
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export balance sheet.",
    };
  }
}

export async function exportBooksCashFlowCsv(input: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireFinanceReportsRead();
    const report = await getCashFlowStatement(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.cash_flow",
      filters: compactJson(input),
      rowCount: report.adjustments.length + 4,
    });

    return {
      success: true,
      data: generateCSV(
        ["Category", "Item", "Amount"],
        [
          ["Operating", "Net Profit", formatCsvNumber(report.netProfit)],
          ...report.adjustments.map((row) => ["Operating", row.label, formatCsvNumber(row.amount)]),
          ["Summary", "Net Cash From Operating", formatCsvNumber(report.netCashFromOperating)],
          ["Summary", "Opening Cash", formatCsvNumber(report.openingCash)],
          ["Summary", "Closing Cash", formatCsvNumber(report.closingCash)],
          ["Summary", "Actual Net Cash Movement", formatCsvNumber(report.actualNetCashMovement)],
        ],
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export cash flow.",
    };
  }
}

export async function exportBooksAccountsReceivableAgingCsv(input: {
  asOfDate?: string;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireFinanceReportsRead();
    const report = await getAccountsReceivableAging(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.ar_aging",
      filters: compactJson(input),
      rowCount: report.rows.length,
    });

    return {
      success: true,
      data: generateCSV(
        ["Invoice", "Customer", "Invoice Date", "Due Date", "Outstanding", "Days Overdue", "Bucket"],
        report.rows.map((row) => [
          row.number,
          row.partyName ?? "",
          row.issueDate,
          row.dueDate ?? "",
          formatCsvNumber(row.outstandingAmount),
          String(row.daysOverdue),
          row.bucket,
        ]),
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export receivables aging.",
    };
  }
}

export async function exportBooksAccountsPayableAgingCsv(input: {
  asOfDate?: string;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireFinanceReportsRead();
    const report = await getAccountsPayableAging(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.ap_aging",
      filters: compactJson(input),
      rowCount: report.rows.length,
    });

    return {
      success: true,
      data: generateCSV(
        ["Bill", "Vendor", "Bill Date", "Due Date", "Outstanding", "Days Overdue", "Bucket"],
        report.rows.map((row) => [
          row.number,
          row.partyName ?? "",
          row.issueDate,
          row.dueDate ?? "",
          formatCsvNumber(row.outstandingAmount),
          String(row.daysOverdue),
          row.bucket,
        ]),
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export payables aging.",
    };
  }
}

export async function exportBooksGstTieOutCsv(input: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireFinanceReportsRead();
    const report = await getGstTieOut(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.gst_tie_out",
      filters: compactJson(input),
      rowCount: 2,
    });

    return {
      success: true,
      data: generateCSV(
        ["Metric", "Documents", "Ledger", "Variance"],
        [
          [
            "GST Output Tax",
            formatCsvNumber(report.outputTax.documents),
            formatCsvNumber(report.outputTax.ledger),
            formatCsvNumber(report.outputTax.variance),
          ],
          [
            "GST Input Tax",
            formatCsvNumber(report.inputTax.documents),
            formatCsvNumber(report.inputTax.ledger),
            formatCsvNumber(report.inputTax.variance),
          ],
        ],
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export GST tie-out.",
    };
  }
}

export async function exportBooksTdsTieOutCsv(input: {
  startDate?: string;
  endDate?: string;
} = {}): Promise<ActionResult<string>> {
  try {
    const { orgId, userId } = await requireFinanceReportsRead();
    const report = await getTdsTieOut(orgId, input);

    await createBooksReportSnapshot({
      orgId,
      userId,
      reportType: "books.tds_tie_out",
      filters: compactJson(input),
      rowCount: 2,
    });

    return {
      success: true,
      data: generateCSV(
        ["Metric", "Documents", "Ledger", "Variance"],
        [
          [
            "TDS Receivable",
            formatCsvNumber(report.receivable.documents),
            formatCsvNumber(report.receivable.ledger),
            formatCsvNumber(report.receivable.variance),
          ],
          [
            "TDS Payable",
            "",
            formatCsvNumber(report.payable.ledger),
            "",
          ],
        ],
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export TDS tie-out.",
    };
  }
}
