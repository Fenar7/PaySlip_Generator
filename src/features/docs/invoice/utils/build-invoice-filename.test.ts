import { invoiceDefaultValues } from "@/features/docs/invoice/constants";
import { buildInvoiceFilename } from "@/features/docs/invoice/utils/build-invoice-filename";
import { normalizeInvoice } from "@/features/docs/invoice/utils/normalize-invoice";

describe("buildInvoiceFilename", () => {
  it("builds stable pdf and png filenames from the invoice number", () => {
    const document = normalizeInvoice(invoiceDefaultValues);

    expect(buildInvoiceFilename(document, "pdf")).toBe(
      "invoice-inv-2026-031.pdf",
    );
    expect(buildInvoiceFilename(document, "png")).toBe(
      "invoice-inv-2026-031.png",
    );
  });
});
