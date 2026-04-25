"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { PdfStudioCapabilityMatrix } from "@/features/docs/pdf-studio/components/pdf-studio-capability-matrix";
import { PdfStudioSupportNotice } from "@/features/docs/pdf-studio/components/pdf-studio-support-notice";
import { PdfStudioUpgradeNotice } from "@/features/docs/pdf-studio/components/pdf-studio-upgrade-notice";
import {
  buildPdfStudioUploadSummary,
} from "@/features/docs/pdf-studio/lib/ingestion";
import {
  getPdfStudioCapabilityTier,
  getPdfStudioToolUpgradeCopy,
  getPdfStudioWorkspaceMinimumPlan,
} from "@/features/docs/pdf-studio/lib/plan-gates";
import {
  getPdfStudioExecutionCopy,
  getPdfStudioTierBadgeCopy,
  isPdfStudioToolInteractiveForPublic,
  type PdfStudioToolDefinition,
} from "@/features/docs/pdf-studio/lib/tool-registry";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";

export function PdfStudioPublicToolShell({
  tool,
  children,
}: {
  tool: PdfStudioToolDefinition;
  children: React.ReactNode;
}) {
  const analytics = usePdfStudioAnalytics(tool.id);
  const execution = getPdfStudioExecutionCopy(tool.executionMode);
  const interactive = isPdfStudioToolInteractiveForPublic(tool);
  const tier = getPdfStudioTierBadgeCopy(tool);
  const requiredPlan = getPdfStudioWorkspaceMinimumPlan(tool.id);
  const capabilityTier = getPdfStudioCapabilityTier(tool.id);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[var(--border-strong)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-xl">
                {tool.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                  {tool.title}
                </h1>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {tool.description}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                variant={
                  tool.executionMode === "browser"
                    ? "success"
                    : tool.executionMode === "processing"
                      ? "warning"
                      : "default"
                }
              >
                {execution.badge}
              </Badge>
              <Badge variant="default">{tool.outputLabel}</Badge>
              <Badge variant="default">{buildPdfStudioUploadSummary(tool.id)}</Badge>
              <Badge
                variant={
                  capabilityTier === "free"
                    ? "success"
                    : capabilityTier === "pro"
                      ? "warning"
                      : "default"
                }
              >
                {tier.label}
              </Badge>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--foreground-soft)]">
              {interactive
                ? execution.description
                : `${getPdfStudioToolUpgradeCopy(tool.id)} ${execution.description}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={tool.workspacePath}
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
            >
              Open workspace version
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
              onClick={() =>
                analytics.trackUpgradeIntent({
                  destination: "/pricing",
                  source: "public-tool-shell",
                })
              }
            >
              Need more capacity?
            </Link>
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--muted-foreground)]">
          {interactive
            ? "Stay on this public page to use the tool now. The workspace version adds signed-in history, retained downloads, and team context around the same utility."
            : "This public page is a discovery surface for the workspace lane. Open the signed-in version to run the tool with the right plan and document controls."}
        </p>
      </section>

      {!interactive ? (
        <PdfStudioUpgradeNotice
          toolId={tool.id}
          surface="public"
          requiredPlan={requiredPlan}
          title={
            requiredPlan === "pro"
              ? `${tool.title} runs on the Pro workspace`
              : `${tool.title} runs in the Slipwise workspace`
          }
          description={getPdfStudioToolUpgradeCopy(tool.id)}
          ctaLabel={requiredPlan === "pro" ? "Compare Pro plans" : "Open workspace"}
          ctaHref={requiredPlan === "pro" ? "/pricing" : tool.workspacePath}
          secondaryHref={requiredPlan === "pro" ? tool.workspacePath : "/pricing"}
          secondaryLabel={requiredPlan === "pro" ? "Open workspace route" : "Compare plans"}
        />
      ) : null}

      <PdfStudioSupportNotice surface="public" executionMode={tool.executionMode} />

      <PdfStudioCapabilityMatrix />

      {interactive ? (
        <section className="[&_.pdf-studio-tool-header]:hidden">{children}</section>
      ) : null}
    </div>
  );
}
