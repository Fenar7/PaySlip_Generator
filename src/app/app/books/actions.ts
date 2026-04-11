"use server";

import { revalidatePath } from "next/cache";
import type {
  GlAccountType,
  JournalEntryStatus,
  JournalSource,
  NormalBalance,
  Prisma,
} from "@/generated/prisma/client";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCSV } from "@/lib/csv";
import {
  archiveGlAccount,
  createAndPostJournal,
  createGlAccount,
  ensureBooksSetup,
  getGeneralLedger,
  getTrialBalance,
  listFiscalPeriods,
  listGlAccounts,
  listJournalEntries,
  lockFiscalPeriod,
  postJournalEntry,
  reopenFiscalPeriod,
  reverseJournalEntry,
} from "@/lib/accounting";
import { checkFeature } from "@/lib/plans/enforcement";

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
