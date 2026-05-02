"use server";

import { db } from "@/lib/db";
import { createHash } from "crypto";
import type {
  ResequencePreviewInput,
  ResequencePreviewResult,
  ResequenceRecordMapping,
  ResequenceApplyInput,
  ResequenceApplyResult,
  SequencePeriodicity,
} from "../types";
import { tokenize, validateFormat, extractCounterFromFormat } from "../engine/tokenizer";
import { render, buildRenderContext } from "../engine/renderer";
import { calculatePeriodBoundaries } from "../engine/periodicity";
import { SequenceEngineError, SequenceNotFoundError } from "./sequence-engine-errors";

interface DocumentRecord {
  documentId: string;
  documentDate: Date;
  oldNumber: string;
  createdAt: Date;
}

interface PeriodGroup {
  boundaries: { startDate: Date; endDate: Date };
  startCounter: number;
  documents: DocumentRecord[];
}

/**
 * Preview resequencing for a document type within a date range.
 *
 * Computes deterministic proposed numbering without mutating any live data.
 * Respects periodicity (counter resets per period), org scoping, and lock-date
 * constraints when a lockDate is provided.
 *
 * Returns a complete mapping of old → proposed numbers with classification
 * (unchanged / renumbered / blocked) and a summary count.
 */
export async function previewResequence(
  input: ResequencePreviewInput
): Promise<ResequencePreviewResult> {
  const { orgId, documentType, startDate, endDate, orderBy, lockDate } = input;

  const sequence = await db.sequence.findFirst({
    where: { organizationId: orgId, documentType },
    include: {
      formats: { where: { isDefault: true }, take: 1 },
    },
  });

  if (!sequence) {
    throw new SequenceNotFoundError(
      `No ${documentType} sequence for org ${orgId}`
    );
  }

  const format = sequence.formats[0];
  if (!format) {
    throw new SequenceEngineError(
      `Sequence ${sequence.id} has no default format`
    );
  }

  const validation = validateFormat(format.formatString);
  if (!validation.valid) {
    throw new SequenceEngineError(
      `Invalid format string: ${validation.errors.join(", ")}`
    );
  }

  const documents = await fetchFinalizedDocuments(
    orgId,
    documentType,
    startDate,
    endDate
  );

  if (documents.length === 0) {
    return emptyResult(sequence.id, format.formatString, sequence.periodicity);
  }

  const groups = groupByPeriod(
    documents,
    sequence.periodicity,
    format.startCounter
  );

  const prefix = extractStaticPrefix(format.formatString);

  const mappings: ResequenceRecordMapping[] = [];

  for (const group of groups) {
    const sorted =
      orderBy === "current_number"
        ? sortByExistingCounter(group.documents, format.formatString)
        : sortByDate(group.documents);

    let runningCounter = group.startCounter;
    const periodKey = periodKeyLabel(
      group.boundaries.startDate,
      sequence.periodicity
    );

    for (const doc of sorted) {
      const dateLocked = lockDate && doc.documentDate <= lockDate;

      // Locked documents remain blocked but their parseable counters still
      // consume numbering space so unlocked documents downstream do not
      // produce duplicate proposed numbers against preserved locked records.
      if (dateLocked) {
        const lockedParsedCounter = extractCounterFromFormat(
          doc.oldNumber,
          format.formatString
        );
        if (lockedParsedCounter !== null && lockedParsedCounter >= runningCounter) {
          runningCounter = lockedParsedCounter + 1;
        }
        mappings.push(
          blockedMapping(doc, "Document date is on or before lock date", periodKey, lockedParsedCounter)
        );
        continue;
      }

      const parsedCounter = extractCounterFromFormat(
        doc.oldNumber,
        format.formatString
      );

      if (parsedCounter === null) {
        mappings.push(
          blockedMapping(
            doc,
            `Cannot parse existing number "${doc.oldNumber}" with format "${format.formatString}"`,
            periodKey
          )
        );
        continue;
      }

      const proposedNumber = render(
        validation.tokens,
        buildRenderContext(doc.documentDate, prefix, runningCounter)
      );

      if (proposedNumber === doc.oldNumber) {
        mappings.push({
          documentId: doc.documentId,
          documentDate: doc.documentDate,
          oldNumber: doc.oldNumber,
          proposedNumber: doc.oldNumber,
          status: "unchanged",
          reason: null,
          oldCounter: parsedCounter,
          proposedCounter: runningCounter,
          periodKey,
        });
      } else {
        mappings.push({
          documentId: doc.documentId,
          documentDate: doc.documentDate,
          oldNumber: doc.oldNumber,
          proposedNumber,
          status: "renumbered",
          reason: `Counter ${parsedCounter} → ${runningCounter}`,
          oldCounter: parsedCounter,
          proposedCounter: runningCounter,
          periodKey,
        });
      }

      runningCounter++;
    }
  }

  return buildResult(
    sequence.id,
    format.formatString,
    sequence.periodicity,
    mappings
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyResult(
  sequenceId: string,
  formatString: string,
  periodicity: SequencePeriodicity
): ResequencePreviewResult {
  return {
    summary: { totalDocuments: 0, unchanged: 0, renumbered: 0, blocked: 0 },
    mappings: [],
    sequenceId,
    formatString,
    periodicity,
    previewFingerprint: computeFingerprint([]),
  };
}

function blockedMapping(
  doc: DocumentRecord,
  reason: string,
  periodKey: string,
  oldCounter: number | null = null
): ResequenceRecordMapping {
  return {
    documentId: doc.documentId,
    documentDate: doc.documentDate,
    oldNumber: doc.oldNumber,
    proposedNumber: null,
    status: "blocked",
    reason,
    oldCounter,
    proposedCounter: null,
    periodKey,
  };
}

function buildResult(
  sequenceId: string,
  formatString: string,
  periodicity: SequencePeriodicity,
  mappings: ResequenceRecordMapping[]
): ResequencePreviewResult {
  const summary = {
    totalDocuments: mappings.length,
    unchanged: 0,
    renumbered: 0,
    blocked: 0,
  };

  for (const m of mappings) {
    switch (m.status) {
      case "unchanged":
        summary.unchanged++;
        break;
      case "renumbered":
        summary.renumbered++;
        break;
      case "blocked":
        summary.blocked++;
        break;
    }
  }

  const previewFingerprint = computeFingerprint(mappings);

  return { summary, mappings, sequenceId, formatString, periodicity, previewFingerprint };
}

function computeFingerprint(mappings: ResequenceRecordMapping[]): string {
  const payload = mappings
    .map((m) => `${m.documentId}|${m.status}|${m.proposedNumber ?? "-"}`)
    .join("\n");
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

/**
 * Fetch finalized documents for the given org, type, and date range.
 *
 * Invoices: any status except DRAFT (only DRAFT docs lack official numbers).
 * Vouchers: status = "approved" (official number assigned on approval).
 */
async function fetchFinalizedDocuments(
  orgId: string,
  documentType: string,
  startDate: Date,
  endDate: Date
): Promise<DocumentRecord[]> {
  if (documentType === "INVOICE") {
    const invoices = await db.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { not: "DRAFT" },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        invoiceDate: true,
        invoiceNumber: true,
        createdAt: true,
      },
      orderBy: { invoiceDate: "asc" },
    });

    return invoices
      .filter((inv): inv is { id: string; invoiceDate: Date; invoiceNumber: string; createdAt: Date } => inv.invoiceNumber !== null)
      .map((inv) => ({
        documentId: inv.id,
        documentDate: inv.invoiceDate,
        oldNumber: inv.invoiceNumber,
        createdAt: inv.createdAt,
      }));
  }

  // VOUCHER
  // voucherDate is a String field; date filtering relies on ISO-8601
  // lexicographic ordering.  If non-ISO dates are stored, the filter
  // may produce incomplete or incorrect results.
  const vouchers = await db.voucher.findMany({
    where: {
      organizationId: orgId,
      status: "approved",
      voucherDate: { gte: startDate.toISOString().slice(0, 10), lte: endDate.toISOString().slice(0, 10) },
    },
    select: {
      id: true,
      voucherDate: true,
      voucherNumber: true,
      createdAt: true,
    },
    orderBy: { voucherDate: "asc" },
  });

  return vouchers
    .filter((v): v is { id: string; voucherDate: string; voucherNumber: string; createdAt: Date } => v.voucherNumber !== null)
    .map((v) => ({
      documentId: v.id,
      documentDate: new Date(v.voucherDate),
      oldNumber: v.voucherNumber,
      createdAt: v.createdAt,
    }));
}

