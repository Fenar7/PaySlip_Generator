import type {
  InvoiceDocument,
  InvoiceExportFormat,
} from "@/features/invoice/types";
import {
  renderExportPdfViaBrowser,
  renderExportPngViaBrowser,
} from "@/lib/export/browser";
import { serializeExportPayload } from "@/lib/server/export-payload";

type ExportInvoiceOptions = {
  invoiceDocument: InvoiceDocument;
  format: InvoiceExportFormat;
  origin: string;
};

export async function exportInvoiceDocument({
  invoiceDocument,
  format,
  origin,
}: ExportInvoiceOptions) {
  const payload = serializeExportPayload(invoiceDocument);
  const headers = {
    "x-slipwise-export-payload": payload,
  };
  const renderUrl = `${origin}/invoice/print?mode=${format}`;

  if (format === "pdf") {
    return renderExportPdfViaBrowser(
      renderUrl,
      '[data-testid="invoice-render-ready"]',
      headers,
    );
  }

  return renderExportPngViaBrowser(
    renderUrl,
    '[data-testid="invoice-render-ready"]',
    headers,
  );
}
