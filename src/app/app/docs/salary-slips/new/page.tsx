import type { Metadata } from "next";
import { listEmployees } from "@/app/app/data/actions";
import { listSalaryPresets } from "@/app/app/data/salary-preset-actions";
import { SalarySlipBrandingWrapper } from "./branding-wrapper";
import { getOrgDefaults } from "@/app/app/actions/org-defaults-actions";

export const metadata: Metadata = {
  title: "Salary Slip Studio",
  description: "Create and export salary slips.",
};

export default async function NewSalarySlipPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const params = await searchParams;
  const [{ employees }, presetsResult, defaults] = await Promise.all([
    listEmployees({ limit: 200 }),
    listSalaryPresets(),
    getOrgDefaults().catch(() => null),
  ]);
  const presets = presetsResult.presets;
  const templateId = params.template || defaults?.defaultSlipTemplate || undefined;

  return <SalarySlipBrandingWrapper employees={employees} presets={presets} initialTemplateId={templateId} />;
}
