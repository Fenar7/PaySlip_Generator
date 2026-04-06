import type { InvoiceDocument, InvoiceTemplateId } from "@/features/docs/invoice/types";
import { BoldBrandInvoiceTemplate } from "@/features/docs/invoice/templates/bold-brand";
import { ClassicBorderedInvoiceTemplate } from "@/features/docs/invoice/templates/classic-bordered";
import { MinimalInvoiceTemplate } from "@/features/docs/invoice/templates/minimal";
import { ModernEdgeInvoiceTemplate } from "@/features/docs/invoice/templates/modern-edge";
import { ProfessionalInvoiceTemplate } from "@/features/docs/invoice/templates/professional";

export const invoiceTemplateRegistry: Record<
  InvoiceTemplateId,
  {
    name: string;
    component: ({
      document,
      mode,
    }: {
      document: InvoiceDocument;
      mode?: "preview" | "print" | "pdf" | "png" | "edit";
    }) => React.JSX.Element;
  }
> = {
  minimal: {
    name: "Minimal",
    component: MinimalInvoiceTemplate,
  },
  professional: {
    name: "Professional",
    component: ProfessionalInvoiceTemplate,
  },
  "bold-brand": {
    name: "Bold Brand",
    component: BoldBrandInvoiceTemplate,
  },
  "classic-bordered": {
    name: "Classic Bordered",
    component: ClassicBorderedInvoiceTemplate,
  },
  "modern-edge": {
    name: "Modern Edge",
    component: ModernEdgeInvoiceTemplate,
  },
};
