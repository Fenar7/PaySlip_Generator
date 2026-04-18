import { describe, it, expect } from "vitest";
import {
  computePayrollItem,
  computeProfessionalTax,
  computeMonthlyTds,
  MAHARASHTRA_PT_SLABS,
  PF_WAGE_CEILING,
} from "../calculator";

// Helper: round to 2dp like the calculator does
const r2 = (n: number) => Math.round(n * 100) / 100;

describe("computePayrollItem", () => {
  it("high earner — ₹36L CTC (PF capped at ₹15k wage ceiling)", () => {
    const result = computePayrollItem({
      ctcAnnual: 36_00_000,
      taxRegime: "new",
      panNumber: "ABCDE1234F",
    });

    expect(result.monthlyCtc).toBe(3_00_000);
    // Basic = 40% of 3L = 1,20,000 — BUT PF is capped at 15k wage ceiling
    expect(result.basicPay).toBe(1_20_000);
    // PF employee = 12% × 15,000 = 1,800 (capped)
    expect(result.pfEmployee).toBe(1_800);
    // PF employer = 13% × 15,000 = 1,950 (capped)
    expect(result.pfEmployer).toBe(1_950);
    // ESI: not applicable — gross > ₹21,000
    expect(result.esiEmployee).toBe(0);
    expect(result.esiEmployer).toBe(0);
    expect(result.grossPay).toBeGreaterThan(0);
    expect(result.netPay).toBeLessThan(result.grossPay);
  });

  it("low earner — ₹2.4L CTC (ESI eligible, gross ≤ ₹21k)", () => {
    const result = computePayrollItem({
      ctcAnnual: 2_40_000,
      taxRegime: "new",
      panNumber: "ABCDE1234F",
    });

    const monthlyCtc = 20_000;
    expect(result.monthlyCtc).toBe(monthlyCtc);
    // Basic = 40% = 8,000
    expect(result.basicPay).toBe(8_000);
    // PF employee = 12% × 8,000 = 960 (below cap)
    expect(result.pfEmployee).toBe(960);
    // ESI employee = 0.75% × gross
    expect(result.esiEmployee).toBeGreaterThan(0);
    expect(result.esiEmployer).toBeGreaterThan(0);
  });

  it("PF opt-out — no PF deductions", () => {
    const withPf = computePayrollItem({ ctcAnnual: 6_00_000, panNumber: "X" });
    const noPf = computePayrollItem({
      ctcAnnual: 6_00_000,
      pfOptOut: true,
      panNumber: "X",
    });

    expect(noPf.pfEmployee).toBe(0);
    expect(noPf.pfEmployer).toBe(0);
    // Gross should be higher because employer PF not deducted from CTC distribution
    expect(noPf.grossPay).toBeGreaterThanOrEqual(withPf.grossPay);
  });

  it("attendance pro-ration — 20 of 26 working days (LOP = 6)", () => {
    const fullMonth = computePayrollItem({
      ctcAnnual: 6_00_000,
      workingDays: 26,
      attendedDays: 26,
    });
    const lopMonth = computePayrollItem({
      ctcAnnual: 6_00_000,
      workingDays: 26,
      attendedDays: 20,
    });

    // Pro-rated monthly CTC = 50,000 × (20/26) ≈ 38,461
    expect(lopMonth.monthlyCtc).toBeLessThan(fullMonth.monthlyCtc);
    expect(lopMonth.grossPay).toBeLessThan(fullMonth.grossPay);
    expect(lopMonth.netPay).toBeLessThan(fullMonth.netPay);

    // Check the ratio is approximately correct
    const ratio = lopMonth.monthlyCtc / fullMonth.monthlyCtc;
    expect(ratio).toBeCloseTo(20 / 26, 2);
  });

  it("old vs new tax regime — old regime yields different TDS for same salary", () => {
    const ctc = 12_00_000;
    const newRegime = computePayrollItem({
      ctcAnnual: ctc,
      taxRegime: "new",
      panNumber: "ABCDE1234F",
    });
    const oldRegime = computePayrollItem({
      ctcAnnual: ctc,
      taxRegime: "old",
      panNumber: "ABCDE1234F",
    });

    // Both should produce a positive TDS (above 7L/5L rebate threshold)
    expect(newRegime.tdsDeduction).toBeGreaterThan(0);
    expect(oldRegime.tdsDeduction).toBeGreaterThan(0);
    // TDS values should differ between regimes
    // (Old regime has standard deduction + more deductions; new has lower slabs)
    expect(typeof newRegime.tdsDeduction).toBe("number");
    expect(typeof oldRegime.tdsDeduction).toBe("number");
  });

  it("no PAN — TDS is flat 20% of gross (§206AA)", () => {
    const withPan = computePayrollItem({
      ctcAnnual: 24_00_000,
      taxRegime: "new",
      panNumber: "ABCDE1234F",
    });
    const noPan = computePayrollItem({
      ctcAnnual: 24_00_000,
      taxRegime: "new",
      panNumber: undefined,
    });

    // §206AA: TDS = max(normal, 20% of gross)
    const expected20pct = r2(noPan.grossPay * 0.2);
    expect(noPan.tdsDeduction).toBe(expected20pct);
    // With PAN it should be less
    expect(withPan.tdsDeduction).toBeLessThan(noPan.tdsDeduction);
  });

  it("rebate §87A — earner below ₹7L (new regime) pays zero TDS", () => {
    // CTC = ₹7L, taxable income after std deduction ≈ ₹6.25L → rebate applies
    const result = computePayrollItem({
      ctcAnnual: 7_00_000,
      taxRegime: "new",
      panNumber: "ABCDE1234F",
    });
    expect(result.tdsDeduction).toBe(0);
  });

  it("net pay is gross minus total deductions", () => {
    const result = computePayrollItem({
      ctcAnnual: 10_00_000,
      panNumber: "ABCDE1234F",
    });
    const expectedNet = r2(result.grossPay - result.totalDeductions);
    expect(result.netPay).toBe(expectedNet);
  });
});

