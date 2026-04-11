import "server-only";

import { db } from "@/lib/db";
import type { FiscalPeriod, Prisma } from "@/generated/prisma/client";
import {
  addUtcMonths,
  addUtcYears,
  endOfUtcMonth,
  formatIsoDate,
  formatPeriodLabel,
  parseAccountingDate,
  startOfUtcMonth,
} from "./utils";

type TxClient = Prisma.TransactionClient;

export interface FiscalPeriodSeed {
  label: string;
  startDate: Date;
  endDate: Date;
}

export interface EnsureFiscalPeriodsInput {
  orgId: string;
  fiscalYearStartMonth: number;
  referenceDate?: Date;
}

function assertFiscalYearStartMonth(month: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Fiscal year start month must be between 1 and 12.");
  }
}

function getCurrentFiscalYearStart(referenceDate: Date, fiscalYearStartMonth: number): Date {
  const normalized = startOfUtcMonth(referenceDate);
  const startMonthIndex = fiscalYearStartMonth - 1;
  const startYear =
    normalized.getUTCMonth() >= startMonthIndex
      ? normalized.getUTCFullYear()
      : normalized.getUTCFullYear() - 1;

  return new Date(Date.UTC(startYear, startMonthIndex, 1, 0, 0, 0, 0));
}

export function buildFiscalPeriodSeeds(
  referenceDate: Date,
  fiscalYearStartMonth: number,
): FiscalPeriodSeed[] {
  assertFiscalYearStartMonth(fiscalYearStartMonth);

  const currentFiscalYearStart = getCurrentFiscalYearStart(referenceDate, fiscalYearStartMonth);
  const seedStart = addUtcYears(currentFiscalYearStart, -1);
  const seedEndExclusive = addUtcYears(currentFiscalYearStart, 2);
  const periods: FiscalPeriodSeed[] = [];

  for (let cursor = seedStart; cursor < seedEndExclusive; cursor = addUtcMonths(cursor, 1)) {
    periods.push({
      label: formatPeriodLabel(cursor),
      startDate: startOfUtcMonth(cursor),
      endDate: endOfUtcMonth(cursor),
    });
  }

  return periods;
}

export async function ensureFiscalPeriodsTx(
  tx: TxClient,
  input: EnsureFiscalPeriodsInput,
): Promise<number> {
  const periods = buildFiscalPeriodSeeds(
    input.referenceDate ?? new Date(),
    input.fiscalYearStartMonth,
  );

  const result = await tx.fiscalPeriod.createMany({
    data: periods.map((period) => ({
      orgId: input.orgId,
      label: period.label,
      startDate: period.startDate,
      endDate: period.endDate,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

export async function listFiscalPeriods(orgId: string): Promise<FiscalPeriod[]> {
  return db.fiscalPeriod.findMany({
    where: { orgId },
    orderBy: [{ startDate: "desc" }],
  });
}

export async function getFiscalPeriodForDateTx(
  tx: TxClient,
  orgId: string,
  entryDate: Date | string,
): Promise<FiscalPeriod> {
  const parsedDate = parseAccountingDate(entryDate);

  const period = await tx.fiscalPeriod.findFirst({
    where: {
      orgId,
      startDate: { lte: parsedDate },
      endDate: { gte: parsedDate },
    },
    orderBy: { startDate: "desc" },
  });

  if (!period) {
    const defaults = await tx.orgDefaults.findUnique({
      where: { organizationId: orgId },
      select: { fiscalYearStart: true },
    });

    await ensureFiscalPeriodsTx(tx, {
      orgId,
      fiscalYearStartMonth: defaults?.fiscalYearStart ?? 4,
      referenceDate: parsedDate,
    });

    const createdPeriod = await tx.fiscalPeriod.findFirst({
      where: {
        orgId,
        startDate: { lte: parsedDate },
        endDate: { gte: parsedDate },
      },
      orderBy: { startDate: "desc" },
    });

    if (createdPeriod) {
      return createdPeriod;
    }
  }

  if (!period) {
    throw new Error("No fiscal period exists for the selected journal date.");
  }

  return period;
}

export async function assertPostingAllowedTx(
  tx: TxClient,
  orgId: string,
  entryDate: Date | string,
  input?: {
    actorId?: string;
    source?: string;
    sourceId?: string | null;
  },
): Promise<FiscalPeriod> {
  const period = await getFiscalPeriodForDateTx(tx, orgId, entryDate);

  if (period.status !== "OPEN") {
    if (input?.actorId) {
      await tx.auditLog.create({
        data: {
          orgId,
          actorId: input.actorId,
          action: "books.posting.blocked",
          entityType: "fiscal_period",
          entityId: period.id,
          metadata: {
            label: period.label,
            status: period.status,
            entryDate: formatIsoDate(parseAccountingDate(entryDate)),
            source: input.source ?? null,
            sourceId: input.sourceId ?? null,
          },
        },
      });
    }

    throw new Error(`Posting is locked for fiscal period ${period.label}.`);
  }

  return period;
}

export async function lockFiscalPeriod(input: {
  orgId: string;
  periodId: string;
  actorId: string;
}): Promise<FiscalPeriod> {
  return db.$transaction(async (tx) => {
    const period = await tx.fiscalPeriod.findFirst({
      where: { id: input.periodId, orgId: input.orgId },
    });

    if (!period) {
      throw new Error("Fiscal period not found.");
    }

    if (period.status !== "OPEN") {
      throw new Error(`Fiscal period ${period.label} is already locked.`);
    }

    const updated = await tx.fiscalPeriod.update({
      where: { id: period.id },
      data: {
        status: "LOCKED",
        lockedAt: new Date(),
        lockedBy: input.actorId,
      },
    });

    await tx.auditLog.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId,
        action: "books.period.locked",
        entityType: "fiscal_period",
        entityId: period.id,
        metadata: { label: period.label },
      },
    });

    return updated;
  });
}

export async function reopenFiscalPeriod(input: {
  orgId: string;
  periodId: string;
  actorId: string;
  reason: string;
}): Promise<FiscalPeriod> {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("A reopen reason is required.");
  }

  return db.$transaction(async (tx) => {
    const period = await tx.fiscalPeriod.findFirst({
      where: { id: input.periodId, orgId: input.orgId },
    });

    if (!period) {
      throw new Error("Fiscal period not found.");
    }

    if (period.status === "OPEN") {
      throw new Error(`Fiscal period ${period.label} is already open.`);
    }

    const updated = await tx.fiscalPeriod.update({
      where: { id: period.id },
      data: {
        status: "OPEN",
        reopenedAt: new Date(),
        reopenedBy: input.actorId,
        reopenReason: reason,
      },
    });

    await tx.auditLog.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId,
        action: "books.period.reopened",
        entityType: "fiscal_period",
        entityId: period.id,
        metadata: {
          label: period.label,
          reason,
        },
      },
    });

    return updated;
  });
}
