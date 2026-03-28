import type { JSX } from "react";
import type {
  SalarySlipDocument,
  SalarySlipTemplateId,
} from "@/features/salary-slip/types";
import { CorporateCleanSalarySlipTemplate } from "@/features/salary-slip/templates/corporate-clean";
import { ModernPremiumSalarySlipTemplate } from "@/features/salary-slip/templates/modern-premium";

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
};
