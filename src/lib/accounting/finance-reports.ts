import "server-only";

import { db } from "@/lib/db";
import { getAgingReport } from "@/lib/cash-flow";
import { SYSTEM_ACCOUNT_KEYS } from "./accounts";
import { getTrialBalance } from "./reports";
import { formatIsoDate, parseAccountingDate, roundMoney, toAccountingNumber } from "./utils";
import { refreshVendorBillOverdueStates } from "./vendor-bills";

interface DateRangeInput {
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
  asOfDate?: string;
  compareAsOfDate?: string;
}

interface StatementRow {
  id: string;
  code: string;
  name: string;
  amount: number;
}

interface AccountDirectoryRow {
  id: string;
  code: string;
  name: string;
  accountType: string;
  normalBalance: "DEBIT" | "CREDIT";
  systemKey: string | null;
}

interface AgingDetailRow {
  id: string;
  number: string;
  partyName: string | null;
  issueDate: string;
  dueDate: string | null;
  outstandingAmount: number;
  daysOverdue: number;
  bucket: string;
}

const AGING_BUCKETS = [
  { label: "Current", min: -Infinity, max: 0 },
  { label: "1-30 days", min: 1, max: 30 },
  { label: "31-60 days", min: 31, max: 60 },
  { label: "61-90 days", min: 61, max: 90 },
  { label: "90+ days", min: 91, max: Infinity },
] as const;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIsoDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function resolveRange(startDate?: string, endDate?: string) {
  return {
    startDate: startDate ?? monthStartIsoDate(),
    endDate: endDate ?? todayIsoDate(),
  };
}

function resolveAsOfDate(asOfDate?: string) {
  return asOfDate ?? todayIsoDate();
}

function previousIsoDate(value: string) {
  const date = parseAccountingDate(value);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function sortStatementRows(rows: StatementRow[]) {
  return [...rows].sort((left, right) => left.code.localeCompare(right.code));
}

function sumRows(rows: StatementRow[]) {
  return roundMoney(rows.reduce((sum, row) => sum + row.amount, 0));
}

function daysPastDue(dueDate: Date | string | null | undefined, asOfDate: string) {
  if (!dueDate) {
    return 0;
  }

  const due = parseAccountingDate(dueDate).getTime();
  const asOf = parseAccountingDate(asOfDate).getTime();
  return Math.max(0, Math.floor((asOf - due) / (24 * 60 * 60 * 1000)));
}

function agingBucketForDays(days: number) {
  return AGING_BUCKETS.find((bucket) => days >= bucket.min && days <= bucket.max)?.label ?? "Current";
}

function summarizeAging(rows: AgingDetailRow[]) {
  const totals = new Map<string, { count: number; total: number }>();

  for (const bucket of AGING_BUCKETS) {
    totals.set(bucket.label, { count: 0, total: 0 });
  }

  for (const row of rows) {
    const current = totals.get(row.bucket);
    if (!current) {
      continue;
    }
    current.count += 1;
    current.total = roundMoney(current.total + row.outstandingAmount);
  }

  const grandTotal = roundMoney(rows.reduce((sum, row) => sum + row.outstandingAmount, 0));

  return AGING_BUCKETS.map((bucket) => {
    const current = totals.get(bucket.label) ?? { count: 0, total: 0 };
    return {
      label: bucket.label,
      count: current.count,
      total: current.total,
      percentage: grandTotal > 0 ? roundMoney((current.total / grandTotal) * 100) : 0,
    };
  });
}

async function loadAccountDirectory(orgId: string): Promise<AccountDirectoryRow[]> {
  return db.glAccount.findMany({
    where: { orgId },
    select: {
      id: true,
      code: true,
      name: true,
      accountType: true,
      normalBalance: true,
      systemKey: true,
    },
    orderBy: [{ code: "asc" }],
  });
}

async function loadAccountBalancesAsOf(orgId: string, endDate: string) {
  const [trialBalance, accounts] = await Promise.all([
    getTrialBalance(orgId, { endDate, includeInactive: true }),
    loadAccountDirectory(orgId),
  ]);

  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const balanceByAccount = new Map(
    trialBalance.rows.map((row) => [
      row.id,
      {
        balance: row.balance,
        totalDebit: row.totalDebit,
        totalCredit: row.totalCredit,
      },
    ]),
  );

  return {
    trialBalance,
    accounts,
    accountById,
    balanceByAccount,
  };
}

function accountBalanceBySystemKey(
  accounts: AccountDirectoryRow[],
  balanceByAccount: Map<string, { balance: number }>,
  systemKey: string,
) {
  return roundMoney(
    accounts
      .filter((account) => account.systemKey === systemKey)
      .reduce((sum, account) => sum + (balanceByAccount.get(account.id)?.balance ?? 0), 0),
  );
}

function cashBalance(
  accounts: AccountDirectoryRow[],
  balanceByAccount: Map<string, { balance: number }>,
  bankLedgerAccountIds: Set<string>,
) {
  return roundMoney(
    accounts
      .filter(
        (account) =>
          bankLedgerAccountIds.has(account.id) || account.systemKey === SYSTEM_ACCOUNT_KEYS.PRIMARY_BANK,
      )
      .reduce((sum, account) => sum + (balanceByAccount.get(account.id)?.balance ?? 0), 0),
  );
}

function statementRowsForTypes(
  rows: Awaited<ReturnType<typeof getTrialBalance>>["rows"],
  accountTypes: string[],
) {
  return sortStatementRows(
    rows
      .filter((row) => accountTypes.includes(row.accountType) && Math.abs(row.balance) > 0.0001)
      .map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        amount: roundMoney(row.balance),
      })),
  );
}

