import { describe, expect, it } from "vitest";
import {
  buildFormatString,
  parseFormatString,
  buildSummarySentence,
  renderPreview,
  buildNextPreview,
  validateBuilderConfig,
  getDefaultBuilderConfig,
  derivePeriodicityFromFormat,
  RESET_CYCLE_LABELS,
} from "../builder";
import type { SequenceBuilderConfig } from "../builder";

describe("sequence builder", () => {
  describe("buildFormatString", () => {
    it("builds default invoice format", () => {
      const config: SequenceBuilderConfig = {
        prefix: "INV",
        resetCycle: "YEARLY",
        numberLength: 5,
        includeYear: true,
        includeMonth: false,
        useFinancialYear: false,
      };
      expect(buildFormatString(config)).toBe("INV/{YYYY}/{NNNNN}");
    });

    it("builds monthly format with month", () => {
      const config: SequenceBuilderConfig = {
        prefix: "REC",
        resetCycle: "MONTHLY",
        numberLength: 4,
        includeYear: true,
        includeMonth: true,
        useFinancialYear: false,
      };
      expect(buildFormatString(config)).toBe("REC/{YYYY}/{MM}/{NNNN}");
    });

    it("builds financial year format", () => {
      const config: SequenceBuilderConfig = {
        prefix: "VCH",
        resetCycle: "FINANCIAL_YEAR",
        numberLength: 5,
        includeYear: false,
        includeMonth: false,
        useFinancialYear: true,
      };
      expect(buildFormatString(config)).toBe("VCH/{FY}/{NNNNN}");
    });

    it("builds continuous format without year", () => {
      const config: SequenceBuilderConfig = {
        prefix: "DOC",
        resetCycle: "NONE",
        numberLength: 6,
        includeYear: false,
        includeMonth: false,
        useFinancialYear: false,
      };
      expect(buildFormatString(config)).toBe("DOC/{NNNNNN}");
    });
  });

  describe("parseFormatString", () => {
    it("parses default invoice format", () => {
      const result = parseFormatString("INV/{YYYY}/{NNNNN}", "INV");
      expect(result).not.toBeNull();
      expect(result?.prefix).toBe("INV");
      expect(result?.resetCycle).toBe("YEARLY");
      expect(result?.numberLength).toBe(5);
      expect(result?.includeYear).toBe(true);
      expect(result?.includeMonth).toBe(false);
      expect(result?.useFinancialYear).toBe(false);
    });

    it("parses voucher format with FY", () => {
      const result = parseFormatString("VCH/{FY}/{NNNNN}", "VCH");
      expect(result?.prefix).toBe("VCH");
      expect(result?.resetCycle).toBe("FINANCIAL_YEAR");
      expect(result?.useFinancialYear).toBe(true);
    });

    it("returns null for unsupported DD token", () => {
      const result = parseFormatString("INV/{YYYY}/{MM}/{DD}/{NNNNN}", "INV");
      expect(result).toBeNull();
    });

    it("returns null for PREFIX token", () => {
      const result = parseFormatString("{PREFIX}/{YYYY}/{NNNNN}", "INV");
      expect(result).toBeNull();
    });

    it("returns null for hyphen separator format", () => {
      const result = parseFormatString("INV-{YYYY}-{NNNNN}", "INV");
      expect(result).toBeNull();
    });

    it("returns null for underscore separator format", () => {
      const result = parseFormatString("INV_{YYYY}_{NNNNN}", "INV");
      expect(result).toBeNull();
    });

    it("returns null for mixed custom literal separators", () => {
      const result = parseFormatString("INV-2026-00001", "INV");
      expect(result).toBeNull();
    });
  });

  describe("derivePeriodicityFromFormat", () => {
    it("derives YEARLY from YYYY token", () => {
      expect(derivePeriodicityFromFormat("INV/{YYYY}/{NNNNN}")).toBe("YEARLY");
    });

    it("derives MONTHLY from MM token", () => {
      expect(derivePeriodicityFromFormat("INV/{YYYY}/{MM}/{NNNNN}")).toBe("MONTHLY");
    });

    it("derives FINANCIAL_YEAR from FY token", () => {
      expect(derivePeriodicityFromFormat("VCH/{FY}/{NNNNN}")).toBe("FINANCIAL_YEAR");
    });

    it("derives NONE when no date tokens", () => {
      expect(derivePeriodicityFromFormat("DOC/{NNNNN}")).toBe("NONE");
    });
  });

  describe("buildSummarySentence", () => {
    it("describes a yearly invoice format", () => {
      const config = getDefaultBuilderConfig("INVOICE");
      const sentence = buildSummarySentence("invoice", config, "INV/2026/00010");
      expect(sentence).toContain("Invoices will look like");
      expect(sentence).toContain("resets every year");
      expect(sentence).toContain("Next number: INV/2026/00010");
    });

    it("describes a continuous voucher format", () => {
      const config: SequenceBuilderConfig = {
        ...getDefaultBuilderConfig("VOUCHER"),
        resetCycle: "NONE",
        includeYear: false,
      };
      const sentence = buildSummarySentence("voucher", config);
      expect(sentence).toContain("Vouchers will look like");
      expect(sentence).toContain("never resets");
    });
  });

  describe("renderPreview", () => {
    it("renders a preview with year and counter", () => {
      const preview = renderPreview("INV/{YYYY}/{NNNNN}", 1);
      const year = new Date().getFullYear();
      expect(preview).toBe(`INV/${year}/00001`);
    });

    it("returns null for invalid format", () => {
      expect(renderPreview("INVALID", 1)).toBeNull();
    });
  });

  describe("buildNextPreview", () => {
    it("returns counter 1 when no last used number", () => {
      const result = buildNextPreview("INV/{YYYY}/{NNNNN}");
      const year = new Date().getFullYear();
      expect(result.preview).toBe(`INV/${year}/00001`);
      expect(result.nextCounter).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it("increments from last used number", () => {
      const result = buildNextPreview("INV/{YYYY}/{NNNNN}", "INV/2026/00010");
      expect(result.preview).toBe("INV/2026/00011");
      expect(result.nextCounter).toBe(11);
    });

    it("returns error for mismatched last used number", () => {
      const result = buildNextPreview("INV/{YYYY}/{NNNNN}", "WRONG/123");
      expect(result.error).toBe("This number does not match your current numbering style.");
      expect(result.preview).toBeNull();
    });
  });

  describe("validateBuilderConfig", () => {
    it("validates a correct config", () => {
      const result = validateBuilderConfig(getDefaultBuilderConfig("INVOICE"));
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails for empty prefix", () => {
      const config: SequenceBuilderConfig = {
        ...getDefaultBuilderConfig("INVOICE"),
        prefix: "",
      };
      const result = validateBuilderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Prefix is required");
    });

    it("fails for yearly without year", () => {
      const config: SequenceBuilderConfig = {
        ...getDefaultBuilderConfig("INVOICE"),
        resetCycle: "YEARLY",
        includeYear: false,
      };
      const result = validateBuilderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("requires the number to include a year"))).toBe(true);
    });

    it("fails for monthly without month", () => {
      const config: SequenceBuilderConfig = {
        ...getDefaultBuilderConfig("INVOICE"),
        resetCycle: "MONTHLY",
        includeYear: true,
        includeMonth: false,
      };
      const result = validateBuilderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("monthly reset cycle requires"))).toBe(true);
    });

    it("fails for financial year without FY", () => {
      const config: SequenceBuilderConfig = {
        ...getDefaultBuilderConfig("INVOICE"),
        resetCycle: "FINANCIAL_YEAR",
        useFinancialYear: false,
      };
      const result = validateBuilderConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("financial year reset cycle requires"))).toBe(true);
    });
  });

  describe("RESET_CYCLE_LABELS", () => {
    it("has human-friendly labels", () => {
      expect(RESET_CYCLE_LABELS.YEARLY).toBe("Yearly");
      expect(RESET_CYCLE_LABELS.NONE).toBe("Continuous (no reset)");
    });
  });
});
