"use client";
import { useState, useEffect } from "react";
import { useActiveOrg } from "@/hooks/use-active-org";
import { getOrgBranding } from "@/app/app/actions/get-branding";

export interface OrgBranding {
  accentColor: string;
  fontFamily: string;
  fontColor: string;
}

const DEFAULT_BRANDING: OrgBranding = {
  accentColor: "#dc2626",
  fontFamily: "Inter",
  fontColor: "#1a1a1a",
};

export function useOrgBranding(): OrgBranding {
  const { activeOrg } = useActiveOrg();
  const [branding, setBranding] = useState<OrgBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    if (!activeOrg?.id) return;
    getOrgBranding(activeOrg.id).then((data) => {
      if (data) {
        setBranding({
          accentColor: data.accentColor ?? DEFAULT_BRANDING.accentColor,
          fontFamily: data.fontFamily ?? DEFAULT_BRANDING.fontFamily,
          fontColor: data.fontColor ?? DEFAULT_BRANDING.fontColor,
        });
      }
    });
  }, [activeOrg?.id]);

  return branding;
}
