"use server";

import { db } from "@/lib/db";
import type {
  ResequencePreviewInput,
  ResequencePreviewResult,
  ResequenceRecordMapping,
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

  return { summary, mappings, sequenceId, formatString, periodicity };
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
  return startDate.toISOString().slice(0, 10);
}
