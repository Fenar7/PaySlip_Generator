import { describe, expect, it } from "vitest";
import { parseContinuitySeed, getDefaultPrefix, getDefaultFormatString } from "../continuity";

describe("parseContinuitySeed", () => {
  it("derives format from legacy invoice prefix and counter", () => {
    const result = parseContinuitySeed("INV", 42, "INVOICE");
    expect(result.formatString).toBe("INV/{YYYY}/{NNNNN}");
    expect(result.startCounter).toBe(43);
    expect(result.periodicity).toBe("YEARLY");
    expect(result.inferred).toBe(true);
  });

  it("derives format from legacy voucher prefix and counter", () => {
    const result = parseContinuitySeed("VCH", 100, "VOUCHER");
    expect(result.formatString).toBe("VCH/{YYYY}/{NNNNN}");
    expect(result.startCounter).toBe(101);
  });

  it("sanitizes prefix to uppercase alphanumeric", () => {
    const result = parseContinuitySeed("inv-2025", 5, "INVOICE");
    expect(result.formatString).toBe("INV2025/{YYYY}/{NNNNN}");
  });

  it("throws on empty prefix", () => {
    expect(() => parseContinuitySeed("", 1, "INVOICE")).toThrow(
      "alphanumeric"
    );
  });
});

describe("getDefaultPrefix", () => {
  it("returns INV for invoices", () => {
    expect(getDefaultPrefix("INVOICE")).toBe("INV");
  });

  it("returns VCH for vouchers", () => {
    expect(getDefaultPrefix("VOUCHER")).toBe("VCH");
  });
});

describe("getDefaultFormatString", () => {
  it("returns default invoice format", () => {
    expect(getDefaultFormatString("INVOICE")).toBe("INV/{YYYY}/{NNNNN}");
  });

  it("returns default voucher format", () => {
    expect(getDefaultFormatString("VOUCHER")).toBe("VCH/{YYYY}/{NNNNN}");
  });
});
