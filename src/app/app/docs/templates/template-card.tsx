"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { TemplateDefinition, DocType } from "@/lib/docs/templates/registry";
import { DOCTYPE_LABELS, CATEGORY_LABELS, getEffectiveTemplateId } from "@/lib/docs/templates/registry";

const DOC_NEW_PATHS: Record<DocType, string> = {
  invoice: "/app/docs/invoices/new",
  voucher: "/app/docs/vouchers/new",
  "salary-slip": "/app/docs/salary-slips/new",
};

interface TemplateCardProps {
  template: TemplateDefinition;
  onSetDefault?: (templateId: string, docType: DocType) => void;
  onPreview?: (template: TemplateDefinition, docType: DocType) => void;
}

export function TemplateCard({ template, onSetDefault, onPreview }: TemplateCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeDocType, setActiveDocType] = useState<DocType>(template.docTypes[0]);

  const handleUseOnce = () => {
    const path = DOC_NEW_PATHS[activeDocType];
    router.push(`${path}?template=${getEffectiveTemplateId(template, activeDocType)}`);
  };

  const handleSetDefault = () => {
    startTransition(() => {
      onSetDefault?.(getEffectiveTemplateId(template, activeDocType), activeDocType);
    });
  };

  const handlePreview = () => {
    onPreview?.(template, activeDocType);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
      {/* Preview thumbnail */}
      <button
        type="button"
        onClick={handlePreview}
        className="relative h-48 w-full overflow-hidden bg-slate-50 border-b border-slate-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        aria-label={`Preview ${template.name}`}
      >
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-[140px] shadow-lg rounded overflow-hidden">
            <Image
              src={template.previewImage}
              alt={template.name}
              width={140}
              height={182}
              className="w-full h-auto"
              unoptimized
            />
          </div>
        </div>
        {template.isPremium && (
          <div className="absolute top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
            PRO
          </div>
        )}
        {/* Hover overlay with preview hint */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/0 group-hover:bg-black/40 transition-all opacity-0 group-hover:opacity-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <span className="text-xs font-medium text-white drop-shadow">Click to preview</span>
        </div>
      </button>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900">{template.name}</h3>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {CATEGORY_LABELS[template.category].split(" ")[0]}
          </span>
        </div>
        <p className="mb-3 text-xs text-slate-500 line-clamp-2">{template.description}</p>

        {/* Doc type selector (if multiple) */}
        {template.docTypes.length > 1 && (
          <div className="mb-3 flex gap-1">
            {template.docTypes.map((dt) => (
              <button
                key={dt}
                type="button"
                onClick={() => setActiveDocType(dt)}
                className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                  activeDocType === dt
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {DOCTYPE_LABELS[dt]}
              </button>
            ))}
          </div>
        )}

        {/* Tags */}
        <div className="mb-4 flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded text-xs text-slate-400">
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
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Use Once
          </button>
          <button
            type="button"
            onClick={handleSetDefault}
            disabled={isPending}
            className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Setting..." : "Set Default"}
          </button>
        </div>
      </div>
    </div>
  );
}
