"use client";
import { useOrgBranding } from "@/hooks/use-org-branding";
import { InvoiceWorkspace } from "@/features/docs/invoice/components/invoice-workspace";

export function InvoiceBrandingWrapper() {
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
      <InvoiceWorkspace />
    </div>
  );
}
