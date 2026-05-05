"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import { X, ArrowRight } from "lucide-react";

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
  currentDefaults: Record<DocType, string | null>;
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
  currentDefaults,
  onClose,
}: TemplatePreviewModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeDocType, setActiveDocType] = useState<DocType>(initialDocType);
  const backdropRef = useRef<HTMLDivElement>(null);

  const effectiveTemplateId = getEffectiveTemplateId(template, activeDocType);
  const preview = renderTemplatePreview(effectiveTemplateId, activeDocType);
  const isDefault = currentDefaults[activeDocType] === effectiveTemplateId;

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${template.name}`}
    >
      <div className="relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-default)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{template.name}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{template.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white text-[var(--text-muted)] shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--surface-subtle)]"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Doc type tabs */}
        {template.docTypes.length > 1 && (
          <div className="shrink-0 flex gap-1.5 border-b border-[var(--border-soft)] px-5 py-2.5 sm:px-6">
            {template.docTypes.map((dt) => {
              const dtEffective = getEffectiveTemplateId(template, dt);
              const dtIsDefault = currentDefaults[dt] === dtEffective;
              return (
                <button
                  key={dt}
                  type="button"
                  onClick={() => setActiveDocType(dt)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                    activeDocType === dt
                      ? "border border-transparent bg-[var(--surface-accent)] text-[var(--text-accent)]"
                      : "border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--surface-selected)]"
                  )}
                >
                  {DOCTYPE_LABELS[dt]}
                  {dtIsDefault && (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--state-success)]" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Preview area */}
        <div className="flex min-h-0 flex-1 overflow-y-auto bg-[var(--surface-subtle)] p-5 sm:p-6">
          {preview ? (
            <div className="mx-auto w-full max-w-3xl">
              <div
                className="relative mx-auto overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5"
                style={{
                  "--voucher-ink": "#1d1710",
                  "--voucher-accent": SAMPLE_INVOICE_DOCUMENT.branding.accentColor || "#2563eb",
                } as React.CSSProperties}
              >
                <div className="p-8 text-[13px]">
                  {preview}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
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
        <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--border-default)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap gap-1.5">
            {template.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full border border-[var(--border-soft)] bg-white px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
                #{tag}
              </span>
            ))}
            {template.isPremium && (
              <span className="rounded-full bg-[var(--brand-secondary)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-secondary)]">
                PRO
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--surface-subtle)]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSetDefault}
              disabled={isPending || isDefault}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all disabled:opacity-50",
                isDefault
                  ? "border border-[var(--state-success)]/30 bg-[var(--state-success-soft)] text-[var(--state-success)]"
                  : "border border-[var(--border-default)] bg-white text-[var(--text-primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-subtle)]"
              )}
            >
              {isPending ? "Setting..." : isDefault ? "Default Set" : "Set as Default"}
            </button>
            <button
              type="button"
              onClick={handleUseOnce}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-[var(--brand-cta)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-xs)] transition-all hover:bg-[#B91C1C] disabled:opacity-50"
            >
              Use This Template
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
