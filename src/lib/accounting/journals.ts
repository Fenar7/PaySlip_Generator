import "server-only";

import { db } from "@/lib/db";
import type { JournalSource, JournalEntryStatus, Prisma } from "@/generated/prisma/client";
import { ensureBooksSetupTx } from "./accounts";
import { assertPostingAllowedTx } from "./periods";
import { cleanText, parseAccountingDate, roundMoney } from "./utils";

type TxClient = Prisma.TransactionClient;

export interface JournalLineInput {
  accountId: string;
  description?: string | null;
  debit?: number;
  credit?: number;
  entityType?: string | null;
  entityId?: string | null;
}

export interface CreateJournalInput {
  orgId: string;
  source: JournalSource;
  entryDate: Date | string;
  lines: JournalLineInput[];
  actorId?: string;
  memo?: string | null;
  sourceId?: string | null;
  sourceRef?: string | null;
  currency?: string;
  isAdjustment?: boolean;
  isReversal?: boolean;
  reversalOfId?: string | null;
  metadata?: Prisma.InputJsonValue;
  entryNumber?: string;
  manualEntry?: boolean;
}

export interface JournalListFilters {
  status?: JournalEntryStatus;
  source?: JournalSource;
  startDate?: string;
  endDate?: string;
  accountId?: string;
}

interface NormalizedJournalLine {
  accountId: string;
  description: string | null;
  debit: number;
  credit: number;
  entityType: string | null;
  entityId: string | null;
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

function createJournalEntryNumber(entryDate: Date): string {
  const stamp = entryDate.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  return `JRN-${stamp}-${suffix}`;
}

async function assertAccountsReadyForLines(
  tx: TxClient,
  orgId: string,
  lines: NormalizedJournalLine[],
  manualEntry: boolean,
) {
  const uniqueAccountIds = Array.from(new Set(lines.map((line) => line.accountId)));
  const accounts = await tx.glAccount.findMany({
    where: {
      orgId,
      id: { in: uniqueAccountIds },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      allowManualEntries: true,
    },
  });

  if (accounts.length !== uniqueAccountIds.length) {
    throw new Error("One or more journal accounts were not found or are inactive.");
  }

  if (manualEntry) {
    const blocked = accounts.find((account) => !account.allowManualEntries);
    if (blocked) {
      throw new Error(`Manual journals cannot post to protected account "${blocked.name}".`);
    }
  }
}

export function validateJournalLines(lines: JournalLineInput[]): {
  lines: NormalizedJournalLine[];
  totalDebit: number;
  totalCredit: number;
} {
  if (lines.length < 2) {
    throw new Error("A journal entry needs at least two lines.");
  }

  const normalizedLines = lines.map<NormalizedJournalLine>((line, index) => {
    const debit = roundMoney(line.debit ?? 0);
    const credit = roundMoney(line.credit ?? 0);

    if (!line.accountId) {
      throw new Error(`Line ${index + 1} is missing an account.`);
    }

    if (debit < 0 || credit < 0) {
      throw new Error(`Line ${index + 1} contains a negative amount.`);
    }

    if ((debit === 0 && credit === 0) || (debit > 0 && credit > 0)) {
      throw new Error(`Line ${index + 1} must contain either a debit or a credit.`);
    }

    return {
      accountId: line.accountId,
      description: cleanText(line.description),
      debit,
      credit,
      entityType: cleanText(line.entityType),
      entityId: cleanText(line.entityId),
    };
  });

  const totalDebit = roundMoney(
    normalizedLines.reduce((sum, line) => sum + line.debit, 0),
  );
  const totalCredit = roundMoney(
    normalizedLines.reduce((sum, line) => sum + line.credit, 0),
  );

  if (totalDebit === 0 || totalCredit === 0) {
    throw new Error("Zero-value journals are not allowed.");
  }

  if (totalDebit !== totalCredit) {
    throw new Error("Journal debits and credits must balance.");
  }

  return {
    lines: normalizedLines,
    totalDebit,
    totalCredit,
  };
}

export async function createDraftJournalTx(
  tx: TxClient,
  input: CreateJournalInput,
) {
  const entryDate = parseAccountingDate(input.entryDate);
  const { lines, totalDebit, totalCredit } = validateJournalLines(input.lines);

  await ensureBooksSetupTx(tx, input.orgId);
  const period = await assertPostingAllowedTx(tx, input.orgId, entryDate, {
    actorId: input.actorId,
    source: input.source,
    sourceId: input.sourceId ?? null,
  });
  await assertAccountsReadyForLines(tx, input.orgId, lines, input.manualEntry ?? false);

  return tx.journalEntry.create({
    data: {
      orgId: input.orgId,
      fiscalPeriodId: period.id,
      entryNumber: input.entryNumber ?? createJournalEntryNumber(entryDate),
      entryDate,
      source: input.source,
      status: "DRAFT",
      memo: cleanText(input.memo),
      sourceId: cleanText(input.sourceId),
      sourceRef: cleanText(input.sourceRef),
      currency: input.currency ?? "INR",
      totalDebit,
      totalCredit,
      isAdjustment: input.isAdjustment ?? false,
      isReversal: input.isReversal ?? false,
      reversalOfId: input.reversalOfId ?? undefined,
      metadata: input.metadata,
      createdBy: input.actorId ?? undefined,
      lines: {
        create: lines.map((line, index) => ({
          orgId: input.orgId,
          accountId: line.accountId,
          lineNumber: index + 1,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          entityType: line.entityType,
          entityId: line.entityId,
        })),
      },
    },
    include: {
      lines: {
        include: {
          account: {
            select: {
              id: true,
              code: true,
              name: true,
              normalBalance: true,
            },
          },
        },
      },
      fiscalPeriod: true,
    },
  });
}

export async function createDraftJournal(input: CreateJournalInput) {
  return db.$transaction((tx) => createDraftJournalTx(tx, input));
}

export async function postJournalEntryTx(
  tx: TxClient,
  input: {
    orgId: string;
    journalEntryId: string;
    actorId?: string;
  },
) {
  const journal = await tx.journalEntry.findFirst({
    where: {
      id: input.journalEntryId,
      orgId: input.orgId,
    },
    include: {
      lines: true,
      fiscalPeriod: true,
    },
  });

  if (!journal) {
    throw new Error("Journal entry not found.");
  }

  if (journal.status !== "DRAFT") {
    throw new Error(`Only draft journals can be posted. Current status: ${journal.status}`);
  }

  const { totalDebit, totalCredit } = validateJournalLines(
    journal.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      description: line.description,
      entityType: line.entityType,
      entityId: line.entityId,
    })),
  );

  await assertPostingAllowedTx(tx, input.orgId, journal.entryDate, {
    actorId: input.actorId,
    source: journal.source,
    sourceId: journal.sourceId,
  });

  const updated = await tx.journalEntry.update({
    where: { id: journal.id },
    data: {
      status: "POSTED",
      totalDebit,
      totalCredit,
      postedAt: new Date(),
      postedBy: input.actorId ?? undefined,
    },
  });

  if (input.actorId) {
    await tx.auditLog.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId,
        action: "books.journal.posted",
        entityType: "journal_entry",
        entityId: journal.id,
        metadata: {
          entryNumber: journal.entryNumber,
          source: journal.source,
        },
      },
    });
  }

  return updated;
}

