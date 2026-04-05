import type { Metadata } from "next";
import { listEmployees } from "@/app/app/data/actions";
import { listSalaryPresets } from "@/app/app/data/salary-preset-actions";
import { SalarySlipBrandingWrapper } from "./branding-wrapper";

export const metadata: Metadata = {
  title: "Salary Slip Studio",
  description: "Create and export salary slips.",
};

export default async function NewSalarySlipPage() {
  const [{ employees }, presets] = await Promise.all([
    listEmployees({ limit: 200 }),
    listSalaryPresets(),
  ]);

  return <SalarySlipBrandingWrapper employees={employees} presets={presets} />;
}
