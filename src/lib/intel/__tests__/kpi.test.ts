import { describe, it, expect } from "vitest";
import {
  computeMrrArr,
  mrrToArr,
  computeBurnRate,
  computeRunway,
  computeDso,
  computeDpo,
  computeCollectionRate,
  computeGrossMargin,
  computeWorkingCapital,
} from "../kpi";

// ─── MRR / ARR ─────────────────────────────────────────────────────────────

describe("computeMrrArr", () => {
  it("computes MRR from active rules × avg amount", () => {
    const result = computeMrrArr({
      activeRecurringRules: 10,
      avgRecurringAmount: 5000,
      previousMrr: 45000,
      monthlyMrr: [40000, 42000, 44000, 45000, 48000, 50000],
    });
    expect(result.id).toBe("mrr-arr");
    expect(result.currentValue).toBe(50000);
    expect(result.trend).toBe("UP");
    expect(result.trendIsPositive).toBe(true);
    expect(result.unit).toBe("currency");
    expect(result.sparkline).toHaveLength(6);
  });

  it("handles zero rules gracefully", () => {
    const result = computeMrrArr({
      activeRecurringRules: 0,
      avgRecurringAmount: 0,
      previousMrr: 0,
      monthlyMrr: [],
    });
    expect(result.currentValue).toBe(0);
    expect(result.changePct).toBe(0); // 0/0 = safeDivide → 0
    expect(result.trend).toBe("FLAT");
  });

  it("detects downward trend", () => {
    const result = computeMrrArr({
      activeRecurringRules: 5,
      avgRecurringAmount: 1000,
      previousMrr: 6000,
      monthlyMrr: [6000, 5500, 5000],
    });
    expect(result.currentValue).toBe(5000);
    expect(result.trend).toBe("DOWN");
    expect(result.trendIsPositive).toBe(false);
  });
});

describe("mrrToArr", () => {
  it("multiplies MRR by 12", () => {
    expect(mrrToArr(50000)).toBe(600000);
  });

  it("handles zero", () => {
    expect(mrrToArr(0)).toBe(0);
  });
});

// ─── Burn Rate ──────────────────────────────────────────────────────────────

describe("computeBurnRate", () => {
  it("computes burn and flags decreased burn as positive", () => {
    const result = computeBurnRate({
      currentOutflow: 80000,
      previousOutflow: 100000,
      monthlyOutflow: [100000, 95000, 90000, 85000, 80000],
    });
    expect(result.currentValue).toBe(80000);
    expect(result.trend).toBe("DOWN");
    expect(result.trendIsPositive).toBe(true); // lower burn is better
  });

  it("flags increased burn as negative", () => {
    const result = computeBurnRate({
      currentOutflow: 120000,
      previousOutflow: 100000,
      monthlyOutflow: [100000, 110000, 120000],
    });
    expect(result.trend).toBe("UP");
    expect(result.trendIsPositive).toBe(false);
  });

  it("handles zero outflow", () => {
    const result = computeBurnRate({
      currentOutflow: 0,
      previousOutflow: 0,
      monthlyOutflow: [],
    });
    expect(result.currentValue).toBe(0);
    expect(result.trend).toBe("FLAT");
  });
});

// ─── Runway ─────────────────────────────────────────────────────────────────

describe("computeRunway", () => {
  it("computes months of cash at burn rate", () => {
    const result = computeRunway({ currentBalance: 600000, monthlyBurn: 100000 });
    expect(result.currentValue).toBe(6);
    expect(result.unit).toBe("months");
  });

  it("returns 0 when burn is zero (infinite runway → capped)", () => {
    const result = computeRunway({ currentBalance: 100000, monthlyBurn: 0 });
    expect(result.currentValue).toBe(0); // safeDivide returns 0
  });

  it("flags low runway correctly", () => {
    const result = computeRunway({ currentBalance: 200000, monthlyBurn: 100000 });
    expect(result.currentValue).toBe(2);
    expect(result.trend).toBe("DOWN"); // < 3 months
    expect(result.trendIsPositive).toBe(false);
  });

  it("flags healthy runway", () => {
    const result = computeRunway({ currentBalance: 1200000, monthlyBurn: 100000 });
    expect(result.currentValue).toBe(12);
    expect(result.trendIsPositive).toBe(true);
  });
});

// ─── DSO ────────────────────────────────────────────────────────────────────

describe("computeDso", () => {
  it("computes DSO = (Receivable / Revenue) × Days", () => {
    const result = computeDso({
      totalReceivable: 50000,
      totalRevenue: 100000,
      daysInPeriod: 30,
      previousDso: 20,
      monthlyDso: [18, 19, 20, 21, 15],
    });
    expect(result.currentValue).toBe(15);
    expect(result.trend).toBe("DOWN");
    expect(result.trendIsPositive).toBe(true); // lower DSO is better
  });

  it("handles zero revenue", () => {
    const result = computeDso({
      totalReceivable: 50000,
      totalRevenue: 0,
      daysInPeriod: 30,
      previousDso: 10,
      monthlyDso: [],
    });
    expect(result.currentValue).toBe(0);
  });

  it("handles zero receivable", () => {
    const result = computeDso({
      totalReceivable: 0,
      totalRevenue: 100000,
      daysInPeriod: 30,
      previousDso: 10,
      monthlyDso: [],
    });
    expect(result.currentValue).toBe(0);
    expect(result.trendIsPositive).toBe(true);
  });
});