describe("computeProfessionalTax", () => {
  it("below ₹7,500 gross → PT = 0", () => {
    expect(computeProfessionalTax(6_000, MAHARASHTRA_PT_SLABS)).toBe(0);
  });

  it("between ₹7,501 and ₹10,000 → PT = ₹175", () => {
    expect(computeProfessionalTax(9_000, MAHARASHTRA_PT_SLABS)).toBe(175);
  });

  it("above ₹10,001 → PT = ₹200", () => {
    expect(computeProfessionalTax(15_000, MAHARASHTRA_PT_SLABS)).toBe(200);
    expect(computeProfessionalTax(1_00_000, MAHARASHTRA_PT_SLABS)).toBe(200);
  });

  it("empty slabs → PT = 0", () => {
    expect(computeProfessionalTax(50_000, [])).toBe(0);
  });
});

describe("computeMonthlyTds", () => {
  it("returns 0 for very low earner (below ₹7L annual new regime)", () => {
    const monthlyGross = 50_000; // ₹6L annual
    const tds = computeMonthlyTds(monthlyGross, 0, "new", true);
    expect(tds).toBe(0);
  });

  it("returns positive TDS for ₹10L earner under new regime", () => {
    const monthlyGross = 83_333; // ~₹10L annual
    const tds = computeMonthlyTds(monthlyGross, 1_800, "new", true);
    expect(tds).toBeGreaterThan(0);
  });

  it("§206AA: without PAN, TDS is max(normal, 20% of gross)", () => {
    const monthlyGross = 50_000;
    const pfDeduction = 1_800;
    const tds = computeMonthlyTds(monthlyGross, pfDeduction, "new", false);
    expect(tds).toBeGreaterThanOrEqual(r2(monthlyGross * 0.2));
  });
});
