"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { updateOrgDefaults } from "@/app/app/actions/org-defaults-actions";
import type { TemplateDefinition, DocType } from "@/lib/docs/templates/registry";
import { DOCTYPE_LABELS, getEffectiveTemplateId } from "@/lib/docs/templates/registry";
import {
  SAMPLE_INVOICE_DOCUMENT,
  SAMPLE_VOUCHER_DOCUMENT,
  SAMPLE_SALARY_SLIP_DOCUMENT,
} from "@/lib/docs/templates/sample-documents";
import { invoiceTemplateRegistry } from "@/features/docs/invoice/templates";
import { voucherTemplateRegistry } from "@/features/docs/voucher/templates";
import { salarySlipTemplateRegistry } from "@/features/docs/salary-slip/templates";
import type { InvoiceTemplateId } from "@/features/docs/invoice/types";
import type { VoucherTemplateId } from "@/features/docs/voucher/types";
import type { SalarySlipTemplateId } from "@/features/docs/salary-slip/types";

const DOC_NEW_PATHS: Record<DocType, string> = {
  invoice: "/app/docs/invoices/new",
  voucher: "/app/docs/vouchers/new",
  "salary-slip": "/app/docs/salary-slips/new",
};

const DOC_TYPE_DEFAULT_KEY: Record<
  DocType,
  "defaultInvoiceTemplate" | "defaultVoucherTemplate" | "defaultSlipTemplate"
> = {
  invoice: "defaultInvoiceTemplate",
  voucher: "defaultVoucherTemplate",
  "salary-slip": "defaultSlipTemplate",
};

interface TemplatePreviewModalProps {
  template: TemplateDefinition;
  initialDocType: DocType;
  onClose: () => void;
}

function renderTemplatePreview(templateId: string, docType: DocType) {
  if (docType === "invoice") {
    const entry = invoiceTemplateRegistry[templateId as InvoiceTemplateId];
    if (!entry) return null;
    const doc = { ...SAMPLE_INVOICE_DOCUMENT, templateId: templateId as InvoiceTemplateId };
    return <entry.component document={doc} mode="preview" />;
  }
  if (docType === "voucher") {
    const entry = voucherTemplateRegistry[templateId as VoucherTemplateId];
    if (!entry) return null;
    const doc = { ...SAMPLE_VOUCHER_DOCUMENT, templateId: templateId as VoucherTemplateId };
    return <entry.component document={doc} mode="preview" />;
  }
  if (docType === "salary-slip") {
    const entry = salarySlipTemplateRegistry[templateId as SalarySlipTemplateId];
    if (!entry) return null;
    const doc = { ...SAMPLE_SALARY_SLIP_DOCUMENT, templateId: templateId as SalarySlipTemplateId };
    return <entry.component document={doc} mode="preview" />;
  }
  return null;
}

export function TemplatePreviewModal({
  template,
  initialDocType,
  onClose,
}: TemplatePreviewModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeDocType, setActiveDocType] = useState<DocType>(initialDocType);
  const backdropRef = useRef<HTMLDivElement>(null);

  const effectiveTemplateId = getEffectiveTemplateId(template, activeDocType);
  const preview = renderTemplatePreview(effectiveTemplateId, activeDocType);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleUseOnce = () => {
    const path = DOC_NEW_PATHS[activeDocType];
    onClose();
    router.push(`${path}?template=${effectiveTemplateId}`);
  };

  const handleSetDefault = () => {
    startTransition(async () => {
      const result = await updateOrgDefaults({
        [DOC_TYPE_DEFAULT_KEY[activeDocType]]: effectiveTemplateId,
      });
      if (result.success) {
        toast.success(`"${template.name}" set as default ${DOCTYPE_LABELS[activeDocType]} template`);
        onClose();
      } else {
        toast.error("Failed to update default template");
      }
    });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${template.name}`}
    >
      <div className="relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{template.name}</h2>
              <p className="text-sm text-slate-500">{template.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close preview"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Doc type tabs (only if multiple) */}
        {template.docTypes.length > 1 && (
          <div className="shrink-0 flex gap-1 border-b border-slate-100 px-6 py-2">
            {template.docTypes.map((dt) => (
              <button
                key={dt}
                type="button"
                onClick={() => setActiveDocType(dt)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeDocType === dt
                    ? "bg-red-100 text-red-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {DOCTYPE_LABELS[dt]}
              </button>
            ))}
          </div>
        )}

        {/* Preview area */}
        <div className="flex min-h-0 flex-1 overflow-y-auto bg-slate-100 p-6">
          {preview ? (
            <div className="mx-auto w-full max-w-3xl">
              {/* A4-like white page container */}
              <div className="relative mx-auto overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5">
                <div className="p-8 text-[13px]">
                  {preview}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-slate-400">
              <div className="text-center">
                <svg className="mx-auto mb-3 h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">Preview not available for this template.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-500">
                #{tag}
              </span>
            ))}
            {template.isPremium && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                PRO
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSetDefault}
              disabled={isPending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Setting..." : "Set as Default"}
            </button>
            <button
              type="button"
              onClick={handleUseOnce}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Use This Template →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
