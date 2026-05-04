"use server";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type {
  SequencePeriodicity,
  PreviewResult,
  ConsumeResult,
} from "../types";
import { tokenize, validateFormat } from "../engine/tokenizer";
import { render, buildRenderContext } from "../engine/renderer";
import { calculatePeriodBoundaries } from "../engine/periodicity";
import {
  SequenceEngineError,
  SequenceExhaustionError,
  SequenceNotFoundError,
} from "./sequence-engine-errors";

/**
 * Sequence Engine Service
 *
 * Provides preview and consume operations for document sequences.
 * Built in Phase 1; consumed by lifecycle hooks in Phase 4–5.
 * Hardened in Phase 7/Sprint 7.1 for concurrency.
 *
 * All mutations are atomic and run inside Prisma transactions.
 * Period contention is handled via retry on unique constraint violation.
 *
 * Idempotency (Phase 7/Sprint 7.1):
 *  - Duplicate protection relies on document-level guards inside caller
 *    transactions (e.g. re-reading invoiceNumber/voucherNumber before
 *    consuming).  This is rollback-safe: if the outer transaction rolls
 *    back, the guard sees the correct state on retry.
 *  - There is no in-memory idempotency cache.  A cache would survive a
 *    rolled-back outer transaction and poison retries with stale values.
 */

interface PreviewParams {
  sequenceId: string;
  documentDate: Date;
  orgId: string;
}

interface ConsumeParams {
  sequenceId: string;
  documentDate: Date;
  orgId: string;
  tx?: Prisma.TransactionClient;
}

/**
 * Preview the next sequence number without side effects.
 */
export async function previewSequenceNumber(
  params: PreviewParams
): Promise<PreviewResult> {
  const { sequenceId, documentDate, orgId } = params;

  const sequence = await db.sequence.findFirst({
    where: { id: sequenceId, organizationId: orgId },
    include: {
      formats: { where: { isDefault: true }, take: 1 },
      periods: {
        where: {
          startDate: { lte: documentDate },
          endDate: { gte: documentDate },
        },
        take: 1,
      },
    },
  });

  if (!sequence) {
    throw new SequenceNotFoundError(sequenceId);
  }

  const format = sequence.formats[0];
  if (!format) {
    throw new SequenceEngineError(
      `Sequence ${sequenceId} has no default format`
    );
  }

  const validation = validateFormat(format.formatString);
  if (!validation.valid) {
    throw new SequenceEngineError(
      `Invalid format string: ${validation.errors.join(", ")}`
    );
  }

  const period = sequence.periods[0];
  const periodId = period?.id ?? null;
  const nextCounter = period ? period.currentCounter + 1 : format.startCounter;

  const context = buildRenderContext(
    documentDate,
    extractPrefixFromFormat(format.formatString),
    nextCounter
  );

  const preview = render(validation.tokens, context);

  return {
    preview,
    nextCounter,
    periodId,
  };
}

/**
 * Consume the next sequence number atomically.
 *
 * This increments the counter and returns the assigned number.
 * Must be called inside a transaction for finalize-time assignment.
 *
 * Idempotency (Phase 7/Sprint 7.1):
 *  - Duplicate protection relies on document-level guards inside caller
 *    transactions.  There is no in-memory cache because a cache would
 *    survive a rolled-back outer transaction and return stale results.
 */
export async function consumeSequenceNumber(
  params: ConsumeParams
): Promise<ConsumeResult> {
  const { sequenceId, documentDate, orgId } = params;

  const executor = params.tx ?? db;

  const sequence = await executor.sequence.findFirst({
    where: { id: sequenceId, organizationId: orgId },
    include: {
      formats: { where: { isDefault: true }, take: 1 },
    },
  });

  if (!sequence) {
    throw new SequenceNotFoundError(sequenceId);
  }

  const format = sequence.formats[0];
  if (!format) {
    throw new SequenceEngineError(
      `Sequence ${sequenceId} has no default format`
    );
  }

  const validation = validateFormat(format.formatString);
  if (!validation.valid) {
    throw new SequenceEngineError(
      `Invalid format string: ${validation.errors.join(", ")}`
    );
  }

  // Find or create the period for this document date
  // Phase 7/Sprint 7.1: handles concurrent period creation via retry on P2002
  const period = await findOrCreatePeriod(
    executor,
    sequenceId,
    documentDate,
    sequence.periodicity,
    format.startCounter
  );

  // Atomically increment the counter
  const updatedPeriod = await executor.sequencePeriod.update({
    where: { id: period.id },
    data: { currentCounter: { increment: 1 } },
    select: { currentCounter: true },
  });

  const sequenceNumber = updatedPeriod.currentCounter;

  if (sequenceNumber > Number.MAX_SAFE_INTEGER) {
    throw new SequenceExhaustionError();
  }

  const context = buildRenderContext(
    documentDate,
    extractPrefixFromFormat(format.formatString),
    sequenceNumber
  );

  const formattedNumber = render(validation.tokens, context);

  return {
    formattedNumber,
    sequenceNumber,
    periodId: period.id,
  };
}

/**
 * Find an existing period for the document date, or create one.
 *
 * Phase 7/Sprint 7.1: The DB enforces @@unique([sequenceId, startDate, endDate]).
 * Two concurrent consume calls may both find a missing period and attempt to create
 * it. The second create will hit a P2002 unique constraint violation. We catch
 * P2002 and re-fetch the period created by the winning caller, then proceed
 * normally — no number is lost.
 */
async function findOrCreatePeriod(
  executor: Prisma.TransactionClient | typeof db,
  sequenceId: string,
  documentDate: Date,
  periodicity: SequencePeriodicity,
  startCounter: number
) {
  const boundaries = calculatePeriodBoundaries(documentDate, periodicity);

  const existing = await executor.sequencePeriod.findFirst({
    where: {
      sequenceId,
      startDate: boundaries.startDate,
      endDate: boundaries.endDate,
    },
  });

  if (existing) {
    return existing;
  }

  try {
    return await executor.sequencePeriod.create({
      data: {
        sequenceId,
        startDate: boundaries.startDate,
        endDate: boundaries.endDate,
        currentCounter: startCounter - 1, // consume will increment to startCounter
        status: "OPEN",
      },
    });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as Record<string, unknown>).code === "P2002"
    ) {
      const winner = await executor.sequencePeriod.findFirstOrThrow({
        where: {
          sequenceId,
          startDate: boundaries.startDate,
          endDate: boundaries.endDate,
        },
      });
      return winner;
    }
    throw error;
  }
}

/**
 * Extract the static prefix from a format string.
 *
 * Heuristic: look for the text before the first token, or use the
 * first literal segment.
 */
function extractPrefixFromFormat(formatString: string): string {
  const tokens = tokenize(formatString);
  for (const token of tokens) {
    if (token.type === "literal" && token.value) {
      // Remove common separators
      return token.value.replace(/[\/\-_]/g, "").slice(0, 12);
    }
  }
  return "";
}
