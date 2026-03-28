import { invoiceDefaultValues } from "@/features/invoice/constants";
import {
  createInvoiceExportSession,
  getInvoiceExportSession,
} from "@/features/invoice/server/export-session-store";
import { normalizeInvoice } from "@/features/invoice/utils/normalize-invoice";

describe("invoice export session store", () => {
  it("stores and returns invoice documents by token", () => {
    const document = normalizeInvoice(invoiceDefaultValues);
    const token = createInvoiceExportSession(document);

    expect(getInvoiceExportSession(token)).toEqual(document);
  });
});