async function buildProfitAndLossSnapshot(
  orgId: string,
  input: Pick<DateRangeInput, "startDate" | "endDate"> = {},
) {
  const period = resolveRange(input.startDate, input.endDate);
  const trialBalance = await getTrialBalance(orgId, {
    startDate: period.startDate,
    endDate: period.endDate,
    includeInactive: true,
  });

  const income = statementRowsForTypes(trialBalance.rows, ["INCOME"]);
  const expenses = statementRowsForTypes(trialBalance.rows, ["EXPENSE"]);
  const totalIncome = sumRows(income);
  const totalExpenses = sumRows(expenses);

  return {
    period,
    income,
    expenses,
    totals: {
      income: totalIncome,
      expenses: totalExpenses,
      netProfit: roundMoney(totalIncome - totalExpenses),
    },
  };
}

async function buildBalanceSheetSnapshot(orgId: string, asOfDate: string) {
  const { trialBalance } = await loadAccountBalancesAsOf(orgId, asOfDate);
  const assets = statementRowsForTypes(trialBalance.rows, ["ASSET"]);
  const liabilities = statementRowsForTypes(trialBalance.rows, ["LIABILITY"]);
  const equity = statementRowsForTypes(trialBalance.rows, ["EQUITY"]);
  const retained = await buildProfitAndLossSnapshot(orgId, { endDate: asOfDate, startDate: "2000-01-01" });

  const currentEarnings = {
    id: "current_earnings",
    code: "9999",
    name: "Current Earnings",
    amount: retained.totals.netProfit,
  };

  const totalAssets = sumRows(assets);
  const totalLiabilities = sumRows(liabilities);
  const totalEquity = roundMoney(sumRows(equity) + currentEarnings.amount);

  return {
    asOfDate,
    assets,
    liabilities,
    equity: currentEarnings.amount !== 0 ? [...equity, currentEarnings] : equity,
    totals: {
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: totalEquity,
      variance: roundMoney(totalAssets - totalLiabilities - totalEquity),
    },
  };
}

export async function getProfitAndLoss(orgId: string, input: DateRangeInput = {}) {
  const current = await buildProfitAndLossSnapshot(orgId, input);
  const comparison =
    input.compareStartDate || input.compareEndDate
      ? await buildProfitAndLossSnapshot(orgId, {
          startDate: input.compareStartDate,
          endDate: input.compareEndDate,
        })
      : null;

  return {
    current,
    comparison,
  };
}

export async function getBalanceSheet(orgId: string, input: DateRangeInput = {}) {
  const current = await buildBalanceSheetSnapshot(orgId, resolveAsOfDate(input.asOfDate ?? input.endDate));
  const comparison =
    input.compareAsOfDate || input.compareEndDate
      ? await buildBalanceSheetSnapshot(
          orgId,
          resolveAsOfDate(input.compareAsOfDate ?? input.compareEndDate),
        )
      : null;

  return {
    current,
    comparison,
  };
}

