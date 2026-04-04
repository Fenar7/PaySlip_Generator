"use client";
import { useOrgBranding } from "@/hooks/use-org-branding";
import { SalarySlipWorkspace } from "@/features/docs/salary-slip/components/salary-slip-workspace";

export function SalarySlipBrandingWrapper() {
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
      <SalarySlipWorkspace />
    </div>
  );
}
