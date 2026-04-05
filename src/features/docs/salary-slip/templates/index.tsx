import type { JSX } from "react";
import type {
  SalarySlipDocument,
  SalarySlipTemplateId,
} from "@/features/docs/salary-slip/types";
import { CorporateCleanSalarySlipTemplate } from "@/features/docs/salary-slip/templates/corporate-clean";
import { ModernPremiumSalarySlipTemplate } from "@/features/docs/salary-slip/templates/modern-premium";
import { ClassicFormalSalarySlipTemplate } from "@/features/docs/salary-slip/templates/classic-formal";
import { DetailedBreakdownSalarySlipTemplate } from "@/features/docs/salary-slip/templates/detailed-breakdown";
import { CompactPayslipSalarySlipTemplate } from "@/features/docs/salary-slip/templates/compact-payslip";

export const salarySlipTemplateRegistry: Record<
  SalarySlipTemplateId,
  {
    name: string;
    component: ({
      document,
      mode,
    }: {
      document: SalarySlipDocument;
      mode?: "preview" | "print" | "pdf" | "png";
    }) => JSX.Element;
  }
> = {
  "corporate-clean": {
    name: "Corporate Clean",
    component: CorporateCleanSalarySlipTemplate,
  },
  "modern-premium": {
    name: "Modern Premium",
    component: ModernPremiumSalarySlipTemplate,
  },
  "classic-formal": {
    name: "Classic Formal",
    component: ClassicFormalSalarySlipTemplate,
  },
  "detailed-breakdown": {
    name: "Detailed Breakdown",
    component: DetailedBreakdownSalarySlipTemplate,
  },
  "compact-payslip": {
    name: "Compact Payslip",
    component: CompactPayslipSalarySlipTemplate,
  },
};