export async function getCashFlowStatement(orgId: string, input: DateRangeInput = {}) {
  const period = resolveRange(input.startDate, input.endDate);
  const [profitAndLoss, openingBalances, closingBalances, bankAccounts] = await Promise.all([
    buildProfitAndLossSnapshot(orgId, period),
    loadAccountBalancesAsOf(orgId, previousIsoDate(period.startDate)),
    loadAccountBalancesAsOf(orgId, period.endDate),
    db.bankAccount.findMany({
      where: { orgId, isActive: true },
      select: { glAccountId: true },
    }),
  ]);

  const bankLedgerAccountIds = new Set(bankAccounts.map((account) => account.glAccountId));
  const openingCash = cashBalance(openingBalances.accounts, openingBalances.balanceByAccount, bankLedgerAccountIds);
  const closingCash = cashBalance(closingBalances.accounts, closingBalances.balanceByAccount, bankLedgerAccountIds);
  const arDelta = roundMoney(
    accountBalanceBySystemKey(
      closingBalances.accounts,
      closingBalances.balanceByAccount,
      SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE,
    ) -
      accountBalanceBySystemKey(
        openingBalances.accounts,
        openingBalances.balanceByAccount,
        SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE,
      ),
  );
  const apDelta = roundMoney(
    accountBalanceBySystemKey(
      closingBalances.accounts,
      closingBalances.balanceByAccount,
      SYSTEM_ACCOUNT_KEYS.ACCOUNTS_PAYABLE,
    ) -
      accountBalanceBySystemKey(
        openingBalances.accounts,
        openingBalances.balanceByAccount,
        SYSTEM_ACCOUNT_KEYS.ACCOUNTS_PAYABLE,
      ),
  );
  const gstOutputDelta = roundMoney(
    accountBalanceBySystemKey(
      closingBalances.accounts,
      closingBalances.balanceByAccount,
      SYSTEM_ACCOUNT_KEYS.GST_OUTPUT_TAX,
    ) -
      accountBalanceBySystemKey(
        openingBalances.accounts,
        openingBalances.balanceByAccount,
        SYSTEM_ACCOUNT_KEYS.GST_OUTPUT_TAX,
      ),
  );
  const gstInputDelta = roundMoney(
    accountBalanceBySystemKey(
      closingBalances.accounts,
      closingBalances.balanceByAccount,
      SYSTEM_ACCOUNT_KEYS.GST_INPUT_TAX,
    ) -
      accountBalanceBySystemKey(
        openingBalances.accounts,
        openingBalances.balanceByAccount,
        SYSTEM_ACCOUNT_KEYS.GST_INPUT_TAX,
      ),
  );
  const tdsReceivableDelta = roundMoney(
    accountBalanceBySystemKey(
      closingBalances.accounts,
      closingBalances.balanceByAccount,
      SYSTEM_ACCOUNT_KEYS.TDS_RECEIVABLE,
    ) -
      accountBalanceBySystemKey(
        openingBalances.accounts,
        openingBalances.balanceByAccount,
        SYSTEM_ACCOUNT_KEYS.TDS_RECEIVABLE,
      ),
  );
  const tdsPayableDelta = roundMoney(
    accountBalanceBySystemKey(
      closingBalances.accounts,
      closingBalances.balanceByAccount,
      SYSTEM_ACCOUNT_KEYS.TDS_PAYABLE,
    ) -
      accountBalanceBySystemKey(
        openingBalances.accounts,
        openingBalances.balanceByAccount,
        SYSTEM_ACCOUNT_KEYS.TDS_PAYABLE,
      ),
  );

  const adjustments = [
    { label: "Change in Accounts Receivable", amount: roundMoney(-arDelta) },
    { label: "Change in Accounts Payable", amount: roundMoney(apDelta) },
    { label: "Change in GST Output Tax", amount: roundMoney(gstOutputDelta) },
    { label: "Change in GST Input Tax", amount: roundMoney(-gstInputDelta) },
    { label: "Change in TDS Receivable", amount: roundMoney(-tdsReceivableDelta) },
    { label: "Change in TDS Payable", amount: roundMoney(tdsPayableDelta) },
  ];

  const totalAdjustments = roundMoney(adjustments.reduce((sum, row) => sum + row.amount, 0));
  const netCashFromOperating = roundMoney(profitAndLoss.totals.netProfit + totalAdjustments);
  const actualNetCashMovement = roundMoney(closingCash - openingCash);

  return {
    period,
    openingCash,
    closingCash,
    netProfit: profitAndLoss.totals.netProfit,
    adjustments,
    totalAdjustments,
    netCashFromOperating,
    actualNetCashMovement,
    reconciliationDifference: roundMoney(netCashFromOperating - actualNetCashMovement),
  };
}

