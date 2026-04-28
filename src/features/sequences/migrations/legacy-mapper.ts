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

  const seed = parseContinuitySeed(prefix, counter, documentType);

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
    inferred: seed.inferred,
  };
}
