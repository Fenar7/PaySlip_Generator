import { DocumentPreviewSurface } from "@/components/document/document-preview-surface";
import { InvoiceDocumentFrame } from "@/features/invoice/components/invoice-document-frame";
import { invoiceTemplateRegistry } from "@/features/invoice/templates";
import type { InvoiceDocument } from "@/features/invoice/types";

export function InvoicePreview({
  document,
}: {
  document: InvoiceDocument;
}) {
  const template = invoiceTemplateRegistry[document.templateId];

  return (
    <DocumentPreviewSurface title={document.title} templateName={template.name}>
      <InvoiceDocumentFrame document={document} />
    </DocumentPreviewSurface>
  );
}
