import { DocumentPreviewSurface } from "@/components/document/document-preview-surface";
import { VoucherDocumentFrame } from "@/features/voucher/components/voucher-document-frame";
import { voucherTemplateRegistry } from "@/features/voucher/templates";
import type { VoucherDocument } from "@/features/voucher/types";

type VoucherPreviewProps = {
  document: VoucherDocument;
};

export function VoucherPreview({ document }: VoucherPreviewProps) {
  const template = voucherTemplateRegistry[document.templateId];

  return (
    <DocumentPreviewSurface title={document.title} templateName={template.name}>
      <VoucherDocumentFrame document={document} />
    </DocumentPreviewSurface>
  );
}
