import { describe, expect, it } from "vitest";
import { buildBillingInvoicePdfUrl, formatBillingInvoiceNumber, getBillingTaxBreakdown } from "../invoicing";

describe("billing invoicing helpers", () => {
  it("uses integer-only tax breakdowns", () => {
    const breakdown = getBillingTaxBreakdown(BigInt(11800), "IN");

    expect(breakdown.baseAmountPaise).toBe(BigInt(10000));
    expect(breakdown.taxAmountPaise).toBe(BigInt(1800));
    expect(breakdown.taxRateBasisPoints).toBe(1800);
  });

  it("builds stable PDF download URLs", () => {
    expect(buildBillingInvoicePdfUrl("inv_123")).toBe(
      "/api/billing/invoices/inv_123/pdf",
    );
  });

  it("formats billing invoice numbers from persistent identifiers", () => {
    expect(
      formatBillingInvoiceNumber({
        id: "clx123abc456",
        orgId: "org_abcdef123",
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      }),
    ).toBe("SLW-2026-ORG_AB-ABC456");
  });
});
