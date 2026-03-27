import { DocumentPreviewSurface } from "@/components/document/document-preview-surface";
import { SalarySlipDocumentFrame } from "@/features/salary-slip/components/salary-slip-document-frame";
import { salarySlipTemplateRegistry } from "@/features/salary-slip/templates";
import type { SalarySlipDocument } from "@/features/salary-slip/types";

type SalarySlipPreviewProps = {
  document: SalarySlipDocument;
};

export function SalarySlipPreview({ document }: SalarySlipPreviewProps) {
  const template = salarySlipTemplateRegistry[document.templateId];

  return (
    <DocumentPreviewSurface title={document.title} templateName={template.name}>
      <SalarySlipDocumentFrame document={document} />
    </DocumentPreviewSurface>
  );
}
