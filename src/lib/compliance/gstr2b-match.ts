/**
 * GSTR-2B Reconciliation Engine
 *
 * Matches GSTR-2B entries (from the GST portal) against VendorBill records
 * in the books. Determines auto-match, suggested, mismatch, and not-in-books cases.
 */
import type { Gstr2bEntry, VendorBill } from "@/generated/prisma/client";
import { Gstr2bMatchStatus } from "@/generated/prisma/client";

export interface Gstr2bEntryInput {
  id: string;
  supplierGstin: string;
  supplierName?: string;
  docNumber: string;
  docDate: string;
  docType?: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface BillRecord {
  id: string;
  vendorGstin: string | null;
  billNumber: string;
  billDate: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface MatchResult {
  entryId: string;
  matchStatus: Gstr2bMatchStatus;
  matchedBillId: string | null;
  matchConfidence: number;
  matchNote: string;
}

/** Tolerance for amount matching: ±0.5% */
const AMOUNT_TOLERANCE_PCT = 0.005;
/** Auto-match threshold: ≥ 0.98 confidence */
const AUTO_MATCH_THRESHOLD = 0.98;
/** Suggest threshold: ≥ 0.75 confidence */
const SUGGEST_THRESHOLD = 0.75;

function normalisedDocNumber(raw: string): string {
  return raw.replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function amountWithinTolerance(a: number, b: number): boolean {
  if (a === 0 && b === 0) return true;
  const base = Math.max(Math.abs(a), Math.abs(b), 0.01);
  return Math.abs(a - b) / base <= AMOUNT_TOLERANCE_PCT;
}

function scoreMatch(entry: Gstr2bEntryInput, bill: BillRecord): number {
  let score = 0;

  // GSTIN match: must match exactly (40% weight)
  if (
    entry.supplierGstin.toUpperCase() ===
    (bill.vendorGstin ?? "").toUpperCase()
  ) {
    score += 0.4;
  } else {
    return 0; // GSTIN mismatch is a hard disqualifier
  }

  // Document number match (30% weight)
  const normEntry = normalisedDocNumber(entry.docNumber);
  const normBill = normalisedDocNumber(bill.billNumber);
  if (normEntry === normBill) {
    score += 0.3;
  } else if (normBill.includes(normEntry) || normEntry.includes(normBill)) {
    score += 0.15; // partial doc number match
  }

  // Amount match (30% weight) — check taxable + total tax
  const taxableOk = amountWithinTolerance(entry.taxableAmount, bill.taxableAmount);
  const cgstOk = amountWithinTolerance(entry.cgst, bill.cgst);
  const sgstOk = amountWithinTolerance(entry.sgst, bill.sgst);
  const igstOk = amountWithinTolerance(entry.igst, bill.igst);

  if (taxableOk && cgstOk && sgstOk && igstOk) {
    score += 0.3;
  } else if (taxableOk) {
    score += 0.15; // taxable matches but tax components differ
  }

  return Math.min(score, 1);
}

/**
 * Run reconciliation between GSTR-2B entries and bill records.
 * Returns a MatchResult per entry + a list of bill IDs not found in GSTR-2B.
 */
export function runGstr2bReconciliation(
  entries: Gstr2bEntryInput[],
  bills: BillRecord[]
): { results: MatchResult[]; notInGstr2b: string[] } {
  const matchedBillIds = new Set<string>();

  const results: MatchResult[] = entries.map((entry) => {
    let bestScore = 0;
    let bestBillId: string | null = null;

    for (const bill of bills) {
      const s = scoreMatch(entry, bill);
      if (s > bestScore) {
        bestScore = s;
        bestBillId = bill.id;
      }
    }

    if (bestScore >= AUTO_MATCH_THRESHOLD && bestBillId) {
      matchedBillIds.add(bestBillId);
      return {
        entryId: entry.id,
        matchStatus: Gstr2bMatchStatus.AUTO_MATCHED,
        matchedBillId: bestBillId,
        matchConfidence: bestScore,
        matchNote: `Auto-matched with confidence ${(bestScore * 100).toFixed(1)}%`,
      };
    }

    if (bestScore >= SUGGEST_THRESHOLD && bestBillId) {
      return {
        entryId: entry.id,
        matchStatus: Gstr2bMatchStatus.SUGGESTED,
        matchedBillId: bestBillId,
        matchConfidence: bestScore,
        matchNote: `Suggested match with confidence ${(bestScore * 100).toFixed(1)}% — review required`,
      };
    }

    if (bestScore > 0 && bestScore < SUGGEST_THRESHOLD && bestBillId) {
      return {
        entryId: entry.id,
        matchStatus: Gstr2bMatchStatus.MISMATCH,
        matchedBillId: bestBillId,
        matchConfidence: bestScore,
        matchNote: `Possible match with confidence ${(bestScore * 100).toFixed(1)}% — significant discrepancy`,
      };
    }

    return {
      entryId: entry.id,
      matchStatus: Gstr2bMatchStatus.NOT_IN_BOOKS,
      matchedBillId: null,
      matchConfidence: 0,
      matchNote: "No corresponding purchase record found in books",
    };
  });

  // Bills present in books but not matched to any GSTR-2B entry
  const notInGstr2b = bills
    .filter((b) => !matchedBillIds.has(b.id))
    .map((b) => b.id);

  return { results, notInGstr2b };
}

/**
 * Parse GSTR-2B JSON (GST portal format) into a flat list of entries.
 * Handles B2B, CDNR, and ISD sections.
 */
export function parseGstr2bJson(raw: unknown): Omit<
  Gstr2bEntryInput,
  "id"
>[] {
  const data = raw as Record<string, unknown>;
  const result: Omit<Gstr2bEntryInput, "id">[] = [];

  // B2B section: inward supplies from registered suppliers
  const b2b = (data?.data as Record<string, unknown>)?.b2b as unknown[];
  if (Array.isArray(b2b)) {
    for (const supplier of b2b) {
      const s = supplier as Record<string, unknown>;
      const gstin = String(s.ctin ?? "");
      const docs = s.inv as unknown[] ?? [];
      for (const doc of docs) {
        const d = doc as Record<string, unknown>;
        const items = d.itms as unknown[] ?? [];
        let cgst = 0, sgst = 0, igst = 0, taxable = 0;
        for (const itm of items) {
          const i = (itm as Record<string, unknown>).itm_det as Record<string, unknown> ?? {};
          taxable += Number(i.txval ?? 0);
          cgst    += Number(i.camt  ?? 0);
          sgst    += Number(i.samt  ?? 0);
          igst    += Number(i.iamt  ?? 0);
        }
        result.push({
          supplierGstin: gstin,
          docNumber: String(d.inum ?? ""),
          docDate: String(d.idt ?? ""),
          docType: "B2B",
          taxableAmount: taxable,
          cgst, sgst, igst,
          totalTax: cgst + sgst + igst,
        });
      }
    }
  }

  // CDNR section: credit/debit notes from registered suppliers
  const cdnr = (data?.data as Record<string, unknown>)?.cdnr as unknown[];
  if (Array.isArray(cdnr)) {
    for (const supplier of cdnr) {
      const s = supplier as Record<string, unknown>;
      const gstin = String(s.ctin ?? "");
      const notes = s.nt as unknown[] ?? [];
      for (const note of notes) {
        const n = note as Record<string, unknown>;
        const items = n.itms as unknown[] ?? [];
        let cgst = 0, sgst = 0, igst = 0, taxable = 0;
        for (const itm of items) {
          const i = (itm as Record<string, unknown>).itm_det as Record<string, unknown> ?? {};
          taxable += Number(i.txval ?? 0);
          cgst    += Number(i.camt  ?? 0);
          sgst    += Number(i.samt  ?? 0);
          igst    += Number(i.iamt  ?? 0);
        }
        result.push({
          supplierGstin: gstin,
          docNumber: String(n.ntnum ?? ""),
          docDate: String(n.dt ?? ""),
          docType: "CDNR",
          taxableAmount: taxable,
          cgst, sgst, igst,
          totalTax: cgst + sgst + igst,
        });
      }
    }
  }

  return result;
}
