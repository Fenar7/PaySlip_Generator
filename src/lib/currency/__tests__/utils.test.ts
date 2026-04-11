import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatCurrency,
  formatExchangeRateNote,
  isExchangeRateStale,
  convertAmount,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "../utils";

describe("formatCurrency", () => {
  it.each([
    ["INR", 1234.5, "₹"],
    ["USD", 1234.5, "$"],
    ["EUR", 1234.5, "€"],
    ["GBP", 1234.5, "£"],
    ["SGD", 1234.5, "$"],
    ["AUD", 1234.5, "$"],
  ] as [SupportedCurrency, number, string][])(
    "formats %s with correct symbol",
    (currency, amount, symbol) => {
      const result = formatCurrency(amount, currency);
      // The formatted string should include the currency symbol
      expect(result).toContain(symbol);
    },
  );

  it("formats INR 1000 with Indian locale (comma grouping)", () => {
    const result = formatCurrency(100000, "INR");
    // en-IN uses lakh grouping: 1,00,000
    expect(result).toContain("1,00,000");
  });

  it("formats USD with US locale", () => {
    const result = formatCurrency(1234.56, "USD");
    expect(result).toContain("1,234.56");
  });

  it("rounds to 2 decimal places", () => {
    const result = formatCurrency(10.999, "INR");
    expect(result).toContain("11.00");
  });

  it("handles zero amount", () => {
    const result = formatCurrency(0, "USD");
    expect(result).toContain("0.00");
  });

  it("formats AED", () => {
    const result = formatCurrency(500, "AED");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("formats SAR", () => {
    const result = formatCurrency(500, "SAR");
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });
});

describe("formatExchangeRateNote", () => {
  it("returns properly formatted note string", () => {
    const note = formatExchangeRateNote("USD", 83.3, new Date("2026-04-08"));
    expect(note).toContain("Exchange rate:");
    expect(note).toContain("USD");
    expect(note).toContain("83.30");
    expect(note).toContain("08");
    expect(note).toContain("Apr");
    expect(note).toContain("2026");
  });

  it("accepts string dates", () => {
    const note = formatExchangeRateNote("EUR", 90.5, "2026-01-15");
    expect(note).toContain("Exchange rate:");
    expect(note).toContain("EUR");
    expect(note).toContain("90.50");
  });

  it("formats the rate to 2 decimal places", () => {
    const note = formatExchangeRateNote("GBP", 105.123, new Date("2026-06-01"));
    expect(note).toContain("105.12");
  });
});

describe("isExchangeRateStale", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("returns false for a rate fetched just now", () => {
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));
    expect(isExchangeRateStale(new Date("2026-04-10T12:00:00Z"))).toBe(false);
  });

  it("returns false for a rate fetched 6 days ago", () => {
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));
    expect(isExchangeRateStale(new Date("2026-04-04T13:00:00Z"))).toBe(false);
  });

  it("returns true for a rate fetched 8 days ago", () => {
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));
    expect(isExchangeRateStale(new Date("2026-04-02T12:00:00Z"))).toBe(true);
  });

  it("returns true for a rate fetched exactly 7 days + 1 ms ago", () => {
    vi.setSystemTime(new Date("2026-04-10T00:00:00.001Z"));
    expect(isExchangeRateStale(new Date("2026-04-03T00:00:00Z"))).toBe(true);
  });

  it("accepts string date input", () => {
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));
    expect(isExchangeRateStale("2026-04-01T12:00:00Z")).toBe(true);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe("convertAmount", () => {
  it("converts base to foreign currency", () => {
    // 10000 INR / 83.3 (USD rate) ≈ 120.05
    expect(convertAmount(10000, 83.3)).toBeCloseTo(120.05, 1);
  });

  it("rounds to 2 decimal places", () => {
    const result = convertAmount(1000, 3);
    // 1000/3 = 333.3333... → 333.33
    expect(result).toBe(333.33);
  });

  it("handles exact division", () => {
    expect(convertAmount(100, 50)).toBe(2);
  });

  it("handles small amounts", () => {
    expect(convertAmount(1, 83.3)).toBeCloseTo(0.01, 2);
  });
});

describe("SUPPORTED_CURRENCIES", () => {
  it("has 8 currencies", () => {
    expect(Object.keys(SUPPORTED_CURRENCIES)).toHaveLength(8);
  });

  it("every entry has symbol, name, and locale", () => {
    for (const [, info] of Object.entries(SUPPORTED_CURRENCIES)) {
      expect(info.symbol).toBeTruthy();
      expect(info.name).toBeTruthy();
      expect(info.locale).toBeTruthy();
    }
  });
});
