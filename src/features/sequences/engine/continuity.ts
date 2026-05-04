import type { ContinuitySeedResult } from "../types";

export interface LegacyOrgDefaults {
  invoicePrefix?: string;
  invoiceCounter?: number;
  voucherPrefix?: string;
  voucherCounter?: number;
}

/**
 * Parse legacy OrgDefaults counters into a continuity seed for the
 * new sequence engine.
 *
 * Input:  { invoicePrefix: "INV", invoiceCounter: 42 }
 * Output: { formatString: "INV/{YYYY}/{NNNNN}", startCounter: 42, ... }
 *
 * The format string is inferred with sensible defaults:
 * - Prefix becomes the static prefix token
 * - Year token is added for periodic alignment
 * - Running number token is always added
 * - Periodicity defaults to YEARLY (matches default sequence behavior)
 * - The legacy OrgDefaults counter is treated as the NEXT number to issue
 *
 * All inferred seeds are marked with inferred: true.
 */
export function parseContinuitySeed(
  prefix: string,
  counter: number
): ContinuitySeedResult {
  const sanitizedPrefix = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);

  if (!sanitizedPrefix) {
    throw new Error("Prefix must contain at least one alphanumeric character");
  }

  const formatString = `${sanitizedPrefix}/{YYYY}/{NNNNN}`;

  // Legacy OrgDefaults stores the next number to issue, not the last number used.
  const startCounter = counter;

  return {
    formatString,
    startCounter,
    counterPadding: 5,
    periodicity: "YEARLY",
    inferred: true,
  };
}

/**
 * Derive a default prefix for a document type when OrgDefaults has none.
 */
export function getDefaultPrefix(documentType: "INVOICE" | "VOUCHER"): string {
  return documentType === "INVOICE" ? "INV" : "VCH";
}

/**
 * Derive a default format string for a document type.
 */
export function getDefaultFormatString(
  documentType: "INVOICE" | "VOUCHER"
): string {
  const prefix = getDefaultPrefix(documentType);
  return `${prefix}/{YYYY}/{NNNNN}`;
}
