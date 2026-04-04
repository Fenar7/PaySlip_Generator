import type { CSSProperties } from "react";
import {
  A4_DOCUMENT_HEIGHT,
  A4_DOCUMENT_WIDTH,
} from "@/components/document/document-constants";
import { salarySlipTemplateRegistry } from "@/features/docs/salary-slip/templates";
import type { SalarySlipDocument } from "@/features/docs/salary-slip/types";

type SalarySlipDocumentFrameProps = {
  document: SalarySlipDocument;
  mode?: "preview" | "print" | "pdf" | "png";
};

export function SalarySlipDocumentFrame({
  document,
  mode = "preview",
}: SalarySlipDocumentFrameProps) {
  const template = salarySlipTemplateRegistry[document.templateId];
  const TemplateComponent = template.component;

  return (
    <article
      data-testid={mode === "preview" ? undefined : "salary-slip-render-ready"}
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
      <TemplateComponent document={document} mode={mode} />
    </article>
  );
}