// ─── DPO ────────────────────────────────────────────────────────────────────

describe("computeDpo", () => {
  it("computes DPO = (Payable / Cost) × Days", () => {
    const result = computeDpo({
      totalPayable: 40000,
      totalCost: 80000,
      daysInPeriod: 30,
      previousDpo: 12,
      monthlyDpo: [10, 11, 12, 13, 15],
    });
    expect(result.currentValue).toBe(15);
    expect(result.trend).toBe("UP");
    expect(result.trendIsPositive).toBe(true); // higher DPO = better cash retention
  });

  it("handles zero costs", () => {
    const result = computeDpo({
      totalPayable: 40000,
      totalCost: 0,
      daysInPeriod: 30,
      previousDpo: 10,
      monthlyDpo: [],
    });
    expect(result.currentValue).toBe(0);
  });
});

// ─── Collection Rate ────────────────────────────────────────────────────────

describe("computeCollectionRate", () => {
  it("computes rate = (Collected / Invoiced) × 100", () => {
    const result = computeCollectionRate({
      totalCollected: 80000,
      totalInvoiced: 100000,
      previousRate: 75,
      monthlyRates: [70, 72, 75, 78, 80],
    });
    expect(result.currentValue).toBe(80);
    expect(result.unit).toBe("%");
    expect(result.trend).toBe("UP");
    expect(result.trendIsPositive).toBe(true);
  });

  it("handles zero invoiced", () => {
    const result = computeCollectionRate({
      totalCollected: 0,
      totalInvoiced: 0,
      previousRate: 0,
      monthlyRates: [],
    });
    expect(result.currentValue).toBe(0);
  });

  it("clamps to reasonable values (over-collection from old invoices)", () => {
    const result = computeCollectionRate({
      totalCollected: 120000,
      totalInvoiced: 100000,
      previousRate: 95,
      monthlyRates: [90, 95],
    });
    expect(result.currentValue).toBe(120); // raw calculation, no artificial cap
  });
});

// ─── Gross Margin ───────────────────────────────────────────────────────────

describe("computeGrossMargin", () => {
  it("computes margin = (Rev - Costs) / Rev × 100", () => {
    const result = computeGrossMargin({
      totalRevenue: 100000,
      totalDirectCosts: 40000,
      previousMargin: 55,
      monthlyMargins: [50, 52, 55, 58, 60],
    });
    expect(result.currentValue).toBe(60);
    expect(result.unit).toBe("%");
    expect(result.trend).toBe("UP");
    expect(result.trendIsPositive).toBe(true);
  });

  it("handles zero revenue", () => {
    const result = computeGrossMargin({
      totalRevenue: 0,
      totalDirectCosts: 5000,
      previousMargin: 50,
      monthlyMargins: [],
    });
    expect(result.currentValue).toBe(0);
  });

  it("handles negative margin (costs > revenue)", () => {
    const result = computeGrossMargin({
      totalRevenue: 50000,
      totalDirectCosts: 70000,
      previousMargin: 10,
      monthlyMargins: [10],
    });
    expect(result.currentValue).toBe(-40);
    expect(result.trend).toBe("DOWN");
    expect(result.trendIsPositive).toBe(false);
  });
});

// ─── Working Capital ────────────────────────────────────────────────────────

describe("computeWorkingCapital", () => {
  it("computes WC = Assets - Liabilities", () => {
    const result = computeWorkingCapital({
      currentAssets: 500000,
      currentLiabilities: 200000,
      previousWorkingCapital: 250000,
      monthlyWc: [200000, 220000, 250000, 280000, 300000],
    });
    expect(result.currentValue).toBe(300000);
    expect(result.unit).toBe("currency");
    expect(result.trend).toBe("UP");
    expect(result.trendIsPositive).toBe(true);
  });

  it("handles negative working capital", () => {
    const result = computeWorkingCapital({
      currentAssets: 100000,
      currentLiabilities: 200000,
      previousWorkingCapital: -50000,
      monthlyWc: [-80000, -50000],
    });
    expect(result.currentValue).toBe(-100000);
    expect(result.trend).toBe("DOWN");
    expect(result.trendIsPositive).toBe(false);
  });

  it("handles zero everything", () => {
    const result = computeWorkingCapital({
      currentAssets: 0,
      currentLiabilities: 0,
      previousWorkingCapital: 0,
      monthlyWc: [],
    });
    expect(result.currentValue).toBe(0);
    expect(result.trend).toBe("FLAT");
  });
});

// ─── Sparkline padding ─────────────────────────────────────────────────────

describe("sparkline padding", () => {
  it("pads short sparkline data to 6 points", () => {
    const result = computeGrossMargin({
      totalRevenue: 100000,
      totalDirectCosts: 40000,
      previousMargin: 55,
      monthlyMargins: [60],
    });
    expect(result.sparkline).toHaveLength(6);
    expect(result.sparkline[0]).toBe(0);
    expect(result.sparkline[5]).toBe(60);
  });

  it("truncates long sparkline data to last 6 points", () => {
    const result = computeCollectionRate({
      totalCollected: 80000,
      totalInvoiced: 100000,
      previousRate: 75,
      monthlyRates: [60, 65, 70, 72, 74, 76, 78, 80],
    });
    expect(result.sparkline).toHaveLength(6);
    expect(result.sparkline[0]).toBe(70);
    expect(result.sparkline[5]).toBe(80);
  });
});
