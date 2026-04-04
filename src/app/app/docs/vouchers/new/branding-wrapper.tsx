"use client";
import { useOrgBranding } from "@/hooks/use-org-branding";
import { VoucherWorkspace } from "@/features/docs/voucher/components/voucher-workspace";
import type { VoucherFormValues } from "@/features/docs/voucher/types";

export type ExistingVoucher = {
  id: string;
  voucherNumber: string;
  voucherDate: string;
  type: string;
  totalAmount: number;
  formData: unknown;
  lines: Array<{
    id: string;
    description: string;
    amount: number;
  }>;
  vendor?: { name: string } | null;
};

export function VoucherBrandingWrapper({
  existingVoucher,
}: {
  existingVoucher?: ExistingVoucher;
}) {
  const branding = useOrgBranding();

  const initialValues: Partial<VoucherFormValues> | undefined = existingVoucher
    ? {
        ...(existingVoucher.formData as Partial<VoucherFormValues>),
        voucherNumber: existingVoucher.voucherNumber,
        date: existingVoucher.voucherDate,
        voucherType: existingVoucher.type as "payment" | "receipt",
      }
    : undefined;

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
      <VoucherWorkspace
        voucherId={existingVoucher?.id}
        initialValues={initialValues}
      />
    </div>
  );
}
