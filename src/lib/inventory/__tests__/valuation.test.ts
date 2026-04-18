import { describe, it, expect } from "vitest";
import {
  buildFifoLayers,
  computeFifoCogs,
  computeLifoCogs,
  computeWeightedAverageCogs,
  computeNewWeightedAverage,
} from "../valuation";
import { StockEventType } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(
  id: string,
  eventType: StockEventType,
  quantity: number,
  unitCost: number,
  createdAt = new Date("2024-01-01")
) {
  return { id, eventType, quantity, unitCost: new Prisma.Decimal(unitCost), createdAt };
}

function makeLayer(quantity: number, unitCost: number, eventId = "e1") {
  return { quantity, unitCost, eventId, createdAt: new Date("2024-01-01") };
}

// ─── buildFifoLayers ─────────────────────────────────────────────────────────

describe("buildFifoLayers", () => {
  it("builds layers from PURCHASE_RECEIPT events", () => {
    const events = [
      makeEvent("e1", StockEventType.PURCHASE_RECEIPT, 10, 100),
      makeEvent("e2", StockEventType.PURCHASE_RECEIPT, 20, 120),
      makeEvent("e3", StockEventType.PURCHASE_RECEIPT, 30, 110),
    ];

    const layers = buildFifoLayers(events);

    expect(layers).toHaveLength(3);
    expect(layers[0]).toMatchObject({ quantity: 10, unitCost: 100, eventId: "e1" });
    expect(layers[1]).toMatchObject({ quantity: 20, unitCost: 120, eventId: "e2" });
    expect(layers[2]).toMatchObject({ quantity: 30, unitCost: 110, eventId: "e3" });
  });

  it("filters out outbound event types (SALES_DISPATCH, ADJUSTMENT_OUT, etc.)", () => {
    const events = [
      makeEvent("e1", StockEventType.PURCHASE_RECEIPT, 50, 100),
      makeEvent("e2", StockEventType.SALES_DISPATCH, 20, 100),
      makeEvent("e3", StockEventType.ADJUSTMENT_OUT, 5, 100),
      makeEvent("e4", StockEventType.TRANSFER_OUT, 3, 100),
      makeEvent("e5", StockEventType.RETURN_OUT, 2, 100),
    ];

    const layers = buildFifoLayers(events);

    expect(layers).toHaveLength(1);
    expect(layers[0].eventId).toBe("e1");
  });

  it("includes OPENING_BALANCE, RETURN_IN, and ADJUSTMENT_IN as inbound layers", () => {
    const events = [
      makeEvent("e1", StockEventType.OPENING_BALANCE, 100, 90),
      makeEvent("e2", StockEventType.RETURN_IN, 5, 95),
      makeEvent("e3", StockEventType.ADJUSTMENT_IN, 10, 98),
    ];

    const layers = buildFifoLayers(events);

    expect(layers).toHaveLength(3);
    expect(layers.map((l) => l.eventId)).toEqual(["e1", "e2", "e3"]);
  });

  it("skips inbound events with zero or negative quantity", () => {
    const events = [
      makeEvent("e1", StockEventType.PURCHASE_RECEIPT, 0, 100),
      makeEvent("e2", StockEventType.PURCHASE_RECEIPT, -5, 100),
      makeEvent("e3", StockEventType.PURCHASE_RECEIPT, 10, 100),
    ];

    const layers = buildFifoLayers(events);

    expect(layers).toHaveLength(1);
    expect(layers[0].eventId).toBe("e3");
  });
});

// ─── computeFifoCogs ─────────────────────────────────────────────────────────

describe("computeFifoCogs", () => {
  it("consumes oldest layers first and returns correct cogs (exact match)", () => {
    // Layers: 10@100, 20@120, 30@110. Dispatch 25.
    // Consume: 10 from layer1 (1000) + 15 from layer2 (1800) = 2800
    const layers = [
      makeLayer(10, 100, "e1"),
      makeLayer(20, 120, "e2"),
      makeLayer(30, 110, "e3"),
    ];

    const result = computeFifoCogs(layers, 25);

    expect(result.cogs.toNumber()).toBeCloseTo(2800, 2);
    expect(result.remainingLayers).toHaveLength(2);
    expect(result.remainingLayers[0]).toMatchObject({ quantity: 5, unitCost: 120 }); // layer2 remainder
    expect(result.remainingLayers[1]).toMatchObject({ quantity: 30, unitCost: 110 }); // layer3 untouched
  });

  it("uses last known unit cost when dispatch quantity exceeds available stock", () => {
    // 1 layer: 5@100. Dispatch 10.
    // Consume: 5 from layer1 (500) + 5 remainder at last cost 100 (500) = 1000
    const layers = [makeLayer(5, 100, "e1")];

    const result = computeFifoCogs(layers, 10);

    expect(result.cogs.toNumber()).toBeCloseTo(1000, 2);
    expect(result.remainingLayers).toHaveLength(0); // layer fully consumed
  });

  it("returns cogs of 0 when layers are empty", () => {
    const result = computeFifoCogs([], 5);

    expect(result.cogs.toNumber()).toBeCloseTo(0, 4);
    expect(result.remainingLayers).toHaveLength(0);
  });

  it("returns empty remainingLayers when dispatch matches total stock exactly", () => {
    const layers = [makeLayer(10, 50, "e1"), makeLayer(10, 60, "e2")];

    const result = computeFifoCogs(layers, 20);

    expect(result.cogs.toNumber()).toBeCloseTo(1100, 2); // (10*50)+(10*60)
    expect(result.remainingLayers).toHaveLength(0);
  });

  it("does not mutate the original layers array", () => {
    const layers = [makeLayer(10, 100, "e1")];
    const originalQty = layers[0].quantity;

    computeFifoCogs(layers, 5);

    expect(layers[0].quantity).toBe(originalQty);
  });
});

