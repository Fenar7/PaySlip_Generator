"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { TemplateDefinition, DocType } from "@/lib/docs/templates/registry";
import { DOCTYPE_LABELS, CATEGORY_LABELS, getEffectiveTemplateId } from "@/lib/docs/templates/registry";
import { CheckCircle2, Eye } from "lucide-react";

const DOC_NEW_PATHS: Record<DocType, string> = {
  invoice: "/app/docs/invoices/new",
  voucher: "/app/docs/vouchers/new",
  "salary-slip": "/app/docs/salary-slips/new",
};

interface TemplateCardProps {
  template: TemplateDefinition;
  currentDefaults: Record<DocType, string | null>;
  onSetDefault?: (templateId: string, docType: DocType) => void;
  onPreview?: (template: TemplateDefinition, docType: DocType) => void;
}

export function TemplateCard({ template, currentDefaults, onSetDefault, onPreview }: TemplateCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeDocType, setActiveDocType] = useState<DocType>(template.docTypes[0]);

  const effectiveId = getEffectiveTemplateId(template, activeDocType);
  const isDefault = currentDefaults[activeDocType] === effectiveId;

  const handleUseOnce = () => {
    const path = DOC_NEW_PATHS[activeDocType];
    router.push(`${path}?template=${effectiveId}`);
  };

  const handleSetDefault = () => {
    startTransition(() => {
      onSetDefault?.(effectiveId, activeDocType);
    });
  };

  const handlePreview = () => {
    onPreview?.(template, activeDocType);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-white shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5">
      {/* Preview thumbnail */}
      <button
        type="button"
        onClick={handlePreview}
        className="relative h-52 w-full overflow-hidden bg-[var(--surface-subtle)] border-b border-[var(--border-soft)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        aria-label={`Preview ${template.name}`}
      >
        <div className="absolute inset-0 flex items-center justify-center p-5">
          <div className="w-full max-w-[150px] shadow-xl rounded-lg overflow-hidden">
            <Image
              src={template.previewImage}
              alt={template.name}
              width={150}
              height={195}
              className="w-full h-auto"
              unoptimized
            />
          </div>
        </div>
        {template.isPremium && (
          <div className="absolute top-3 right-3 rounded-full bg-[var(--brand-secondary)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white shadow-sm">
            PRO
          </div>
        )}
        {isDefault && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--state-success)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white shadow-sm">
            <CheckCircle2 className="h-3 w-3" />
            Default
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 group-hover:bg-black/40 transition-all opacity-0 group-hover:opacity-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[var(--text-primary)] shadow-lg">
            <Eye className="h-5 w-5" />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-md">Click to preview</span>
        </div>
      </button>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">{template.name}</h3>
          <span className="shrink-0 rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {CATEGORY_LABELS[template.category].split(" ")[0]}
          </span>
        </div>
        <p className="mb-3 text-xs leading-5 text-[var(--text-secondary)] line-clamp-2">{template.description}</p>

        {/* Doc type selector */}
        {template.docTypes.length > 1 && (
          <div className="mb-3 flex gap-1.5">
            {template.docTypes.map((dt) => {
              const dtEffective = getEffectiveTemplateId(template, dt);
              const dtIsDefault = currentDefaults[dt] === dtEffective;
              return (
                <button
                  key={dt}
                  type="button"
                  onClick={() => setActiveDocType(dt)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                    activeDocType === dt
                      ? "border border-transparent bg-[var(--surface-accent)] text-[var(--text-accent)]"
                      : "border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--surface-selected)]"
                  )}
                >
                  {DOCTYPE_LABELS[dt]}
                  {dtIsDefault && (
                    <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--state-success)]" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[0.7rem] text-[var(--text-muted)]">
              #{tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <button
            type="button"
            onClick={handleUseOnce}
            disabled={isPending}
            className="flex-1 rounded-full border border-[var(--border-default)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-all hover:bg-[var(--surface-subtle)] disabled:opacity-50"
          >
            Use Once
          </button>
          <button
            type="button"
            onClick={handleSetDefault}
            disabled={isPending || isDefault}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-xs font-medium transition-all disabled:opacity-50",
              isDefault
                ? "border border-[var(--state-success)]/30 bg-[var(--state-success-soft)] text-[var(--state-success)] cursor-default"
                : "border border-transparent bg-[var(--brand-cta)] text-white shadow-[var(--shadow-xs)] hover:bg-[#B91C1C]"
            )}
          >
            {isPending ? "Setting..." : isDefault ? "Current Default" : "Set Default"}
          </button>
        </div>
      </div>
    </div>
  );
}
