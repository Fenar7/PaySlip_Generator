import { describe, it, expect } from "vitest";
import { runThreeWayMatch } from "../three-way-match";
import { MatchStatus } from "@/generated/prisma/enums";
import type { PoLine, GrnLine, BillLine, ThreeWayMatchInput } from "../three-way-match";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePoLine(id: string, quantity: number, unitPrice: number): PoLine {
  return {
    id,
    inventoryItemId: `item-${id}`,
    description: `PO line ${id}`,
    quantity,
    unitPrice,
    lineTotal: quantity * unitPrice,
  };
}

function makeGrnLine(poLineId: string, acceptedQty: number): GrnLine {
  return { poLineId, acceptedQty };
}

function makeBillLine(
  poLineId: string,
  quantity: number,
  unitPrice: number
): BillLine {
  return {
    poLineId,
    inventoryItemId: `item-${poLineId}`,
    description: `Bill line ${poLineId}`,
    quantity,
    unitPrice,
    lineTotal: quantity * unitPrice,
  };
}

function makeInput(
  overrides: Partial<ThreeWayMatchInput> & {
    poLines: PoLine[];
    grnLines: GrnLine[];
    billLines: BillLine[];
  }
): ThreeWayMatchInput {
  return {
    purchaseOrderId: "po-1",
    qtyTolerancePct: 5,
    amountTolerancePct: 2,
    ...overrides,
  };
}

// ─── runThreeWayMatch ────────────────────────────────────────────────────────