export async function postJournalEntry(input: {
  orgId: string;
  journalEntryId: string;
  actorId?: string;
}) {
  return db.$transaction((tx) => postJournalEntryTx(tx, input));
}

export async function createAndPostJournal(input: CreateJournalInput) {
  return db.$transaction(async (tx) => {
    return createAndPostJournalTx(tx, input);
  });
}

export async function createAndPostJournalTx(
  tx: TxClient,
  input: CreateJournalInput,
) {
  const draft = await createDraftJournalTx(tx, input);
  await postJournalEntryTx(tx, {
    orgId: input.orgId,
    journalEntryId: draft.id,
    actorId: input.actorId,
  });

  return tx.journalEntry.findUniqueOrThrow({
    where: { id: draft.id },
    include: {
      lines: true,
      fiscalPeriod: true,
    },
  });
}

export async function reverseJournalEntryTx(
  tx: TxClient,
  input: {
    orgId: string;
    journalEntryId: string;
    actorId: string;
    reversalDate?: Date | string;
    memo?: string | null;
  },
) {
  const journal = await tx.journalEntry.findFirst({
    where: {
      id: input.journalEntryId,
      orgId: input.orgId,
    },
    include: {
      lines: true,
    },
  });

  if (!journal) {
    throw new Error("Journal entry not found.");
  }

  if (journal.status !== "POSTED") {
    throw new Error("Only posted journals can be reversed.");
  }

  const existingReversal = await tx.journalEntry.findFirst({
    where: { orgId: input.orgId, reversalOfId: journal.id },
    select: { id: true },
  });

  if (existingReversal) {
    throw new Error("This journal has already been reversed.");
  }

  const reversal = await createDraftJournalTx(tx, {
    orgId: input.orgId,
    source: "SYSTEM_REVERSAL",
    entryDate: input.reversalDate ?? new Date(),
    actorId: input.actorId,
    memo: input.memo ?? `Reversal of ${journal.entryNumber}`,
    sourceId: journal.sourceId,
    sourceRef: journal.entryNumber,
    currency: journal.currency,
    isReversal: true,
    reversalOfId: journal.id,
    lines: journal.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      description: line.description,
      entityType: line.entityType,
      entityId: line.entityId,
    })),
  });

  await postJournalEntryTx(tx, {
    orgId: input.orgId,
    journalEntryId: reversal.id,
    actorId: input.actorId,
  });

  await tx.journalEntry.update({
    where: { id: journal.id },
    data: {
      status: "REVERSED",
      reversedAt: new Date(),
      reversedBy: input.actorId,
    },
  });

  await tx.auditLog.create({
    data: {
      orgId: input.orgId,
      actorId: input.actorId,
      action: "books.journal.reversed",
      entityType: "journal_entry",
      entityId: journal.id,
      metadata: {
        entryNumber: journal.entryNumber,
        reversalJournalId: reversal.id,
      },
    },
  });

  return tx.journalEntry.findUniqueOrThrow({
    where: { id: reversal.id },
    include: {
      lines: true,
      fiscalPeriod: true,
    },
  });
}

export async function reverseJournalEntry(input: {
  orgId: string;
  journalEntryId: string;
  actorId: string;
  reversalDate?: Date | string;
  memo?: string | null;
}) {
  return db.$transaction((tx) => reverseJournalEntryTx(tx, input));
}

export async function listJournalEntries(orgId: string, filters: JournalListFilters = {}) {
  await db.$transaction((tx) => ensureBooksSetupTx(tx, orgId));

  return db.journalEntry.findMany({
    where: {
      orgId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.accountId
        ? {
            lines: {
              some: { accountId: filters.accountId },
            },
          }
        : {}),
      ...(buildEntryDateFilter(filters.startDate, filters.endDate)
        ? { entryDate: buildEntryDateFilter(filters.startDate, filters.endDate) }
        : {}),
    },
    include: {
      fiscalPeriod: {
        select: {
          id: true,
          label: true,
          status: true,
        },
      },
      lines: {
        select: {
          id: true,
        },
      },
    },
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
  });
}
