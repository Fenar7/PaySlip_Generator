import { describe, it, expect } from "vitest";
import {
  getInvoicePdfLabels,
  getVoucherPdfLabels,
  getSalarySlipPdfLabels,
  getQuotePdfLabels,
} from "../pdf-labels";
import { isRtlLocale, resolveDocumentLanguage } from "../index";

describe("getInvoicePdfLabels", () => {
  // TC-15-016: Hindi invoice PDF labels
  it("TC-15-016: returns Hindi title 'चालान' for locale 'hi'", () => {
    const labels = getInvoicePdfLabels("hi");
    expect(labels.title).toBe("चालान");
    expect(labels.taxInvoice).toBe("कर चालान");
    expect(labels.invoiceNumber).toBe("चालान संख्या");
    expect(labels.billTo).toBe("बिल प्राप्तकर्ता");
  });

  // TC-15-017: Arabic invoice PDF labels + RTL
  it("TC-15-017: returns Arabic labels and isRtlLocale('ar') is true", () => {
    const labels = getInvoicePdfLabels("ar");
    expect(labels.title).toBe("فاتورة");
    expect(labels.taxInvoice).toBe("فاتورة ضريبية");
    expect(labels.invoiceNumber).toBe("رقم الفاتورة");
    expect(labels.billTo).toBe("فاتورة إلى");
    expect(isRtlLocale("ar")).toBe(true);
  });

  it("returns English labels as default", () => {
    const labels = getInvoicePdfLabels("en");
    expect(labels.title).toBe("Invoice");
    expect(labels.invoiceNumber).toBe("Invoice Number");
    expect(labels.dueDate).toBe("Due Date");
    expect(labels.total).toBe("Total");
    expect(labels.terms).toBe("Terms & Conditions");
  });

  it("falls back to English for unknown locale", () => {
    const labels = getInvoicePdfLabels("xx");
    expect(labels.title).toBe("Invoice");
    expect(labels.invoiceNumber).toBe("Invoice Number");
  });
});

describe("getVoucherPdfLabels", () => {
  it("returns English voucher labels", () => {
    const labels = getVoucherPdfLabels("en");
    expect(labels.title).toBe("Payment Voucher");
    expect(labels.voucherNumber).toBe("Voucher Number");
    expect(labels.paidTo).toBe("Paid To");
    expect(labels.approvedBy).toBe("Approved By");
  });
});

describe("getSalarySlipPdfLabels", () => {
  it("returns Spanish salary slip labels", () => {
    const labels = getSalarySlipPdfLabels("es");
    expect(labels.title).toBe("Recibo de Nómina");
    expect(labels.employeeName).toBe("Nombre del Empleado");
    expect(labels.employeeId).toBe("ID del Empleado");
    expect(labels.designation).toBe("Cargo");
    expect(labels.department).toBe("Departamento");
  });

  it("returns English salary slip labels", () => {
    const labels = getSalarySlipPdfLabels("en");
    expect(labels.title).toBe("Salary Slip");
    expect(labels.employeeName).toBe("Employee Name");
  });
});

describe("getQuotePdfLabels", () => {
  it("returns French quote labels", () => {
    const labels = getQuotePdfLabels("fr");
    expect(labels.title).toBe("Devis");
    expect(labels.quoteNumber).toBe("Numéro de Devis");
    expect(labels.validUntil).toBe("Valide Jusqu'au");
    expect(labels.quantity).toBe("Quantité");
    expect(labels.total).toBe("Total");
    expect(labels.terms).toBe("Conditions Générales");
  });

  it("returns English quote labels", () => {
    const labels = getQuotePdfLabels("en");
    expect(labels.title).toBe("Quote");
    expect(labels.quoteNumber).toBe("Quote Number");
  });
});

describe("resolveDocumentLanguage — TC-15-018", () => {
  // TC-15-018: Customer preferredLanguage overrides org default
  it("TC-15-018: customer preferred language overrides org default", () => {
    expect(resolveDocumentLanguage("ar", "en")).toBe("ar");
    expect(resolveDocumentLanguage("hi", "en")).toBe("hi");
    expect(resolveDocumentLanguage("es", "de")).toBe("es");
  });

  it("falls back to org default when no customer preference", () => {
    expect(resolveDocumentLanguage(null, "fr")).toBe("fr");
    expect(resolveDocumentLanguage(undefined, "de")).toBe("de");
  });
});
