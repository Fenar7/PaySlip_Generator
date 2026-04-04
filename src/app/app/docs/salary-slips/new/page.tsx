import type { Metadata } from "next";
import { SalarySlipBrandingWrapper } from "./branding-wrapper";

export const metadata: Metadata = {
  title: "Salary Slip Studio",
  description: "Create and export salary slips.",
};

export default function NewSalarySlipPage() {
  return <SalarySlipBrandingWrapper />;
}
