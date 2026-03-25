import { z } from "zod";
import type { VoucherFormValues } from "@/features/voucher/types";
import { voucherDefaultValues } from "@/features/voucher/constants";

const brandingSchema = z.object({
  companyName: z.string().trim(),
  address: z.string().trim(),
  email: z.string().trim(),
  phone: z.string().trim(),
  logoDataUrl: z.string().optional(),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, "Enter a valid hex color."),
});

const visibilitySchema = z.object({
  showAddress: z.boolean(),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  showPaymentMode: z.boolean(),
  showReferenceNumber: z.boolean(),
  showNotes: z.boolean(),
  showApprovedBy: z.boolean(),
  showReceivedBy: z.boolean(),
  showSignatureArea: z.boolean(),
});

export const voucherFormSchema = z.object({
  templateId: z.enum(["minimal-office", "traditional-ledger"]),
  voucherType: z.enum(["payment", "receipt"]),
  branding: brandingSchema,
  voucherNumber: z.string().trim().min(1, "Voucher number is required."),
  date: z.string().trim().min(1, "Date is required."),
  counterpartyName: z.string().trim().min(1, "Counterparty is required."),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required.")
    .refine((value) => Number.isFinite(Number(value)), "Enter a valid amount.")
    .refine((value) => Number(value) > 0, "Amount must be greater than zero."),
  paymentMode: z.string().trim(),
  referenceNumber: z.string().trim(),
  purpose: z.string().trim().min(1, "Purpose or narration is required."),
  notes: z.string().trim(),
  approvedBy: z.string().trim(),
  receivedBy: z.string().trim(),
  visibility: visibilitySchema,
});

export type VoucherFormSchema = z.infer<typeof voucherFormSchema>;

export function validateVoucherForm(
  values: VoucherFormValues = voucherDefaultValues,
) {
  return voucherFormSchema.safeParse(values);
}
