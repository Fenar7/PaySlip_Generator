import { describe, expect, it } from "vitest";
import { mapOrgDefaultsToSequences } from "../legacy-mapper";

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
        startCounter: 2,
        counterPadding: 5,
        isDefault: true,
      },
      inferred: true,
    });

    expect(voucher).toMatchObject({
      organizationId: "org-1",
      name: "Voucher Sequence",
      documentType: "VOUCHER",
      format: {
        formatString: "VCH/{YYYY}/{NNNNN}",
        startCounter: 2,
      },
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
    expect(invoice?.format.startCounter).toBe(100);

    const voucher = result.find((s) => s.documentType === "VOUCHER");
    expect(voucher?.format.formatString).toBe("PYM/{YYYY}/{NNNNN}");
    expect(voucher?.format.startCounter).toBe(43);
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
});
