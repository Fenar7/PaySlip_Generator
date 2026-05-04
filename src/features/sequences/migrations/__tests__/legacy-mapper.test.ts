import { describe, expect, it } from "vitest";
import {
  mapOrgDefaultsToSequences,
  parseHistoricalSequenceNumber,
} from "../legacy-mapper";

describe("mapOrgDefaultsToSequences", () => {
  it("returns both invoice and voucher seeds with defaults when fields are missing", () => {
    const result = mapOrgDefaultsToSequences({
      organizationId: "org-1",
    });

    expect(result).toHaveLength(2);

    const invoice = result.find((s) => s.documentType === "INVOICE");
    const voucher = result.find((s) => s.documentType === "VOUCHER");

    expect(invoice).toMatchObject({
      organizationId: "org-1",
      name: "Invoice Sequence",
      documentType: "INVOICE",
      periodicity: "YEARLY",
      isActive: true,
      format: {
        formatString: "INV/{YYYY}/{NNNNN}",
        startCounter: 1,
        counterPadding: 5,
        isDefault: true,
      },
      legacyNextCounter: 1,
      inferred: true,
    });

    expect(voucher).toMatchObject({
      organizationId: "org-1",
      name: "Voucher Sequence",
      documentType: "VOUCHER",
      format: {
        formatString: "VCH/{YYYY}/{NNNNN}",
        startCounter: 1,
      },
      legacyNextCounter: 1,
    });
  });

  it("uses legacy prefix and counter when present", () => {
    const result = mapOrgDefaultsToSequences({
      organizationId: "org-2",
      invoicePrefix: "REC",
      invoiceCounter: 99,
      voucherPrefix: "PYM",
      voucherCounter: 42,
    });

    const invoice = result.find((s) => s.documentType === "INVOICE");
    expect(invoice?.format.formatString).toBe("REC/{YYYY}/{NNNNN}");
    expect(invoice?.format.startCounter).toBe(99);
    expect(invoice?.legacyNextCounter).toBe(99);

    const voucher = result.find((s) => s.documentType === "VOUCHER");
    expect(voucher?.format.formatString).toBe("PYM/{YYYY}/{NNNNN}");
    expect(voucher?.format.startCounter).toBe(42);
    expect(voucher?.legacyNextCounter).toBe(42);
  });

  it("sanitizes prefixes to uppercase alphanumeric", () => {
    const result = mapOrgDefaultsToSequences({
      organizationId: "org-3",
      invoicePrefix: "inv-pro/2024",
      invoiceCounter: 5,
    });

    const invoice = result.find((s) => s.documentType === "INVOICE");
    expect(invoice?.format.formatString).toBe("INVPRO2024/{YYYY}/{NNNNN}");
  });

  it("marks all seeds as inferred", () => {
    const result = mapOrgDefaultsToSequences({
      organizationId: "org-4",
      invoicePrefix: "CUSTOM",
      invoiceCounter: 10,
    });

    expect(result.every((s) => s.inferred)).toBe(true);
  });

  it("parses legacy historical numbers without consuming sequence state", () => {
    expect(parseHistoricalSequenceNumber("INV-001", "INV")).toEqual({
      sequenceNumber: 1,
    });
    expect(parseHistoricalSequenceNumber("INV/2026/00042", "INV")).toEqual({
      sequenceNumber: 42,
    });
  });

  it("rejects numbers that do not match the expected prefix", () => {
    expect(parseHistoricalSequenceNumber("ABC-001", "INV")).toBeNull();
    expect(parseHistoricalSequenceNumber("INV-XYZ", "INV")).toBeNull();
  });
});
