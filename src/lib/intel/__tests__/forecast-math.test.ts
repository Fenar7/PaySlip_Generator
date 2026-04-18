import { describe, it, expect } from "vitest";
import {
  ema,
  linearRegression,
  generateProjections,
  computeRunRate,
  detectAnomalies,
  addMonths,
  round2,
  type MonthlyAggregate,
} from "../forecast-math";

// ─── EMA ──────────────────────────────────────────────────────────────────────

describe("ema", () => {
  it("returns empty for empty input", () => {
    expect(ema([], 0.5)).toEqual([]);
  });

  it("returns the value itself for a single element", () => {
    expect(ema([100], 0.5)).toEqual([100]);
  });

  it("computes EMA with alpha=1 (no smoothing)", () => {
    const values = [10, 20, 30];
    expect(ema(values, 1)).toEqual([10, 20, 30]);
  });

  it("computes EMA with alpha=0.5", () => {
    const values = [100, 200, 300];
    const result = ema(values, 0.5);
    expect(result[0]).toBe(100);
    expect(result[1]).toBe(150); // 0.5*200 + 0.5*100
    expect(result[2]).toBe(225); // 0.5*300 + 0.5*150
  });

  it("throws for alpha out of range", () => {
    expect(() => ema([1, 2], 0)).toThrow("alpha must be in (0, 1]");
    expect(() => ema([1, 2], 1.1)).toThrow("alpha must be in (0, 1]");
  });
});

// ─── Linear Regression ────────────────────────────────────────────────────────

describe("linearRegression", () => {
  it("returns zero slope for single value", () => {
    const result = linearRegression([42]);
    expect(result.slope).toBe(0);
    expect(result.intercept).toBe(42);
  });

  it("computes perfect positive linear trend", () => {
    const values = [10, 20, 30, 40, 50];
    const result = linearRegression(values);
    expect(result.slope).toBeCloseTo(10, 5);
    expect(result.intercept).toBeCloseTo(10, 5);
    expect(result.rSquared).toBeCloseTo(1, 5);
  });

  it("computes with noisy data and R² < 1", () => {
    const values = [100, 120, 90, 140, 130];
    const result = linearRegression(values);
    expect(result.rSquared).toBeGreaterThan(0);
    expect(result.rSquared).toBeLessThan(1);
  });

  it("handles constant values", () => {
    const result = linearRegression([50, 50, 50]);
    expect(result.slope).toBeCloseTo(0, 5);
    expect(result.intercept).toBeCloseTo(50, 5);
  });
});

// ─── Projections ──────────────────────────────────────────────────────────────

describe("generateProjections", () => {
  const historical: MonthlyAggregate[] = [
    { month: "2025-07", inflow: 1000, outflow: 800, net: 200 },
    { month: "2025-08", inflow: 1100, outflow: 850, net: 250 },
    { month: "2025-09", inflow: 1200, outflow: 900, net: 300 },
    { month: "2025-10", inflow: 1300, outflow: 950, net: 350 },
    { month: "2025-11", inflow: 1400, outflow: 1000, net: 400 },
    { month: "2025-12", inflow: 1500, outflow: 1050, net: 450 },
  ];

  it("returns empty for insufficient data", () => {
    expect(generateProjections([], 3)).toEqual([]);
    expect(generateProjections([historical[0]], 3)).toEqual([]);
  });

  it("returns correct number of months", () => {
    const result = generateProjections(historical, 3);
    expect(result).toHaveLength(3);
  });

  it("produces future month keys", () => {
    const result = generateProjections(historical, 3);
    expect(result[0].month).toBe("2026-01");
    expect(result[1].month).toBe("2026-02");
    expect(result[2].month).toBe("2026-03");
  });

  it("predicts inflows >= 0 for upward trending data", () => {
    const result = generateProjections(historical, 3);
    for (const p of result) {
      expect(p.predictedInflow).toBeGreaterThanOrEqual(0);
      expect(p.predictedOutflow).toBeGreaterThanOrEqual(0);
    }
  });

  it("confidence bands widen with horizon", () => {
    // Use slightly noisy data so RSE > 0
    const noisyData: MonthlyAggregate[] = [
      { month: "2025-07", inflow: 1000, outflow: 810, net: 190 },
      { month: "2025-08", inflow: 1120, outflow: 840, net: 280 },
      { month: "2025-09", inflow: 1180, outflow: 920, net: 260 },
      { month: "2025-10", inflow: 1320, outflow: 930, net: 390 },
      { month: "2025-11", inflow: 1380, outflow: 1010, net: 370 },
      { month: "2025-12", inflow: 1520, outflow: 1030, net: 490 },
    ];
    const result = generateProjections(noisyData, 3);
    const band1 = result[0].confidenceHigh - result[0].confidenceLow;
    const band3 = result[2].confidenceHigh - result[2].confidenceLow;
    expect(band3).toBeGreaterThan(band1);
  });

  it("values are rounded to 2 decimal places", () => {
    const result = generateProjections(historical, 1);
    const p = result[0];
    expect(p.predictedInflow).toBe(round2(p.predictedInflow));
    expect(p.predictedOutflow).toBe(round2(p.predictedOutflow));
    expect(p.predictedNet).toBe(round2(p.predictedNet));
  });
});

