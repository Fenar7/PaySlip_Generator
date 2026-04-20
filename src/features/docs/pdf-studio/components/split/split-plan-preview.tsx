"use client";

import { formatBytes } from "@/features/docs/pdf-studio/utils/pdf-size-estimator";
import type { PdfSplitPlan } from "@/features/docs/pdf-studio/utils/pdf-split-planner";

export function SplitPlanPreview({
  plan,
}: {
  plan: PdfSplitPlan;
}) {
  if (plan.segments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 py-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          {plan.warning ?? "Adjust the split settings to preview the output files."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-strong)] bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Output preview
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {plan.heuristic
              ? "Estimated segments based on document analysis. Review them before export."
              : "These output files will be created exactly as previewed."}
          </p>
        </div>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {plan.segments.length} file{plan.segments.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {plan.segments.map((segment, index) => (
          <div
            key={segment.id}
            className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {index + 1}. {segment.label}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Pages {segment.startPage}-{segment.endPage} •{" "}
                  {segment.pageIndices.length} page
                  {segment.pageIndices.length !== 1 ? "s" : ""}
                </p>
              </div>
              {segment.estimatedSizeBytes ? (
                <span className="text-xs text-[var(--muted-foreground)]">
                  ~{formatBytes(segment.estimatedSizeBytes)}
                </span>
              ) : null}
            </div>
            {segment.detail ? (
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {segment.detail}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