describe("runThreeWayMatch", () => {
  it("returns MATCHED with overallScore=1 and no discrepancies on a perfect match", () => {
    // Both PO lines: GRN accepted = PO qty, bill qty = GRN qty, bill price = PO price.
    const poLines = [makePoLine("pl-1", 100, 500), makePoLine("pl-2", 50, 200)];
    const grnLines = [makeGrnLine("pl-1", 100), makeGrnLine("pl-2", 50)];
    const billLines = [makeBillLine("pl-1", 100, 500), makeBillLine("pl-2", 50, 200)];

    const result = runThreeWayMatch(
      makeInput({ poLines, grnLines, billLines, qtyTolerancePct: 5, amountTolerancePct: 2 })
    );

    expect(result.matchStatus).toBe(MatchStatus.MATCHED);
    expect(result.overallScore).toBeCloseTo(1.0, 4);
    expect(result.qtyMatchScore).toBeCloseTo(1.0, 4);
    expect(result.amountMatchScore).toBeCloseTo(1.0, 4);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("matches when billed quantity is within the quantity tolerance of GRN accepted qty", () => {
    // GRN received 100; bill says 97 (3% variance ≤ 5% tolerance).
    const poLines = [makePoLine("pl-1", 100, 1000)];
    const grnLines = [makeGrnLine("pl-1", 100)];
    const billLines = [makeBillLine("pl-1", 97, 1000)]; // 3% under-billed vs GRN

    const result = runThreeWayMatch(
      makeInput({ poLines, grnLines, billLines, qtyTolerancePct: 5, amountTolerancePct: 2 })
    );

    expect(result.matchStatus).toBe(MatchStatus.MATCHED);
    expect(result.qtyMatchScore).toBeCloseTo(1.0, 4);
    expect(result.discrepancies.filter((d) => d.field === "quantity")).toHaveLength(0);
  });

  it("flags a quantity discrepancy when billed qty exceeds tolerance vs GRN accepted qty", () => {
    // GRN received 100; bill says 85 (15% variance > 5% tolerance).
    const poLines = [makePoLine("pl-1", 100, 1000)];
    const grnLines = [makeGrnLine("pl-1", 100)];
    const billLines = [makeBillLine("pl-1", 85, 1000)]; // 15% under-billed vs GRN

    const result = runThreeWayMatch(
      makeInput({ poLines, grnLines, billLines, qtyTolerancePct: 5, amountTolerancePct: 2 })
    );

    expect([MatchStatus.MISMATCH, MatchStatus.PARTIAL_MATCH]).toContain(result.matchStatus);
    expect(result.discrepancies.some((d) => d.field === "quantity")).toBe(true);
    const qtyDisc = result.discrepancies.find(
      (d) => d.poLineId === "pl-1" && d.field === "quantity"
    );
    expect(qtyDisc).toBeDefined();
    expect(qtyDisc!.variancePct).toBeGreaterThan(5);
  });

  it("flags a price discrepancy when bill unit price exceeds the amount tolerance vs PO price", () => {
    // PO unitPrice=1000; bill unitPrice=1030 (3% variance > 2% tolerance).
    const poLines = [makePoLine("pl-1", 50, 1000)];
    const grnLines = [makeGrnLine("pl-1", 50)];
    const billLines = [makeBillLine("pl-1", 50, 1030)]; // 3% price increase

    const result = runThreeWayMatch(
      makeInput({ poLines, grnLines, billLines, qtyTolerancePct: 5, amountTolerancePct: 2 })
    );

    expect(result.amountMatchScore).toBeLessThan(1.0);
    expect(result.discrepancies.some((d) => d.field === "unitPrice")).toBe(true);
    const priceDisc = result.discrepancies.find(
      (d) => d.poLineId === "pl-1" && d.field === "unitPrice"
    );
    expect(priceDisc).toBeDefined();
    expect(priceDisc!.variancePct).toBeCloseTo(3, 1);
  });

  it("returns PARTIAL_MATCH when 3 of 4 lines match perfectly but 1 has 20% price variance", () => {
    // Lines pl-1..pl-3 match exactly. Line pl-4 has 20% price variance (>2% threshold).
    // qtyMatchScore = 4/4 = 1.0; amountMatchScore = 3/4 = 0.75; overallScore = 0.875
    const poLines = [
      makePoLine("pl-1", 100, 500),
      makePoLine("pl-2", 200, 300),
      makePoLine("pl-3", 50, 800),
      makePoLine("pl-4", 80, 1000),
    ];
    const grnLines = [
      makeGrnLine("pl-1", 100),
      makeGrnLine("pl-2", 200),
      makeGrnLine("pl-3", 50),
      makeGrnLine("pl-4", 80),
    ];
    const billLines = [
      makeBillLine("pl-1", 100, 500),
      makeBillLine("pl-2", 200, 300),
      makeBillLine("pl-3", 50, 800),
      makeBillLine("pl-4", 80, 1200), // 20% price variance
    ];

    const result = runThreeWayMatch(
      makeInput({ poLines, grnLines, billLines, qtyTolerancePct: 5, amountTolerancePct: 2 })
    );

    expect(result.matchStatus).toBe(MatchStatus.PARTIAL_MATCH);
    expect(result.overallScore).toBeGreaterThanOrEqual(0.8);
    expect(result.overallScore).toBeLessThan(0.95);
  });

  it("returns MISMATCH when all lines have >20% quantity variance", () => {
    // GRN accepted 100 each, bill claims 200 each (100% variance >> 5% tolerance).
    const poLines = [
      makePoLine("pl-1", 100, 500),
      makePoLine("pl-2", 100, 500),
      makePoLine("pl-3", 100, 500),
    ];
    const grnLines = [
      makeGrnLine("pl-1", 100),
      makeGrnLine("pl-2", 100),
      makeGrnLine("pl-3", 100),
    ];
    const billLines = [
      makeBillLine("pl-1", 25, 600), // 75% qty variance + 20% price variance
      makeBillLine("pl-2", 25, 600),
      makeBillLine("pl-3", 25, 600),
    ];

    const result = runThreeWayMatch(
      makeInput({ poLines, grnLines, billLines, qtyTolerancePct: 5, amountTolerancePct: 2 })
    );

    expect(result.matchStatus).toBe(MatchStatus.MISMATCH);
    expect(result.overallScore).toBeLessThan(0.8);
  });

  it("returns PENDING with zero scores when poLines is empty", () => {
    const result = runThreeWayMatch(
      makeInput({ poLines: [], grnLines: [], billLines: [] })
    );

    expect(result.matchStatus).toBe(MatchStatus.PENDING);
    expect(result.qtyMatchScore).toBe(0);
    expect(result.amountMatchScore).toBe(0);
    expect(result.overallScore).toBe(0);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("lowers qtyMatchScore when a bill line is missing for a PO line", () => {
    // PO has 2 lines; bill only covers pl-1. pl-2 has no bill match → billedQty=0 vs grnQty>0.
    const poLines = [makePoLine("pl-1", 50, 200), makePoLine("pl-2", 50, 200)];
    const grnLines = [makeGrnLine("pl-1", 50), makeGrnLine("pl-2", 50)];
    const billLines = [makeBillLine("pl-1", 50, 200)]; // pl-2 has no bill line

    const result = runThreeWayMatch(
      makeInput({ poLines, grnLines, billLines, qtyTolerancePct: 5, amountTolerancePct: 2 })
    );

    // pl-2 billed qty=0 vs GRN qty=50 → 100% variance → fails qty check
    // qtyMatchScore = 1/2 = 0.5
    expect(result.qtyMatchScore).toBeCloseTo(0.5, 4);
    expect(result.discrepancies.some((d) => d.poLineId === "pl-2" && d.field === "quantity")).toBe(
      true
    );
  });

  it("returns MATCHED with overallScore=1.0 for a single perfectly matched line", () => {
    const poLines = [makePoLine("pl-1", 20, 750)];
    const grnLines = [makeGrnLine("pl-1", 20)];
    const billLines = [makeBillLine("pl-1", 20, 750)];

    const result = runThreeWayMatch(
      makeInput({ poLines, grnLines, billLines, qtyTolerancePct: 5, amountTolerancePct: 2 })
    );

    expect(result.matchStatus).toBe(MatchStatus.MATCHED);
    expect(result.overallScore).toBeCloseTo(1.0, 4);
    expect(result.discrepancies).toHaveLength(0);
  });

  it("matches at the exact tolerance boundary (variance == tolerance)", () => {
    // qtyTolerance=5%. GRN qty=100, bill qty=95 (exactly 5% variance).
    // 0.05 <= 0.05 → passes qty check; qtyMatchScore should be 1.0.
    const poLines = [makePoLine("pl-1", 100, 1000)];
    const grnLines = [makeGrnLine("pl-1", 100)];
    const billLines = [makeBillLine("pl-1", 95, 1000)]; // exactly 5% off GRN

    const result = runThreeWayMatch(
      makeInput({ poLines, grnLines, billLines, qtyTolerancePct: 5, amountTolerancePct: 2 })
    );

    expect(result.qtyMatchScore).toBeCloseTo(1.0, 4);
    expect(result.discrepancies.filter((d) => d.field === "quantity")).toHaveLength(0);
  });

  it("rejects at just above the tolerance boundary (variance slightly > tolerance)", () => {
    // qtyTolerance=5%. GRN qty=100, bill qty=94 (6% variance > 5% tolerance).
    const poLines = [makePoLine("pl-1", 100, 1000)];
    const grnLines = [makeGrnLine("pl-1", 100)];
    const billLines = [makeBillLine("pl-1", 94, 1000)]; // 6% off GRN

    const result = runThreeWayMatch(
      makeInput({ poLines, grnLines, billLines, qtyTolerancePct: 5, amountTolerancePct: 2 })
    );

    expect(result.qtyMatchScore).toBeCloseTo(0, 4);
    expect(result.discrepancies.some((d) => d.field === "quantity")).toBe(true);
  });
});
