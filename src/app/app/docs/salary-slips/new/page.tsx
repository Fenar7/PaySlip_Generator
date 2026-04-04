import type { Metadata } from "next";
import { SalarySlipWorkspace } from "@/features/docs/salary-slip/components/salary-slip-workspace";

export const metadata: Metadata = {
  title: "Salary Slip Studio",
  description: "Create and export salary slips.",
};

export default function NewSalarySlipPage() {
  return <SalarySlipWorkspace />;
}
