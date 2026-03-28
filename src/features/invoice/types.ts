import type { BrandingConfig } from "@/lib/branding";

export type InvoiceTemplateId = "minimal" | "professional" | "bold-brand";

export type InvoiceExportFormat = "pdf" | "png";

export type InvoiceLineItemFormValue = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discountAmount: string;
};

export type InvoiceVisibilityConfig = {
  showAddress: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showBusinessTaxId: boolean;
  showClientAddress: boolean;
  showClientEmail: boolean;
  showClientPhone: boolean;
  showDueDate: boolean;
  showNotes: boolean;
  showTerms: boolean;
  showBankDetails: boolean;
  showSignature: boolean;
};

export type InvoiceFormValues = {
  templateId: InvoiceTemplateId;
  branding: BrandingConfig;
  businessTaxId: string;
  clientName: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amountPaid: string;
  notes: string;
  terms: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  authorizedBy: string;
  lineItems: InvoiceLineItemFormValue[];
  visibility: InvoiceVisibilityConfig;
};

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountAmount: number;
  baseAmount: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
  unitPriceFormatted: string;
  discountAmountFormatted: string;
  baseAmountFormatted: string;
  taxAmountFormatted: string;
  lineTotalFormatted: string;
};

export type InvoiceDocument = {
  templateId: InvoiceTemplateId;
  title: string;
  branding: BrandingConfig;
  businessTaxId?: string;
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  clientPhone?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  currencyCode: "INR";
  lineItems: InvoiceLineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  subtotalFormatted: string;
  totalDiscountFormatted: string;
  totalTaxFormatted: string;
  grandTotalFormatted: string;
  amountPaidFormatted: string;
  balanceDueFormatted: string;
  amountInWords: string;
  notes?: string;
  terms?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  authorizedBy?: string;
  visibility: InvoiceVisibilityConfig;
};
