import { describe, it, expect } from "vitest";
import { getCountryInvoiceFormat } from "../country-format";

describe("getCountryInvoiceFormat", () => {
  // TC-15-022: UAE format
  it("TC-15-022: AE format shows TRN, no GSTIN", () => {
    const format = getCountryInvoiceFormat("AE");
    expect(format.showTrn).toBe(true);
    expect(format.showGstin).toBe(false);
    expect(format.showVatNumber).toBe(false);
    expect(format.invoiceTitle).toBe("Tax Invoice");
    expect(format.taxLabel).toBe("VAT");
    expect(format.vatIdLabel).toBe("TRN");
  });

  // TC-15-023: India format
  it("TC-15-023: IN format shows GSTIN and HSN/SAC", () => {
    const format = getCountryInvoiceFormat("IN");
    expect(format.showGstin).toBe(true);
    expect(format.showHsnSac).toBe(true);
    expect(format.showGstColumns).toBe(true);
    expect(format.showVatNumber).toBe(false);
    expect(format.showTrn).toBe(false);
    expect(format.invoiceTitle).toBe("Tax Invoice");
    expect(format.taxLabel).toBe("GST");
  });

  it("US format: plain Invoice, no GST/VAT, state tax", () => {
    const format = getCountryInvoiceFormat("US");
    expect(format.showGstin).toBe(false);
    expect(format.showVatNumber).toBe(false);
    expect(format.showTrn).toBe(false);
    expect(format.showStateTax).toBe(true);
    expect(format.invoiceTitle).toBe("Invoice");
    expect(format.taxLabel).toBe("Tax");
  });

  it("UK format: VAT Invoice, VAT number shown", () => {
    const format = getCountryInvoiceFormat("GB");
    expect(format.showVatNumber).toBe(true);
    expect(format.showGstin).toBe(false);
    expect(format.invoiceTitle).toBe("VAT Invoice");
    expect(format.taxLabel).toBe("VAT");
    expect(format.vatIdLabel).toBe("VAT Number");
  });

  it("DE format: Rechnung, MwSt. tax label", () => {
    const format = getCountryInvoiceFormat("DE");
    expect(format.invoiceTitle).toBe("Rechnung");
    expect(format.taxLabel).toBe("MwSt.");
    expect(format.showVatNumber).toBe(true);
    expect(format.showGstin).toBe(false);
    expect(format.vatIdLabel).toBe("USt-IdNr.");
  });

  it("unknown country falls back to plain Invoice defaults", () => {
    const format = getCountryInvoiceFormat("ZZ");
    expect(format.showGstin).toBe(false);
    expect(format.showHsnSac).toBe(false);
    expect(format.showGstColumns).toBe(false);
    expect(format.showVatNumber).toBe(false);
    expect(format.showTrn).toBe(false);
    expect(format.showStateTax).toBe(false);
    expect(format.invoiceTitle).toBe("Invoice");
    expect(format.taxLabel).toBe("Tax");
    expect(format.vatIdLabel).toBe("");
  });
});
