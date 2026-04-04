import { invoiceDefaultValues } from "@/features/docs/invoice/constants";
import { normalizeInvoice } from "@/features/docs/invoice/utils/normalize-invoice";

describe("normalizeInvoice", () => {
  it("computes invoice totals, payment, and balance due", () => {
    const document = normalizeInvoice(invoiceDefaultValues);

    expect(document.subtotal).toBe(45000);
    expect(document.totalDiscount).toBe(2000);
    expect(document.totalTax).toBe(8100);
    expect(document.extraCharges).toBe(1500);
    expect(document.invoiceLevelDiscount).toBe(500);
    expect(document.grandTotal).toBe(54100);
    expect(document.amountPaid).toBe(15000);
    expect(document.balanceDue).toBe(39100);
    expect(document.amountInWords).toBe("Fifty-four thousand one hundred only");
  });

  it("hides optional footer and client blocks through visibility pruning", () => {
    const document = normalizeInvoice({
      ...invoiceDefaultValues,
      visibility: {
        ...invoiceDefaultValues.visibility,
        showClientEmail: false,
        showClientPhone: false,
        showPaymentSummary: false,
        showNotes: false,
        showTerms: false,
      },
    });

    expect(document.clientEmail).toBeUndefined();
    expect(document.clientPhone).toBeUndefined();
    expect(document.notes).toBeUndefined();
    expect(document.terms).toBeUndefined();
    expect(document.visibility.showPaymentSummary).toBe(false);
  });
});