function groupByPeriod(
  documents: DocumentRecord[],
  periodicity: SequencePeriodicity,
  startCounter: number
): PeriodGroup[] {
  const map = new Map<string, PeriodGroup>();

  for (const doc of documents) {
    const boundaries = calculatePeriodBoundaries(doc.documentDate, periodicity);
    const key = `${boundaries.startDate.toISOString()}|${boundaries.endDate.toISOString()}`;

    if (!map.has(key)) {
      map.set(key, {
        boundaries,
        startCounter,
        documents: [],
      });
    }

    map.get(key)!.documents.push(doc);
  }

  return periodicityAwareGroupOrder(
    Array.from(map.values()),
    periodicity
  );
}

/**
 * Order period groups chronologically, respecting periodicity:
 * NONE groups come first (single group), then chronological.
 */
function periodicityAwareGroupOrder(
  groups: PeriodGroup[],
  periodicity: SequencePeriodicity
): PeriodGroup[] {
  return groups.sort((a, b) => {
    if (periodicity === "NONE") return 0;
    return a.boundaries.startDate.getTime() - b.boundaries.startDate.getTime();
  });
}

function sortByDate(documents: DocumentRecord[]): DocumentRecord[] {
  return [...documents].sort((a, b) => {
    const dateDiff = a.documentDate.getTime() - b.documentDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

function sortByExistingCounter(
  documents: DocumentRecord[],
  formatString: string
): DocumentRecord[] {
  return [...documents].sort((a, b) => {
    const aCounter = extractCounterFromFormat(a.oldNumber, formatString) ?? 0;
    const bCounter = extractCounterFromFormat(b.oldNumber, formatString) ?? 0;
    return aCounter - bCounter;
  });
}

function extractStaticPrefix(formatString: string): string {
  const tokens = tokenize(formatString);
  for (const token of tokens) {
    if (token.type === "literal" && token.value) {
      return token.value.replace(/[/\-_]/g, "").slice(0, 12);
    }
  }
  return "";
}


function periodKeyLabel(startDate: Date, periodicity: SequencePeriodicity): string {
  if (periodicity === "NONE") return "ALL";
  if (periodicity === "YEARLY") return String(startDate.getFullYear());
  if (periodicity === "MONTHLY") {
    const y = startDate.getFullYear();
    const m = startDate.getMonth() + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  }
  if (periodicity === "FINANCIAL_YEAR") {
    const y = startDate.getFullYear();
    return `FY${y}`;
  }
  return startDate.toISOString().slice(0, 10);
}

// ─── Resequence Apply (Phase 6 / Sprint 6.2) ──────────────────────────────────

export async function applyResequence(
  input: ResequenceApplyInput,
  auditParams: { actorId: string; ipAddress?: string | null; userAgent?: string | null }
): Promise<ResequenceApplyResult> {
  const preview = await previewResequence(input);

  if (preview.previewFingerprint !== input.expectedFingerprint) {
    throw new SequenceEngineError(
      "Fingerprint mismatch: the preview may be stale. Please re-run the preview before applying."
    );
  }

  if (preview.summary.renumbered === 0) {
    return {
      summary: { totalConsidered: preview.summary.totalDocuments, applied: 0, unchanged: preview.summary.unchanged, blocked: preview.summary.blocked, failed: 0 },
      appliedDocumentIds: [],
      preview,
    };
  }

  // Guard against oversized transactions that could time out or lock tables.
  // Large resequence batches should be narrowed by date range.
  const MAX_APPLY_COUNT = 1000;
  if (preview.summary.renumbered > MAX_APPLY_COUNT) {
    throw new SequenceEngineError(
      `Apply batch exceeds maximum of ${MAX_APPLY_COUNT} documents (${preview.summary.renumbered} eligible). Narrow the date range and try again.`
    );
  }

  const renumbered = preview.mappings.filter((m) => m.status === "renumbered" && m.proposedNumber !== null);
  const sequenceId = preview.sequenceId;
  const documentType = input.documentType;
  const appliedDocumentIds: string[] = [];

  await db.$transaction(async (tx) => {
    const periodCounters = new Map<string, number>();
    for (const m of renumbered) {
      if (m.proposedCounter !== null && (!periodCounters.has(m.periodKey) || m.proposedCounter > periodCounters.get(m.periodKey)!)) {
        periodCounters.set(m.periodKey, m.proposedCounter);
      }
    }

    for (const [periodKey, finalCounter] of periodCounters) {
      const boundaries = deriveBoundariesForPeriodKey(periodKey, preview.periodicity);
      const existing = await tx.sequencePeriod.findFirst({
        where: { sequenceId, startDate: boundaries.startDate, endDate: boundaries.endDate },
        select: { id: true },
      });

      if (existing) {
        await tx.sequencePeriod.update({ where: { id: existing.id }, data: { currentCounter: finalCounter } });
      } else {
        await tx.sequencePeriod.create({
          data: { sequenceId, startDate: boundaries.startDate, endDate: boundaries.endDate, currentCounter: finalCounter, status: "OPEN" },
        });
      }
    }

    for (const m of renumbered) {
      const docBoundaries = deriveBoundariesForPeriodKey(m.periodKey, preview.periodicity);
      const period = await tx.sequencePeriod.findFirst({
        where: { sequenceId, startDate: docBoundaries.startDate, endDate: docBoundaries.endDate },
        select: { id: true },
      });

      if (documentType === "INVOICE") {
        await tx.invoice.update({
          where: { id: m.documentId, organizationId: input.orgId },
          data: {
            invoiceNumber: m.proposedNumber!,
            sequenceId,
            sequencePeriodId: period?.id ?? null,
            sequenceNumber: m.proposedCounter ?? null,
          },
        });
      } else {
        await tx.voucher.update({
          where: { id: m.documentId, organizationId: input.orgId },
          data: {
            voucherNumber: m.proposedNumber!,
            sequenceId,
            sequencePeriodId: period?.id ?? null,
            sequenceNumber: m.proposedCounter ?? null,
          },
        });
      }

      appliedDocumentIds.push(m.documentId);
    }

    await (await import("@/lib/audit")).logAuditTx(tx, {
      orgId: input.orgId,
      actorId: auditParams.actorId,
      action: "sequence.resequence_confirmed",
      entityType: "sequence",
      entityId: sequenceId,
      metadata: {
        documentType,
        startDate: input.startDate.toISOString(),
        endDate: input.endDate.toISOString(),
        orderBy: input.orderBy,
        totalConsidered: preview.summary.totalDocuments,
        applied: renumbered.length,
        appliedDocumentIds,
        snapshotBefore: renumbered.map((m) => ({ documentId: m.documentId, oldNumber: m.oldNumber })),
        snapshotAfter: renumbered.map((m) => ({ documentId: m.documentId, newNumber: m.proposedNumber })),
      },
      ipAddress: auditParams.ipAddress ?? null,
      userAgent: auditParams.userAgent ?? null,
    });
  });

  return {
    summary: {
      totalConsidered: preview.summary.totalDocuments,
      applied: renumbered.length,
      unchanged: preview.summary.unchanged,
      blocked: preview.summary.blocked,
      failed: 0,
    },
    appliedDocumentIds,
    preview,
  };
}

function deriveBoundariesForPeriodKey(
  periodKey: string,
  periodicity: SequencePeriodicity
): { startDate: Date; endDate: Date } {
  if (periodicity === "NONE") {
    return { startDate: new Date(Date.UTC(1970, 0, 1)), endDate: new Date(Date.UTC(2999, 11, 31)) };
  }
  if (periodicity === "YEARLY") {
    const y = parseInt(periodKey, 10);
    return { startDate: new Date(Date.UTC(y, 0, 1)), endDate: new Date(Date.UTC(y, 11, 31)) };
  }
  if (periodicity === "MONTHLY") {
    const [yStr, mStr] = periodKey.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    return { startDate: new Date(Date.UTC(y, m - 1, 1)), endDate: new Date(Date.UTC(y, m, 0)) };
  }
  if (periodicity === "FINANCIAL_YEAR") {
    const d = new Date(periodKey);
    return calculatePeriodBoundaries(d, "FINANCIAL_YEAR");
  }
  return { startDate: new Date(periodKey), endDate: new Date(periodKey) };
}