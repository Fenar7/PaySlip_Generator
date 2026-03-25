import type { BrandingConfig } from "@/lib/branding";

export type VoucherType = "payment" | "receipt";
export type VoucherTemplateId = "minimal-office" | "traditional-ledger";

export type VoucherVisibilityConfig = {
  showAddress: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showPaymentMode: boolean;
  showReferenceNumber: boolean;
  showNotes: boolean;
  showApprovedBy: boolean;
  showReceivedBy: boolean;
  showSignatureArea: boolean;
};

export type VoucherFormValues = {
  templateId: VoucherTemplateId;
  voucherType: VoucherType;
  branding: BrandingConfig;
  voucherNumber: string;
  date: string;
  counterpartyName: string;
  amount: string;
  paymentMode: string;
  referenceNumber: string;
  purpose: string;
  notes: string;
  approvedBy: string;
  receivedBy: string;
  visibility: VoucherVisibilityConfig;
};

export type VoucherDocument = {
  templateId: VoucherTemplateId;
  voucherType: VoucherType;
  title: string;
  counterpartyLabel: string;
  branding: BrandingConfig;
  voucherNumber: string;
  date: string;
  counterpartyName: string;
  amount: number;
  amountFormatted: string;
  amountInWords: string;
  paymentMode?: string;
  referenceNumber?: string;
  purpose: string;
  notes?: string;
  approvedBy?: string;
  receivedBy?: string;
  visibility: VoucherVisibilityConfig;
};
