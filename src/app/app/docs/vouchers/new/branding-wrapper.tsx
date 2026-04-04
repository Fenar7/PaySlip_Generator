"use client";
import { useOrgBranding } from "@/hooks/use-org-branding";
import { VoucherWorkspace } from "@/features/docs/voucher/components/voucher-workspace";

export function VoucherBrandingWrapper() {
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
      <VoucherWorkspace />
    </div>
  );
}
