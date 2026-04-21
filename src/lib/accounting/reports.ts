import "server-only";

import { db } from "@/lib/db";
import type { GlAccountType, NormalBalance, Prisma } from "@/generated/prisma/client";
import { ensureBooksSetup } from "./accounts";
import { parseAccountingDate, roundMoney, toAccountingNumber } from "./utils";

interface DateRangeInput {
  startDate?: string;
  endDate?: string;
}

function buildEntryDateFilter(startDate?: string, endDate?: string): Prisma.DateTimeFilter | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }

  return {
    ...(startDate ? { gte: parseAccountingDate(startDate) } : {}),
    ...(endDate ? { lte: parseAccountingDate(endDate) } : {}),
  };
}

function computeSignedBalance(
  normalBalance: NormalBalance,
  totalDebit: number,
  totalCredit: number,
): number {
  return roundMoney(
    normalBalance === "DEBIT" ? totalDebit - totalCredit : totalCredit - totalDebit,
  );
}

export async function getTrialBalance(
  orgId: string,
  input: DateRangeInput & { includeInactive?: boolean } = {},
) {
  await ensureBooksSetup(orgId);

  const accounts = await db.glAccount.findMany({
    where: input.includeInactive ? { orgId } : { orgId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  const postedLines = await db.journalLine.findMany({
    where: {
      orgId,
      journalEntry: {
        status: "POSTED",
        ...(buildEntryDateFilter(input.startDate, input.endDate)
          ? { entryDate: buildEntryDateFilter(input.startDate, input.endDate) }
          : {}),
      },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
    },
  });

  const totalsByAccount = new Map<string, { debit: number; credit: number }>();

  for (const line of postedLines) {
    const current = totalsByAccount.get(line.accountId) ?? { debit: 0, credit: 0 };
    current.debit = roundMoney(current.debit + toAccountingNumber(line.debit));
    current.credit = roundMoney(current.credit + toAccountingNumber(line.credit));
    totalsByAccount.set(line.accountId, current);
  }

  const rows = accounts
    .map((account) => {
      const totals = totalsByAccount.get(account.id) ?? { debit: 0, credit: 0 };
      const balance = computeSignedBalance(account.normalBalance, totals.debit, totals.credit);
      const debitBalance = balance > 0 && account.normalBalance === "DEBIT" ? balance : 0;
      const creditBalance = balance > 0 && account.normalBalance === "CREDIT" ? balance : 0;
      const contraDebitBalance =
        balance < 0 && account.normalBalance === "CREDIT" ? Math.abs(balance) : 0;
      const contraCreditBalance =
        balance < 0 && account.normalBalance === "DEBIT" ? Math.abs(balance) : 0;

      return {
        id: account.id,
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        totalDebit: totals.debit,
        totalCredit: totals.credit,
        balance,
        debitBalance: roundMoney(debitBalance + contraDebitBalance),
        creditBalance: roundMoney(creditBalance + contraCreditBalance),
      };
    })
    .filter((row) => row.totalDebit !== 0 || row.totalCredit !== 0 || input.includeInactive);

  const totals = rows.reduce(
    (acc, row) => ({
      debit: roundMoney(acc.debit + row.debitBalance),
      credit: roundMoney(acc.credit + row.creditBalance),
    }),
    { debit: 0, credit: 0 },
  );

  return {
    rows,
    totals,
    balanced: totals.debit === totals.credit,
  };
}

export async function getGeneralLedger(
  orgId: string,
  input: DateRangeInput & { accountId?: string } = {},
) {
  await ensureBooksSetup(orgId);

  const lines = await db.journalLine.findMany({
    where: {
      orgId,
      ...(input.accountId ? { accountId: input.accountId } : {}),
      journalEntry: {
        status: "POSTED",
        ...(buildEntryDateFilter(input.startDate, input.endDate)
          ? { entryDate: buildEntryDateFilter(input.startDate, input.endDate) }
          : {}),
      },
    },
    include: {
      account: {
        select: {
          id: true,
          code: true,
          name: true,
          normalBalance: true,
          accountType: true,
        },
      },
      journalEntry: {
        select: {
          id: true,
          entryNumber: true,
          entryDate: true,
          source: true,
          sourceRef: true,
          memo: true,
        },
      },
    },
    orderBy: [{ journalEntry: { entryDate: "asc" } }, { lineNumber: "asc" }],
  });

  const runningBalanceByAccount = new Map<string, number>();

  return lines.map((line) => {
    const movement = computeSignedBalance(
      line.account.normalBalance,
      toAccountingNumber(line.debit),
      toAccountingNumber(line.credit),
    );
    const nextRunningBalance = roundMoney(
      (runningBalanceByAccount.get(line.accountId) ?? 0) + movement,
    );

    runningBalanceByAccount.set(line.accountId, nextRunningBalance);

    return {
      id: line.id,
      accountId: line.account.id,
      accountCode: line.account.code,
      accountName: line.account.name,
      accountType: line.account.accountType as GlAccountType,
      entryId: line.journalEntry.id,
      entryNumber: line.journalEntry.entryNumber,
      entryDate: line.journalEntry.entryDate,
      source: line.journalEntry.source,
      sourceRef: line.journalEntry.sourceRef,
      memo: line.journalEntry.memo,
      description: line.description,
      debit: roundMoney(toAccountingNumber(line.debit)),
      credit: roundMoney(toAccountingNumber(line.credit)),
      movement,
      runningBalance: nextRunningBalance,
    };
  });
}
