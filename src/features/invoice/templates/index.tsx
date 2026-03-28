import type { InvoiceDocument, InvoiceTemplateId } from "@/features/invoice/types";
import { BoldBrandInvoiceTemplate } from "@/features/invoice/templates/bold-brand";
import { MinimalInvoiceTemplate } from "@/features/invoice/templates/minimal";
import { ProfessionalInvoiceTemplate } from "@/features/invoice/templates/professional";

export const invoiceTemplateRegistry: Record<
  InvoiceTemplateId,
  {
    name: string;
    component: ({
      document,
      mode,
    }: {
      document: InvoiceDocument;
      mode?: "preview" | "print" | "pdf" | "png";
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
};