export async function getAccountsReceivableAging(orgId: string, input: DateRangeInput = {}) {
  const asOfDate = resolveAsOfDate(input.asOfDate ?? input.endDate);
  const [invoices, balanceSnapshot, summaryBuckets] = await Promise.all([
    db.invoice.findMany({
      where: {
        organizationId: orgId,
        archivedAt: null,
        invoiceDate: { lte: parseAccountingDate(asOfDate) },
        status: { notIn: ["DRAFT", "PAID", "CANCELLED"] },
        remainingAmount: { gt: 0 },
      },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        remainingAmount: true,
        customer: { select: { name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { invoiceDate: "asc" }],
    }),
    loadAccountBalancesAsOf(orgId, asOfDate),
    getAgingReport(orgId),
  ]);

  const rows = invoices.map<AgingDetailRow>((invoice) => {
    const overdueDays = daysPastDue(invoice.dueDate, asOfDate);
    return {
      id: invoice.id,
      number: invoice.invoiceNumber,
      partyName: invoice.customer?.name ?? null,
      issueDate: formatIsoDate(invoice.invoiceDate),
      dueDate: invoice.dueDate ? formatIsoDate(invoice.dueDate) : null,
      outstandingAmount: roundMoney(invoice.remainingAmount),
      daysOverdue: overdueDays,
      bucket: agingBucketForDays(overdueDays),
    };
  });

  const totalOutstanding = roundMoney(rows.reduce((sum, row) => sum + row.outstandingAmount, 0));
  const glBalance = accountBalanceBySystemKey(
    balanceSnapshot.accounts,
    balanceSnapshot.balanceByAccount,
    SYSTEM_ACCOUNT_KEYS.ACCOUNTS_RECEIVABLE,
  );

  return {
    asOfDate,
    rows,
    buckets: summarizeAging(rows),
    summaryBuckets,
    totalOutstanding,
    glBalance,
    variance: roundMoney(glBalance - totalOutstanding),
  };
}

export async function getAccountsPayableAging(orgId: string, input: DateRangeInput = {}) {
  const asOfDate = resolveAsOfDate(input.asOfDate ?? input.endDate);
  await refreshVendorBillOverdueStates(orgId);

  const [bills, balanceSnapshot] = await Promise.all([
    db.vendorBill.findMany({
      where: {
        orgId,
        archivedAt: null,
        billDate: { lte: parseAccountingDate(asOfDate) },
        status: { notIn: ["DRAFT", "CANCELLED", "PAID"] },
        remainingAmount: { gt: 0 },
      },
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        dueDate: true,
        remainingAmount: true,
        vendor: { select: { name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { billDate: "asc" }],
    }),
    loadAccountBalancesAsOf(orgId, asOfDate),
  ]);

  const rows = bills.map<AgingDetailRow>((bill) => {
    const overdueDays = daysPastDue(bill.dueDate, asOfDate);
    return {
      id: bill.id,
      number: bill.billNumber,
      partyName: bill.vendor?.name ?? null,
      issueDate: formatIsoDate(bill.billDate),
      dueDate: bill.dueDate ? formatIsoDate(bill.dueDate) : null,
      outstandingAmount: roundMoney(bill.remainingAmount),
      daysOverdue: overdueDays,
      bucket: agingBucketForDays(overdueDays),
    };
  });

  const totalOutstanding = roundMoney(rows.reduce((sum, row) => sum + row.outstandingAmount, 0));
  const glBalance = accountBalanceBySystemKey(
    balanceSnapshot.accounts,
    balanceSnapshot.balanceByAccount,
    SYSTEM_ACCOUNT_KEYS.ACCOUNTS_PAYABLE,
  );

  return {
    asOfDate,
    rows,
    buckets: summarizeAging(rows),
    totalOutstanding,
    glBalance,
    variance: roundMoney(glBalance - totalOutstanding),
  };
}

export async function getGstTieOut(orgId: string, input: DateRangeInput = {}) {
  const period = resolveRange(input.startDate, input.endDate);
  const [invoiceAggregate, billAggregate, accounts] = await Promise.all([
    db.invoice.aggregate({
      where: {
        organizationId: orgId,
        archivedAt: null,
        invoiceDate: {
          gte: parseAccountingDate(period.startDate),
          lte: parseAccountingDate(period.endDate),
        },
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
      _sum: {
        gstTotalCgst: true,
        gstTotalSgst: true,
        gstTotalIgst: true,
        gstTotalCess: true,
      },
    }),
    db.vendorBill.aggregate({
      where: {
        orgId,
        archivedAt: null,
        billDate: {
          gte: parseAccountingDate(period.startDate),
          lte: parseAccountingDate(period.endDate),
        },
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
      _sum: {
        gstTotalCgst: true,
        gstTotalSgst: true,
        gstTotalIgst: true,
        gstTotalCess: true,
      },
    }),
    loadAccountBalancesAsOf(orgId, period.endDate),
  ]);

  const outputDocuments = roundMoney(
    toAccountingNumber(invoiceAggregate._sum.gstTotalCgst ?? 0) +
      toAccountingNumber(invoiceAggregate._sum.gstTotalSgst ?? 0) +
      toAccountingNumber(invoiceAggregate._sum.gstTotalIgst ?? 0) +
      toAccountingNumber(invoiceAggregate._sum.gstTotalCess ?? 0),
  );
  const inputDocuments = roundMoney(
    toAccountingNumber(billAggregate._sum.gstTotalCgst ?? 0) +
      toAccountingNumber(billAggregate._sum.gstTotalSgst ?? 0) +
      toAccountingNumber(billAggregate._sum.gstTotalIgst ?? 0) +
      toAccountingNumber(billAggregate._sum.gstTotalCess ?? 0),
  );
  const outputLedger = accountBalanceBySystemKey(
    accounts.accounts,
    accounts.balanceByAccount,
    SYSTEM_ACCOUNT_KEYS.GST_OUTPUT_TAX,
  );
  const inputLedger = accountBalanceBySystemKey(
    accounts.accounts,
    accounts.balanceByAccount,
    SYSTEM_ACCOUNT_KEYS.GST_INPUT_TAX,
  );

  return {
    period,
    outputTax: {
      documents: outputDocuments,
      ledger: outputLedger,
      variance: roundMoney(outputLedger - outputDocuments),
    },
    inputTax: {
      documents: inputDocuments,
      ledger: inputLedger,
      variance: roundMoney(inputLedger - inputDocuments),
    },
  };
}

export async function getTdsTieOut(orgId: string, input: DateRangeInput = {}) {
  const period = resolveRange(input.startDate, input.endDate);
  const [records, accounts] = await Promise.all([
    db.tdsRecord.aggregate({
      where: {
        organizationId: orgId,
        invoice: {
          invoiceDate: {
            gte: parseAccountingDate(period.startDate),
            lte: parseAccountingDate(period.endDate),
          },
        },
      },
      _sum: {
        tdsAmount: true,
      },
    }),
    loadAccountBalancesAsOf(orgId, period.endDate),
  ]);

  const documentTds = roundMoney(toAccountingNumber(records._sum.tdsAmount ?? 0));
  const receivableLedger = accountBalanceBySystemKey(
    accounts.accounts,
    accounts.balanceByAccount,
    SYSTEM_ACCOUNT_KEYS.TDS_RECEIVABLE,
  );
  const payableLedger = accountBalanceBySystemKey(
    accounts.accounts,
    accounts.balanceByAccount,
    SYSTEM_ACCOUNT_KEYS.TDS_PAYABLE,
  );

  return {
    period,
    receivable: {
      documents: documentTds,
      ledger: receivableLedger,
      variance: roundMoney(receivableLedger - documentTds),
    },
    payable: {
      ledger: payableLedger,
    },
  };
}
