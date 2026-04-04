import type {
  InvoiceDocument,
  InvoiceExportFormat,
} from "@/features/docs/invoice/types";

function sanitizeSegment(value: string | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildInvoiceFilename(
  document: InvoiceDocument,
  format: InvoiceExportFormat,
) {
  const invoiceSegment = sanitizeSegment(document.invoiceNumber) || "invoice";

  return `invoice-${invoiceSegment}.${format}`;
}