// ─── computeLifoCogs ─────────────────────────────────────────────────────────

describe("computeLifoCogs", () => {
  it("consumes newest layers first and returns correct cogs", () => {
    // Layers: 10@100, 20@120, 30@110. Dispatch 35.
    // LIFO reversed: 30@110, 20@120, 10@100
    // Consume: 30 from layer3 (3300) + 5 from layer2 (600) = 3900
    const layers = [
      makeLayer(10, 100, "e1"),
      makeLayer(20, 120, "e2"),
      makeLayer(30, 110, "e3"),
    ];

    const result = computeLifoCogs(layers, 35);

    expect(result.cogs.toNumber()).toBeCloseTo(3900, 2);
    expect(result.remainingLayers).toHaveLength(2);
    // layer2 has 15 remaining, layer1 (oldest) untouched
    const qtys = result.remainingLayers.map((l) => l.quantity).sort((a, b) => a - b);
    expect(qtys).toEqual([10, 15]);
  });

  it("LIFO produces higher cogs than FIFO when newer layers are more expensive", () => {
    // Layers: 10@100 (oldest), 10@200 (newest). Dispatch 10.
    // FIFO cogs = 10*100 = 1000; LIFO cogs = 10*200 = 2000
    const layers = [makeLayer(10, 100, "e1"), makeLayer(10, 200, "e2")];

    const fifoResult = computeFifoCogs(layers, 10);
    const lifoResult = computeLifoCogs(layers, 10);

    expect(lifoResult.cogs.toNumber()).toBeGreaterThan(fifoResult.cogs.toNumber());
    expect(lifoResult.cogs.toNumber()).toBeCloseTo(2000, 2);
    expect(fifoResult.cogs.toNumber()).toBeCloseTo(1000, 2);
  });

  it("returns correct remainingLayers with oldest layers preserved", () => {
    // Layers: 10@100, 20@120, 30@110. Dispatch 30 (exact newest layer).
    const layers = [
      makeLayer(10, 100, "e1"),
      makeLayer(20, 120, "e2"),
      makeLayer(30, 110, "e3"),
    ];

    const result = computeLifoCogs(layers, 30);

    expect(result.cogs.toNumber()).toBeCloseTo(3300, 2);
    expect(result.remainingLayers).toHaveLength(2);
    expect(result.remainingLayers[0]).toMatchObject({ quantity: 10, unitCost: 100 });
    expect(result.remainingLayers[1]).toMatchObject({ quantity: 20, unitCost: 120 });
  });
});

// ─── computeWeightedAverageCogs ──────────────────────────────────────────────

describe("computeWeightedAverageCogs", () => {
  it("computes cogs using average cost of current stock", () => {
    // avgCost = 5500 / 50 = 110. Dispatch 10. cogs = 1100.
    const layers = [makeLayer(50, 110, "e1")];

    const result = computeWeightedAverageCogs(layers, 50, 5500, 10);

    expect(result.cogs.toNumber()).toBeCloseTo(1100, 2);
  });

  it("returns cogs of 0 and does not divide by zero when currentStock is 0", () => {
    const result = computeWeightedAverageCogs([], 0, 0, 5);

    expect(result.cogs.toNumber()).toBeCloseTo(0, 4);
  });

  it("passes layers through unchanged (WA does not consume layers)", () => {
    const layers = [makeLayer(50, 110, "e1"), makeLayer(30, 120, "e2")];

    const result = computeWeightedAverageCogs(layers, 80, 8960, 10);

    expect(result.remainingLayers).toHaveLength(2);
    expect(result.remainingLayers[0]).toMatchObject({ quantity: 50, unitCost: 110 });
    expect(result.remainingLayers[1]).toMatchObject({ quantity: 30, unitCost: 120 });
  });

  it("scales linearly with dispatch quantity", () => {
    const resultA = computeWeightedAverageCogs([], 100, 10000, 10);
    const resultB = computeWeightedAverageCogs([], 100, 10000, 20);

    expect(resultB.cogs.toNumber()).toBeCloseTo(resultA.cogs.toNumber() * 2, 4);
  });
});

// ─── computeNewWeightedAverage ───────────────────────────────────────────────

describe("computeNewWeightedAverage", () => {
  it("blends existing and incoming stock to compute a new average cost", () => {
    // existing: 50 units @ 110 avg. incoming: 20 units @ 130.
    // newAvg = (50*110 + 20*130) / 70 = (5500+2600)/70 = 8100/70 ≈ 115.714
    const result = computeNewWeightedAverage(50, 110, 20, 130);

    expect(result).toBeCloseTo(115.714, 2);
  });

  it("returns incomingCost when existingQty is 0", () => {
    // No prior stock — new average should equal the incoming unit cost.
    const result = computeNewWeightedAverage(0, 0, 10, 100);

    expect(result).toBeCloseTo(100, 4);
  });

  it("returns existingValuation when incomingQty is 0", () => {
    const result = computeNewWeightedAverage(50, 110, 0, 0);

    expect(result).toBeCloseTo(110, 4);
  });

  it("returns 0 when both existingQty and incomingQty are 0", () => {
    const result = computeNewWeightedAverage(0, 0, 0, 0);

    expect(result).toBe(0);
  });

  it("weights lower-cost incoming stock down when incoming volume is smaller", () => {
    // existing: 90 units @ 200. incoming: 10 units @ 100.
    // newAvg = (90*200 + 10*100) / 100 = (18000+1000)/100 = 190
    const result = computeNewWeightedAverage(90, 200, 10, 100);

    expect(result).toBeCloseTo(190, 4);
  });
});
