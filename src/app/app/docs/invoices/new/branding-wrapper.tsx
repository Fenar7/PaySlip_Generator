"use client";
import { useOrgBranding } from "@/hooks/use-org-branding";
import { InvoiceWorkspace } from "@/features/docs/invoice/components/invoice-workspace";

export type ExistingInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  status: string;
  notes: string | null;
  formData: unknown;
  totalAmount: number;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount: number;
    amount: number;
    sortOrder: number;
  }>;
  customer: {
    id: string;
    name: string;
  } | null;
};

interface InvoiceBrandingWrapperProps {
  existingInvoice?: ExistingInvoice | null;
}

export function InvoiceBrandingWrapper({ existingInvoice }: InvoiceBrandingWrapperProps) {
  const branding = useOrgBranding();

  return (
    <div
      style={
        {
          "--brand-accent": branding.accentColor,
          "--brand-font": branding.fontFamily,
          "--brand-font-color": branding.fontColor,
        } as React.CSSProperties
      }
    >
      <InvoiceWorkspace existingInvoice={existingInvoice} />
    </div>
  );
}
