import type { CSSProperties } from "react";
import {
  A4_DOCUMENT_HEIGHT,
  A4_DOCUMENT_WIDTH,
} from "@/components/document/document-constants";
import { salarySlipTemplateRegistry } from "@/features/salary-slip/templates";
import type { SalarySlipDocument } from "@/features/salary-slip/types";

type SalarySlipDocumentFrameProps = {
  document: SalarySlipDocument;
};

export function SalarySlipDocumentFrame({
  document,
}: SalarySlipDocumentFrameProps) {
  const template = salarySlipTemplateRegistry[document.templateId];
  const TemplateComponent = template.component;

  return (
    <article
      className="w-full bg-white p-8 text-[var(--voucher-ink)]"
      style={
        {
          width: `${A4_DOCUMENT_WIDTH}px`,
          minHeight: `${A4_DOCUMENT_HEIGHT}px`,
          "--voucher-ink": "#1d1710",
          "--voucher-accent": document.branding.accentColor || "var(--accent)",
        } as CSSProperties
      }
    >
      <TemplateComponent document={document} />
    </article>
  );
}
