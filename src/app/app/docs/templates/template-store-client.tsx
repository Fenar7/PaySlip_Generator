"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrgDefaults } from "@/app/app/actions/org-defaults-actions";
import type { TemplateDefinition, DocType } from "@/lib/docs/templates/registry";
import { TemplateCard } from "./template-card";
import { TemplatePreviewModal } from "./template-preview-modal";

interface TemplateStoreClientProps {
  templates: TemplateDefinition[];
  currentDefaults: Record<DocType, string | null>;
}

const DOC_TYPE_DEFAULT_KEY: Record<DocType, "defaultInvoiceTemplate" | "defaultVoucherTemplate" | "defaultSlipTemplate"> = {
  invoice: "defaultInvoiceTemplate",
  voucher: "defaultVoucherTemplate",
  "salary-slip": "defaultSlipTemplate",
};

type PreviewState = { template: TemplateDefinition; docType: DocType } | null;

export function TemplateStoreClient({ templates, currentDefaults }: TemplateStoreClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [previewState, setPreviewState] = useState<PreviewState>(null);

  const handleSetDefault = (templateId: string, docType: DocType) => {
    startTransition(async () => {
      const result = await updateOrgDefaults({ [DOC_TYPE_DEFAULT_KEY[docType]]: templateId });
      if (result.success) {
        toast.success("Default template updated");
        router.refresh();
      } else {
        toast.error("Failed to update default template");
      }
    });
  };

  const handlePreview = (template: TemplateDefinition, docType: DocType) => {
    setPreviewState({ template, docType });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            currentDefaults={currentDefaults}
            onSetDefault={handleSetDefault}
            onPreview={handlePreview}
          />
        ))}
      </div>

      {previewState && (
        <TemplatePreviewModal
          template={previewState.template}
          initialDocType={previewState.docType}
          currentDefaults={currentDefaults}
          onClose={() => setPreviewState(null)}
        />
      )}
    </>
  );
}
