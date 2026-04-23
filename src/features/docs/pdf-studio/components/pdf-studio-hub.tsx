"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { useActiveOrg } from "@/hooks/use-active-org";
import { usePlan } from "@/hooks/use-plan";
import { cn } from "@/lib/utils";
import { PdfStudioAnalyticsPanel } from "@/features/docs/pdf-studio/components/pdf-studio-analytics-panel";
import { PdfStudioCapabilityMatrix } from "@/features/docs/pdf-studio/components/pdf-studio-capability-matrix";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import {
  getPdfStudioRetentionLabel,
  getPdfStudioTierLabel,
} from "@/features/docs/pdf-studio/lib/plan-gates";
import {
  getPdfStudioExecutionCopy,
  getPdfStudioTierBadgeCopy,
  listPdfStudioToolsByCategory,
} from "@/features/docs/pdf-studio/lib/tool-registry";
import type { PdfStudioToolDefinition } from "@/features/docs/pdf-studio/lib/tool-registry";
import type { PdfStudioToolSurface } from "@/features/docs/pdf-studio/types";

type PdfStudioHubCategories = ReturnType<typeof listPdfStudioToolsByCategory>;
type PdfStudioHubPlan = ReturnType<typeof usePlan>["plan"];

function ToolCard({
  surface,
  tool,
}: {
  surface: PdfStudioToolSurface;
  tool: PdfStudioToolDefinition;
}) {
  const href = surface === "public" ? tool.publicPath : tool.workspacePath;
  const execution = getPdfStudioExecutionCopy(tool.executionMode);
  const tier = getPdfStudioTierBadgeCopy(tool);

  return (
    <Link
      href={href}
      className={cn(
        "group relative block rounded-xl border border-[var(--border-strong)] bg-white p-4 shadow-[var(--shadow-card)] transition-all hover:border-[var(--accent)] hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-xl">
          {tool.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              {tool.title}
            </h3>
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
            <Badge
              variant={
                tier.tier === "free"
                  ? "success"
                  : tier.tier === "pro"
                    ? "warning"
                    : "default"
              }
            >
              {tier.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {tool.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            <span>{tool.outputLabel}</span>
            <span aria-hidden="true">•</span>
            <span>
              {tool.limits.maxFiles === 1
                ? "1 file"
                : `Up to ${tool.limits.maxFiles} files`}
            </span>
            {tool.limits.maxPages ? (
              <>
                <span aria-hidden="true">•</span>
                <span>Up to {tool.limits.maxPages} pages</span>
              </>
            ) : null}
          </div>
        </div>
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
}

function PdfStudioHubContent({
  surface,
  categories,
  analytics,
  activeOrgId,
  plan,
  planLoading = false,
}: {
  surface: PdfStudioToolSurface;
  categories: PdfStudioHubCategories;
  analytics: ReturnType<typeof usePdfStudioAnalytics>;
  activeOrgId?: string;
  plan?: PdfStudioHubPlan;
  planLoading?: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[var(--border-strong)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[0_1px_3px_rgba(220,38,38,0.3)]">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 3h8l4 4v14H7z" />
                  <path d="M15 3v4h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
                  PDF Studio
                </h1>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {surface === "public"
                    ? "Crawlable PDF utility hub for the public-ready catalog, with shared limits and clear browser-vs-processing guidance."
                    : "Workspace catalog for every live PDF Studio tool — no hidden routes and no false 'Soon' states."}
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--foreground-soft)]">
              {surface === "public"
                ? "Browse every public-ready tool, use browser-safe utilities directly, and move into the Slipwise workspace when you need signed-in docs workflows."
                : "Everything listed here links to a real PDF Studio route. Use the public hub for discovery and shareable landing pages, or stay in the workspace for document work inside SW> Docs."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {surface === "public" ? (
              <>
                <Link
                  href="/app/docs/pdf-studio"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
                >
                  Open workspace
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
                  onClick={() =>
                    analytics.trackUpgradeIntent({ destination: "/pricing" })
                  }
                >
                  See plans
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/app/docs/pdf-studio/readiness"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
                >
                  Readiness &amp; diagnostics
                </Link>
                <Link
                  href="/pdf-studio"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
                >
                  Browse public hub
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <PdfStudioCapabilityMatrix />

        <section className="rounded-2xl border border-[var(--border-strong)] bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {surface === "public" ? "Capacity and upgrade lane" : "Your PDF Studio plan"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {surface === "public"
              ? "Public tools stay browser-first. Slipwise workspace adds recent history, and Pro unlocks Office conversions, batch jobs, repair, and longer download retention."
              : planLoading
                ? "Checking your active organization plan…"
                : plan
                  ? `You are on ${getPdfStudioTierLabel(plan.planId === "free" ? "free" : plan.planId === "starter" ? "workspace" : "pro")} (${plan.planName}) with ${getPdfStudioRetentionLabel(plan.planId)} download retention.`
                  : "Pick an active organization to see workspace entitlements, history retention, and upgrade paths."}
          </p>

          <ul className="mt-4 space-y-2 text-sm text-[var(--foreground-soft)]">
            <li>Starter workspace: signed-in tools, recent job history, and 24-hour downloads.</li>
            <li>Pro workspace: Office conversions, tracked batch mode, repair, and longer retention.</li>
            <li>Public lane: browser-first discovery pages and free utility tools without an account.</li>
          </ul>

          <div className="mt-5 flex flex-wrap gap-3">
            {surface === "public" ? (
              <>
                <Link
                  href="/app/docs/pdf-studio"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
                >
                  Open workspace
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
                  onClick={() =>
                    analytics.trackUpgradeIntent({
                      destination: "/pricing",
                      source: "hub-matrix",
                    })
                  }
                >
                  Compare plans
                </Link>
              </>
            ) : plan?.planId === "starter" ? (
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
                onClick={() =>
                  analytics.trackUpgradeIntent({
                    destination: "/pricing",
                    source: "workspace-plan-panel",
                  })
                }
              >
                Upgrade to Pro
              </Link>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-8 space-y-8">
        {surface === "workspace" ? (
          <PdfStudioAnalyticsPanel
            orgId={activeOrgId}
            planId={plan?.planId}
            planName={plan?.planName}
            planLoading={planLoading}
          />
        ) : null}

        {categories.map((category) => (
          <section key={category.id}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              {category.label}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {category.tools.map((tool) => (
                <ToolCard key={tool.id} surface={surface} tool={tool} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function PdfStudioHubPublic() {
  const categories = listPdfStudioToolsByCategory("public");
  const analytics = usePdfStudioAnalytics("hub");

  return (
    <PdfStudioHubContent
      surface="public"
      categories={categories}
      analytics={analytics}
    />
  );
}

function PdfStudioHubWorkspace() {
  const categories = listPdfStudioToolsByCategory("workspace");
  const analytics = usePdfStudioAnalytics("hub");
  const { activeOrg } = useActiveOrg();
  const { plan, loading: planLoading } = usePlan(activeOrg?.id);

  return (
    <PdfStudioHubContent
      surface="workspace"
      categories={categories}
      analytics={analytics}
      activeOrgId={activeOrg?.id}
      plan={plan}
      planLoading={planLoading}
    />
  );
}

export function PdfStudioHub({
  surface = "workspace",
}: {
  surface?: PdfStudioToolSurface;
}) {
  return surface === "public" ? <PdfStudioHubPublic /> : <PdfStudioHubWorkspace />;
}
