import type { Metadata } from "next";
import { PdfStudioUpgradeNotice } from "@/features/docs/pdf-studio/components/pdf-studio-upgrade-notice";
import { RepairWorkspace } from "@/features/docs/pdf-studio/components/repair/repair-workspace";
import { buildPdfStudioToolMetadata } from "@/features/docs/pdf-studio/lib/route-metadata";
import { getPdfStudioToolUpgradeCopy } from "@/features/docs/pdf-studio/lib/plan-gates";
import { getOrgContext } from "@/lib/auth";
import { getOrgPlan } from "@/lib/plans/enforcement";

export const metadata: Metadata = buildPdfStudioToolMetadata("repair", "workspace");

export default async function RepairPage() {
  const context = await getOrgContext();
  if (context) {
    const orgPlan = await getOrgPlan(context.orgId);
    if (orgPlan.planId !== "pro" && orgPlan.planId !== "enterprise") {
      return (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <PdfStudioUpgradeNotice
            toolId="repair"
            surface="workspace"
            requiredPlan="pro"
            title="Repair and recovery need Pro"
            description={getPdfStudioToolUpgradeCopy("repair")}
            ctaLabel="Upgrade to Pro"
            ctaHref="/pricing"
          />
        </div>
      );
    }
  }

  return <RepairWorkspace />;
}
