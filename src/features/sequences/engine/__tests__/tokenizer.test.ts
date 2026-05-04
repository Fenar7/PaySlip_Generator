import { describe, expect, it } from "vitest";
import { tokenize, validateFormat, getRunningNumberPadding, extractCounterFromFormat } from "../tokenizer";

describe("tokenize", () => {
  it("parses literal text only", () => {
    const tokens = tokenize("INVOICE");
    expect(tokens).toEqual([{ type: "literal", value: "INVOICE" }]);
  });

  it("parses a single token", () => {
    const tokens = tokenize("{YYYY}");
    expect(tokens).toEqual([{ type: "token", value: "YYYY" }]);
  });

  it("parses mixed literal and tokens", () => {
    const tokens = tokenize("INV/{YYYY}/{NNNNN}");
    expect(tokens).toEqual([
      { type: "literal", value: "INV/" },
      { type: "token", value: "YYYY" },
      { type: "literal", value: "/" },
      { type: "token", value: "NNNNN" },
    ]);
  });

  it("handles unclosed brace as literal", () => {
    const tokens = tokenize("INV/{YYYY");
    expect(tokens).toEqual([
      { type: "literal", value: "INV/" },
      { type: "literal", value: "{YYYY" },
    ]);
  });
});

describe("validateFormat", () => {
  it("accepts valid format with single running number", () => {
    const result = validateFormat("INV/{YYYY}/{NNNNN}");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts valid format with different padding", () => {
    const result = validateFormat("VCH/{YYYY}/{NN}");
    expect(result.valid).toBe(true);
  });

  it("rejects format without running number", () => {
    const result = validateFormat("INV/{YYYY}");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("running number"))).toBe(true);
  });

  it("rejects format with multiple running numbers", () => {
    const result = validateFormat("{NNNNN}/{YYYY}/{NNNNN}");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("only one"))).toBe(true);
  });

  it("rejects unknown token", () => {
    const result = validateFormat("INV/{UNKNOWN}/{NNNNN}");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unknown token"))).toBe(true);
  });

  it("rejects empty format", () => {
    const result = validateFormat("");
    expect(result.valid).toBe(false);
  });

  it("rejects format exceeding 128 chars", () => {
    const result = validateFormat("A".repeat(129) + "/{NNNNN}");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("128"))).toBe(true);
  });
});

describe("getRunningNumberPadding", () => {
  it("returns 5 for {NNNNN}", () => {
    const tokens = tokenize("{NNNNN}");
    expect(getRunningNumberPadding(tokens)).toBe(5);
  });

  it("returns 3 for {NNN}", () => {
    const tokens = tokenize("{NNN}");
    expect(getRunningNumberPadding(tokens)).toBe(3);
  });

  it("returns default 5 when no running number", () => {
    const tokens = tokenize("{YYYY}");
    expect(getRunningNumberPadding(tokens)).toBe(5);
  });
});

describe("extractCounterFromFormat", () => {
  it("extracts counter from standard format", () => {
    expect(extractCounterFromFormat("INV/2026/00042", "INV/{YYYY}/{NNNNN}")).toBe(42);
  });

  it("extracts counter with short padding", () => {
    expect(extractCounterFromFormat("PYMT/FY25-26/099", "PYMT/{FY}/{NNN}")).toBe(99);
  });

  it("returns null when number does not match format", () => {
    expect(extractCounterFromFormat("VCH/2026/00042", "INV/{YYYY}/{NNNNN}")).toBeNull();
  });

  it("returns null for format without running number", () => {
    expect(extractCounterFromFormat("INV/2026", "INV/{YYYY}")).toBeNull();
  });

  it("extracts counter from format with multiple digit tokens before counter", () => {
    expect(extractCounterFromFormat("INV/2026/04/00010", "INV/{YYYY}/{MM}/{NNNNN}")).toBe(10);
  });
});
