import { describe, it, expect } from "vitest";
import { computeTax, listSupportedRegions, getStrategy } from "../index";
import { halfDown, taxRound2 } from "../engine";
import type { TaxComputeInput } from "../engine";

// ─── Strategy Dispatch ────────────────────────────────────────────────────────

describe("Tax Engine dispatch", () => {
  it("lists all 8 supported regions", () => {
    const regions = listSupportedRegions();
    expect(regions).toHaveLength(8);
    const codes = regions.map((r) => r.region);
    expect(codes).toContain("IN_GST");
    expect(codes).toContain("UK_VAT");
    expect(codes).toContain("EU_VAT");
    expect(codes).toContain("US_SALES");
    expect(codes).toContain("AU_GST");
    expect(codes).toContain("NZ_GST");
    expect(codes).toContain("SG_GST");
    expect(codes).toContain("EXEMPT");
  });

  it("throws for unsupported region", () => {
    expect(() => getStrategy("MARS_TAX")).toThrow("Unsupported tax region: MARS_TAX");
  });
});

// ─── UK VAT ───────────────────────────────────────────────────────────────────

describe("UK VAT", () => {
  it("computes 20% standard VAT", () => {
    const result = computeTax("UK_VAT", {
      lines: [{ amount: 100 }],
      config: {},
    });
    expect(result.totalTaxable).toBe(100);
    expect(result.totalTax).toBe(20);
    expect(result.currency).toBe("GBP");
  });

  it("applies reduced rate 5%", () => {
    const result = computeTax("UK_VAT", {
      lines: [{ amount: 200, taxRate: 5 }],
      config: {},
    });
    expect(result.totalTax).toBe(10);
  });

  it("handles exempt lines", () => {
    const result = computeTax("UK_VAT", {
      lines: [
        { amount: 100 },
        { amount: 50, isExempt: true },
      ],
      config: {},
    });
    expect(result.totalTax).toBe(20); // Only on the £100 line
    expect(result.totalTaxable).toBe(150);
  });

  it("uses half-down rounding", () => {
    // 10.005 * 100 = 1000.5 → half-down → 1000 → 10.00
    expect(halfDown(10.005)).toBe(10);
    // 10.006 * 100 = 1000.6 → round → 1001 → 10.01
    expect(halfDown(10.006)).toBe(10.01);
  });
});

// ─── EU VAT ───────────────────────────────────────────────────────────────────

describe("EU VAT", () => {
  it("uses default 21% rate", () => {
    const result = computeTax("EU_VAT", {
      lines: [{ amount: 100 }],
      config: {},
    });
    expect(result.totalTax).toBe(21);
    expect(result.currency).toBe("EUR");
  });

  it("uses configurable country rate", () => {
    const result = computeTax("EU_VAT", {
      lines: [{ amount: 100 }],
      config: { vatRate: 25 }, // Denmark
    });
    expect(result.totalTax).toBe(25);
  });
});

// ─── US Sales Tax ─────────────────────────────────────────────────────────────

describe("US Sales Tax", () => {
  it("computes combined state+county+city tax", () => {
    const result = computeTax("US_SALES", {
      lines: [{ amount: 100 }],
      config: { stateRate: 6.25, countyRate: 1.5, cityRate: 0.75 },
    });
    expect(result.totalTax).toBe(taxRound2(100 * 8.5 / 100));
    expect(result.currency).toBe("USD");
  });

  it("returns zero for no rates configured", () => {
    const result = computeTax("US_SALES", {
      lines: [{ amount: 100 }],
      config: {},
    });
    expect(result.totalTax).toBe(0);
  });
});

// ─── AU/NZ/SG GST ────────────────────────────────────────────────────────────

describe("Flat GST regions", () => {
  it("AU GST at 10%", () => {
    const result = computeTax("AU_GST", {
      lines: [{ amount: 100 }],
      config: {},
    });
    expect(result.totalTax).toBe(10);
    expect(result.currency).toBe("AUD");
  });

  it("NZ GST at 15%", () => {
    const result = computeTax("NZ_GST", {
      lines: [{ amount: 200 }],
      config: {},
    });
    expect(result.totalTax).toBe(30);
    expect(result.currency).toBe("NZD");
  });

  it("SG GST at 9%", () => {
    const result = computeTax("SG_GST", {
      lines: [{ amount: 100 }],
      config: {},
    });
    expect(result.totalTax).toBe(9);
    expect(result.currency).toBe("SGD");
  });
});

// ─── Exempt ───────────────────────────────────────────────────────────────────

describe("Exempt", () => {
  it("returns zero tax", () => {
    const result = computeTax("EXEMPT", {
      lines: [{ amount: 500 }, { amount: 300 }],
      config: {},
    });
    expect(result.totalTax).toBe(0);
    expect(result.totalTaxable).toBe(800);
  });
});

// ─── Multi-line scenarios ─────────────────────────────────────────────────────

describe("Multi-line computation", () => {
  it("aggregates multiple lines correctly for UK VAT", () => {
    const result = computeTax("UK_VAT", {
      lines: [
        { amount: 100, taxRate: 20 },
        { amount: 200, taxRate: 5 },
        { amount: 50, isExempt: true },
      ],
      config: {},
    });
    expect(result.totalTaxable).toBe(350);
    expect(result.totalTax).toBe(30); // 20 + 10 + 0
    expect(result.lineResults).toHaveLength(3);
    expect(result.lineResults[0].taxAmount).toBe(20);
    expect(result.lineResults[1].taxAmount).toBe(10);
    expect(result.lineResults[2].taxAmount).toBe(0);
  });

  it("handles empty lines", () => {
    const result = computeTax("AU_GST", {
      lines: [],
      config: {},
    });
    expect(result.totalTax).toBe(0);
    expect(result.totalTaxable).toBe(0);
    expect(result.lineResults).toHaveLength(0);
  });
});
