import { DocumentPreviewSurface } from "@/components/document/document-preview-surface";
import { voucherTemplateRegistry } from "@/features/voucher/templates";
import type { VoucherDocument } from "@/features/voucher/types";

type VoucherPreviewProps = {
  document: VoucherDocument;
};

export function VoucherPreview({ document }: VoucherPreviewProps) {
  const template = voucherTemplateRegistry[document.templateId];
  const TemplateComponent = template.component;

  return (
    <DocumentPreviewSurface title={document.title} templateName={template.name}>
      <TemplateComponent document={document} />
    </DocumentPreviewSurface>
  );
}
