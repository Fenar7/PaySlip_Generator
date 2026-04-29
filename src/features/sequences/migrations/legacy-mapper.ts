/**
 * Legacy OrgDefaults → Sequence model mapper.
 *
 * Maps raw OrgDefaults rows to the shape required by the
 * sequence-creation migration. Keeps migration logic separate
 * from the continuity seed parser so both can be unit-tested
 * in isolation.
 */

import { parseContinuitySeed, getDefaultPrefix } from "../engine/continuity";
import type { SequenceDocumentType, SequencePeriodicity } from "../types";

export interface LegacyOrgDefaultsRow {
  organizationId: string;
  invoicePrefix?: string | null;
  invoiceCounter?: number | null;
  voucherPrefix?: string | null;
  voucherCounter?: number | null;
}

export interface SequenceSeed {
  organizationId: string;
  name: string;
  documentType: SequenceDocumentType;
  periodicity: SequencePeriodicity;
  isActive: boolean;
  format: {
    formatString: string;
    startCounter: number;
    counterPadding: number;
    isDefault: boolean;
  };
  legacyNextCounter: number;
  inferred: boolean;
}

/**
 * Map a single OrgDefaults row to zero, one, or two SequenceSeed objects.
 *
 * Phase 1 scope is limited to INVOICE and VOUCHER.
 * Salary slips, quotes, vendor bills, etc. are ignored.
 */
export function mapOrgDefaultsToSequences(
  row: LegacyOrgDefaultsRow
): SequenceSeed[] {
  const seeds: SequenceSeed[] = [];

  const invoiceSeed = mapDocumentType(
    row,
    "INVOICE",
    row.invoicePrefix,
    row.invoiceCounter
  );
  if (invoiceSeed) seeds.push(invoiceSeed);

  const voucherSeed = mapDocumentType(
    row,
    "VOUCHER",
    row.voucherPrefix,
    row.voucherCounter
  );
  if (voucherSeed) seeds.push(voucherSeed);

  return seeds;
}

function mapDocumentType(
  row: LegacyOrgDefaultsRow,
  documentType: SequenceDocumentType,
  rawPrefix: string | null | undefined,
  rawCounter: number | null | undefined
): SequenceSeed | null {
  const prefix = (rawPrefix ?? getDefaultPrefix(documentType)).toUpperCase();
  const counter = rawCounter ?? 1;

  const seed = parseContinuitySeed(prefix, counter);

  return {
    organizationId: row.organizationId,
    name: `${documentType === "INVOICE" ? "Invoice" : "Voucher"} Sequence`,
    documentType,
    periodicity: seed.periodicity,
    isActive: true,
    format: {
      formatString: seed.formatString,
      startCounter: seed.startCounter,
      counterPadding: seed.counterPadding,
      isDefault: true,
    },
    legacyNextCounter: counter,
    inferred: seed.inferred,
  };
}

export interface HistoricalSequenceMatch {
  sequenceNumber: number;
}

/**
 * Parse a historical issued document number and extract its numeric counter.
 *
 * Phase 1 supports the current legacy {PREFIX}-{NNN} format and conservative
 * variants that still end in a numeric counter (for example INV/2026/00042).
 * Prefix mismatches or non-numeric tails are treated as non-mappable.
 */
export function parseHistoricalSequenceNumber(
  documentNumber: string,
  expectedPrefix: string
): HistoricalSequenceMatch | null {
  const normalizedNumber = documentNumber.trim().toUpperCase();
  const normalizedPrefix = expectedPrefix.trim().toUpperCase();

  if (!normalizedNumber || !normalizedPrefix) {
    return null;
  }

  const digitsMatch = normalizedNumber.match(/(\d+)$/);
  if (!digitsMatch) {
    return null;
  }

  const prefixToken = normalizedNumber.slice(0, digitsMatch.index ?? 0);
  const compactPrefix = prefixToken.replace(/[^A-Z0-9]/g, "");

  if (!compactPrefix.startsWith(normalizedPrefix.replace(/[^A-Z0-9]/g, ""))) {
    return null;
  }

  const sequenceNumber = Number.parseInt(digitsMatch[1], 10);
  if (!Number.isSafeInteger(sequenceNumber) || sequenceNumber < 1) {
    return null;
  }

  return { sequenceNumber };
}