// ─── Run Rate ─────────────────────────────────────────────────────────────────

describe("computeRunRate", () => {
  it("returns zeros for empty data", () => {
    const result = computeRunRate([]);
    expect(result.mrr).toBe(0);
    expect(result.arr).toBe(0);
    expect(result.momGrowth).toBeNull();
  });

  it("computes MRR as average of last 3 months inflow", () => {
    const data: MonthlyAggregate[] = [
      { month: "2025-10", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-11", inflow: 2000, outflow: 600, net: 1400 },
      { month: "2025-12", inflow: 3000, outflow: 700, net: 2300 },
    ];
    const result = computeRunRate(data);
    expect(result.mrr).toBe(2000); // avg(1000,2000,3000)
    expect(result.arr).toBe(24000);
  });

  it("computes MoM growth from last 2 months", () => {
    const data: MonthlyAggregate[] = [
      { month: "2025-10", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-11", inflow: 1500, outflow: 600, net: 900 },
    ];
    const result = computeRunRate(data);
    expect(result.momGrowth).toBeCloseTo(0.5, 4); // 50% growth
  });

  it("returns null MoM growth when previous inflow is zero", () => {
    const data: MonthlyAggregate[] = [
      { month: "2025-10", inflow: 0, outflow: 500, net: -500 },
      { month: "2025-11", inflow: 1000, outflow: 600, net: 400 },
    ];
    expect(computeRunRate(data).momGrowth).toBeNull();
  });
});

// ─── Anomaly Detection ────────────────────────────────────────────────────────

describe("detectAnomalies", () => {
  it("returns empty for insufficient data (< 4 months)", () => {
    const data: MonthlyAggregate[] = [
      { month: "2025-10", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-11", inflow: 1000, outflow: 500, net: 500 },
    ];
    expect(detectAnomalies(data)).toEqual([]);
  });

  it("detects a clear spending spike", () => {
    const data: MonthlyAggregate[] = [
      { month: "2025-07", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-08", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-09", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-10", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-11", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-12", inflow: 1000, outflow: 10000, net: -9000 }, // 20x spike
    ];
    const anomalies = detectAnomalies(data);
    expect(anomalies.length).toBeGreaterThanOrEqual(1);
    const outflowAnomaly = anomalies.find((a) => a.type === "OUTFLOW" && a.month === "2025-12");
    expect(outflowAnomaly).toBeDefined();
    expect(outflowAnomaly!.zScore).toBeGreaterThan(2);
  });

  it("does not flag uniform data", () => {
    const data: MonthlyAggregate[] = [
      { month: "2025-07", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-08", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-09", inflow: 1000, outflow: 500, net: 500 },
      { month: "2025-10", inflow: 1000, outflow: 500, net: 500 },
    ];
    expect(detectAnomalies(data)).toEqual([]);
  });

  it("respects custom sigma threshold", () => {
    const data: MonthlyAggregate[] = [
      { month: "2025-07", inflow: 100, outflow: 50, net: 50 },
      { month: "2025-08", inflow: 200, outflow: 60, net: 140 },
      { month: "2025-09", inflow: 100, outflow: 50, net: 50 },
      { month: "2025-10", inflow: 200, outflow: 60, net: 140 },
      { month: "2025-11", inflow: 400, outflow: 50, net: 350 },
    ];
    // With high threshold, nothing fires
    const strict = detectAnomalies(data, 10);
    expect(strict).toEqual([]);
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

describe("addMonths", () => {
  it("adds months within the same year", () => {
    expect(addMonths("2026-01", 2)).toBe("2026-03");
  });

  it("wraps across year boundary", () => {
    expect(addMonths("2025-11", 3)).toBe("2026-02");
  });

  it("handles December to January", () => {
    expect(addMonths("2025-12", 1)).toBe("2026-01");
  });
});

describe("round2", () => {
  it("rounds to 2 decimal places", () => {
    // 1.005 in IEEE 754 is actually 1.00499... so Math.round gives 1.00
    expect(round2(1.005)).toBe(1);
    expect(round2(1.235)).toBe(1.24);
    expect(round2(1.999)).toBe(2);
    expect(round2(123.456)).toBe(123.46);
  });
});
