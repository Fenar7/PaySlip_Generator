"use server";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type {
  SequencePeriodicity,
  PreviewResult,
  ConsumeResult,
  SequenceConfig,
} from "../types";
import { tokenize, validateFormat, getRunningNumberPadding } from "../engine/tokenizer";
import { render, buildRenderContext } from "../engine/renderer";
import { calculatePeriodBoundaries } from "../engine/periodicity";

/**
 * Sequence Engine Service
 *
 * Provides preview and consume operations for document sequences.
 * Built in Phase 1; consumed by lifecycle hooks in Phase 4–5.
 *
 * All mutations are atomic and run inside Prisma transactions.
 */

export class SequenceEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SequenceEngineError";
  }
}

export class SequenceExhaustionError extends SequenceEngineError {
  constructor() {
    super("Sequence counter has exceeded safe integer bounds");
    this.name = "SequenceExhaustionError";
  }
}

export class SequenceNotFoundError extends SequenceEngineError {
  constructor(sequenceId: string) {
    super(`Sequence not found: ${sequenceId}`);
    this.name = "SequenceNotFoundError";
  }
}

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
  const currentCounter = period?.currentCounter ?? format.startCounter;
  const periodId = period?.id ?? null;
  const nextCounter = currentCounter;

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

  // Create new period
  return executor.sequencePeriod.create({
    data: {
      sequenceId,
      startDate: boundaries.startDate,
      endDate: boundaries.endDate,
      currentCounter: startCounter - 1, // consume will increment to startCounter
      status: "OPEN",
    },
  });
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
