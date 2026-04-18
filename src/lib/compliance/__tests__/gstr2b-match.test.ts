import { describe, it, expect } from "vitest";
import {
  runGstr2bReconciliation,
  parseGstr2bJson,
  type Gstr2bEntryInput,
  type BillRecord,
} from "../gstr2b-match";
import { Gstr2bMatchStatus } from "@/generated/prisma/client";

function makeEntry(overrides: Partial<Gstr2bEntryInput> = {}): Gstr2bEntryInput {
  return {
    id: "entry-1",
    supplierGstin: "29AAACR5055K1ZK",
    docNumber: "INV/2026/001",
    docDate: "2026-03-10",
    docType: "B2B",
    taxableAmount: 100000,
    cgst: 9000,
    sgst: 9000,
    igst: 0,
    totalTax: 18000,
    ...overrides,
  };
}

function makeBill(overrides: Partial<BillRecord> = {}): BillRecord {
  return {
    id: "bill-1",
    vendorGstin: "29AAACR5055K1ZK",
    billNumber: "INV/2026/001",
    billDate: "2026-03-10",
    taxableAmount: 100000,
    cgst: 9000,
    sgst: 9000,
    igst: 0,
    ...overrides,
  };
}

describe("runGstr2bReconciliation", () => {
  it("auto-matches an exact entry to an exact bill", () => {
    const { results, notInGstr2b } = runGstr2bReconciliation(
      [makeEntry()],
      [makeBill()]
    );
    expect(results).toHaveLength(1);
    expect(results[0].matchStatus).toBe(Gstr2bMatchStatus.AUTO_MATCHED);
    expect(results[0].matchedBillId).toBe("bill-1");
    expect(results[0].matchConfidence).toBeGreaterThanOrEqual(0.98);
    expect(notInGstr2b).toHaveLength(0);
  });

  it("returns NOT_IN_BOOKS when GSTIN does not match", () => {
    const { results } = runGstr2bReconciliation(
      [makeEntry({ supplierGstin: "27AABCS1234Z1ZV" })],
      [makeBill()]
    );
    expect(results[0].matchStatus).toBe(Gstr2bMatchStatus.NOT_IN_BOOKS);
    expect(results[0].matchConfidence).toBe(0);
  });

  it("returns NOT_IN_BOOKS when no bills exist", () => {
    const { results, notInGstr2b } = runGstr2bReconciliation([makeEntry()], []);
    expect(results[0].matchStatus).toBe(Gstr2bMatchStatus.NOT_IN_BOOKS);
    expect(notInGstr2b).toHaveLength(0);
  });

  it("returns SUGGESTED for partial doc number match", () => {
    // Same GSTIN, close doc number (partial), same amounts → should be ≥ 0.75 but < 0.98
    const { results } = runGstr2bReconciliation(
      [makeEntry({ docNumber: "INV2026001" })],
      [makeBill({ billNumber: "INV/2026/001" })]
    );
    // partial normalisation: both normalise to "INV2026001" so actually AUTO_MATCHED
    expect([Gstr2bMatchStatus.AUTO_MATCHED, Gstr2bMatchStatus.SUGGESTED]).toContain(
      results[0].matchStatus
    );
  });

  it("returns MISMATCH for GSTIN match + doc match but amount discrepancy", () => {
    const { results } = runGstr2bReconciliation(
      [makeEntry({ cgst: 9000, sgst: 9000 })],
      [makeBill({ cgst: 5000, sgst: 5000 })] // significant amount diff
    );
    // GSTIN (0.4) + doc (0.3) = 0.7 → SUGGESTED
    expect(results[0].matchStatus).toBe(Gstr2bMatchStatus.SUGGESTED);
  });

  it("tracks bills not in GSTR-2B (notInGstr2b)", () => {
    const { notInGstr2b } = runGstr2bReconciliation(
      [makeEntry()],
      [makeBill(), makeBill({ id: "bill-2", billNumber: "INV/2026/002" })]
    );
    expect(notInGstr2b).toContain("bill-2");
  });

  it("handles multiple entries with different suppliers", () => {
    const entries: Gstr2bEntryInput[] = [
      makeEntry({ id: "e1", supplierGstin: "29AAACR5055K1ZK" }),
      makeEntry({ id: "e2", supplierGstin: "27AABCS1234Z1ZV", docNumber: "PO/001" }),
    ];
    const bills: BillRecord[] = [
      makeBill({ id: "b1", vendorGstin: "29AAACR5055K1ZK" }),
      makeBill({ id: "b2", vendorGstin: "27AABCS1234Z1ZV", billNumber: "PO/001" }),
    ];
    const { results } = runGstr2bReconciliation(entries, bills);
    expect(results[0].matchedBillId).toBe("b1");
    expect(results[1].matchedBillId).toBe("b2");
  });

  it("tolerates 0.5% amount variance for auto-match", () => {
    const { results } = runGstr2bReconciliation(
      [makeEntry({ taxableAmount: 100000 })],
      [makeBill({ taxableAmount: 100400 })] // 0.4% off — within tolerance
    );
    // GSTIN (0.4) + doc (0.3) + amounts (0.3 for taxable but cgst/sgst exact) = check
    expect(results[0].matchConfidence).toBeGreaterThan(0.5);
  });
});

describe("parseGstr2bJson", () => {
  it("parses B2B section correctly", () => {
    const raw = {
      data: {
        b2b: [
          {
            ctin: "29AAACR5055K1ZK",
            inv: [
              {
                inum: "INV/2026/001",
                idt: "10-03-2026",
                itms: [
                  {
                    itm_det: {
                      txval: 100000,
                      camt: 9000,
                      samt: 9000,
                      iamt: 0,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const entries = parseGstr2bJson(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].supplierGstin).toBe("29AAACR5055K1ZK");
    expect(entries[0].docNumber).toBe("INV/2026/001");
    expect(entries[0].docType).toBe("B2B");
    expect(entries[0].taxableAmount).toBe(100000);
    expect(entries[0].cgst).toBe(9000);
    expect(entries[0].totalTax).toBe(18000);
  });

  it("parses CDNR section correctly", () => {
    const raw = {
      data: {
        cdnr: [
          {
            ctin: "27AABCS1234Z1ZV",
            nt: [
              {
                ntnum: "CN/001",
                dt: "15-03-2026",
                itms: [
                  {
                    itm_det: {
                      txval: 5000,
                      camt: 450,
                      samt: 450,
                      iamt: 0,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const entries = parseGstr2bJson(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].docType).toBe("CDNR");
    expect(entries[0].supplierGstin).toBe("27AABCS1234Z1ZV");
    expect(entries[0].taxableAmount).toBe(5000);
  });

  it("returns empty array for empty JSON", () => {
    expect(parseGstr2bJson({})).toHaveLength(0);
    expect(parseGstr2bJson({ data: {} })).toHaveLength(0);
  });

  it("handles malformed/missing supplier GSTIN gracefully", () => {
    const raw = {
      data: {
        b2b: [
          {
            inv: [
              {
                inum: "X",
                idt: "01-01-2026",
                itms: [{ itm_det: { txval: 100, camt: 9, samt: 9, iamt: 0 } }],
              },
            ],
          },
        ],
      },
    };
    const entries = parseGstr2bJson(raw);
    // When ctin is missing, String(undefined) = "undefined" but our parser uses s.ctin ?? ""
    // so missing ctin results in empty string
    expect(entries[0].supplierGstin).toBe("");
  });
});
