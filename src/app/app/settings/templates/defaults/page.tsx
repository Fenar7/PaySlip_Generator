import { TEMPLATE_REGISTRY, DOCTYPE_LABELS, type DocType } from "@/lib/docs/templates/registry";
import { getOrgDefaults } from "@/app/app/actions/org-defaults-actions";
import { DefaultTemplatesClient } from "./default-templates-client";

export const metadata = {
  title: "Default Templates | Slipwise Settings",
};

export default async function DefaultTemplatesPage() {
  const defaults = await getOrgDefaults();

  const currentDefaults = {
    invoice: defaults?.defaultInvoiceTemplate ?? null,
    voucher: defaults?.defaultVoucherTemplate ?? null,
    "salary-slip": defaults?.defaultSlipTemplate ?? null,
  };

  // Determine Slipwise platform defaults (first non-premium template for each doc type)
  const slipwiseDefaults: Record<DocType, string> = {
    invoice: TEMPLATE_REGISTRY.find((t) => t.docTypes.includes("invoice") && !t.isPremium)?.templateId ?? "minimal",
    voucher: TEMPLATE_REGISTRY.find((t) => t.docTypes.includes("voucher") && !t.isPremium)?.templateId ?? "minimal-office",
    "salary-slip": TEMPLATE_REGISTRY.find((t) => t.docTypes.includes("salary-slip") && !t.isPremium)?.templateId ?? "corporate-clean",
  };

  return (
    <DefaultTemplatesClient
      currentDefaults={currentDefaults}
      slipwiseDefaults={slipwiseDefaults}
      allTemplates={TEMPLATE_REGISTRY}
    />
  );
}
