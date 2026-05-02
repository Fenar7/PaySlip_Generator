import { invoiceDefaultValues } from "@/features/docs/invoice/constants";
import { buildInvoiceFilename } from "@/features/docs/invoice/utils/build-invoice-filename";
import { normalizeInvoice } from "@/features/docs/invoice/utils/normalize-invoice";

describe("buildInvoiceFilename", () => {
  it("builds a draft placeholder filename when invoiceNumber is empty", () => {
    const document = normalizeInvoice(invoiceDefaultValues);

    // After Sprint 4.1, draft defaults have empty invoiceNumber.
    // normalizeInvoice produces "Draft" as placeholder, which
    // sanitizes to "draft".
    expect(buildInvoiceFilename(document, "pdf")).toBe(
      "invoice-draft.pdf",
    );
    expect(buildInvoiceFilename(document, "png")).toBe(
      "invoice-draft.png",
    );
  });

  it("builds a filename from a real invoice number", () => {
    const document = normalizeInvoice({
      ...invoiceDefaultValues,
      invoiceNumber: "INV-2026-031",
    });

    expect(buildInvoiceFilename(document, "pdf")).toBe(
      "invoice-inv-2026-031.pdf",
    );
  });
});
