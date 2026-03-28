import { invoiceDefaultValues } from "@/features/invoice/constants";
import {
  invoiceExportRequestSchema,
  validateInvoiceForm,
} from "@/features/invoice/schema";
import { normalizeInvoice } from "@/features/invoice/utils/normalize-invoice";

describe("validateInvoiceForm", () => {
  it("rejects line discounts above the base amount", () => {
    const result = validateInvoiceForm({
      ...invoiceDefaultValues,
      lineItems: [
        {
          description: "Monthly retainer",
          quantity: "1",
          unitPrice: "1000",
          taxRate: "18",
          discountAmount: "1200",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.lineItems?.[0]).toContain(
      "Discount cannot exceed the line base amount.",
    );
  });

  it("rejects overpayment beyond the computed grand total", () => {
    const result = validateInvoiceForm({
      ...invoiceDefaultValues,
      amountPaid: "999999",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.amountPaid).toContain(
      "Amount paid cannot exceed the grand total.",
    );
  });

  it("rejects due dates earlier than the invoice date", () => {
    const result = validateInvoiceForm({
      ...invoiceDefaultValues,
      invoiceDate: "2026-03-26",
      dueDate: "2026-03-20",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.dueDate).toContain(
      "Due date cannot be earlier than the invoice date.",
    );
  });

  it("accepts normalized invoice export payloads", () => {
    const document = normalizeInvoice(invoiceDefaultValues);
    const result = invoiceExportRequestSchema.safeParse({ document });

    expect(result.success).toBe(true);
  });
});
