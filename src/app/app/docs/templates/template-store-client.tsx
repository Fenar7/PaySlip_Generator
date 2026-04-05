"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateOrgDefaults } from "@/app/app/actions/org-defaults-actions";
import type { TemplateDefinition, DocType } from "@/lib/docs/templates/registry";
import { TemplateCard } from "./template-card";

interface TemplateStoreClientProps {
  templates: TemplateDefinition[];
}

const DOC_TYPE_DEFAULT_KEY: Record<DocType, "defaultInvoiceTemplate" | "defaultVoucherTemplate" | "defaultSlipTemplate"> = {
  invoice: "defaultInvoiceTemplate",
  voucher: "defaultVoucherTemplate",
  "salary-slip": "defaultSlipTemplate",
};

export function TemplateStoreClient({ templates }: TemplateStoreClientProps) {
  const [, startTransition] = useTransition();

  const handleSetDefault = (templateId: string, docType: DocType) => {
    startTransition(async () => {
      const result = await updateOrgDefaults({ [DOC_TYPE_DEFAULT_KEY[docType]]: templateId });
      if (result.success) {
        toast.success("Default template updated");
      } else {
        toast.error("Failed to update default template");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} onSetDefault={handleSetDefault} />
      ))}
    </div>
  );
}
