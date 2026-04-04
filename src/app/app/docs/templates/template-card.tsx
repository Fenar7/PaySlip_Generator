"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { TemplateDefinition, DocType } from "@/lib/docs/templates/registry";
import { DOCTYPE_LABELS, CATEGORY_LABELS } from "@/lib/docs/templates/registry";

const DOC_NEW_PATHS: Record<DocType, string> = {
  invoice: "/app/docs/invoices/new",
  voucher: "/app/docs/vouchers/new",
  "salary-slip": "/app/docs/salary-slips/new",
};

interface TemplateCardProps {
  template: TemplateDefinition;
  onSetDefault?: (templateId: string, docType: DocType) => void;
}

export function TemplateCard({ template, onSetDefault }: TemplateCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeDocType, setActiveDocType] = useState<DocType>(template.docTypes[0]);

  const handleUseOnce = () => {
    const path = DOC_NEW_PATHS[activeDocType];
    router.push(`${path}?template=${template.templateId}`);
  };

  const handleSetDefault = () => {
    startTransition(() => {
      onSetDefault?.(template.templateId, activeDocType);
    });
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
      {/* Preview */}
      <div className="relative h-48 overflow-hidden bg-slate-50 border-b border-slate-200">
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
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      </div>

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
