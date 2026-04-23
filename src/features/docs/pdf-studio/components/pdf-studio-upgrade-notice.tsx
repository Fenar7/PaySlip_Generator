"use client";

import Link from "next/link";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";

export function PdfStudioUpgradeNotice({
  toolId,
  title,
  description,
  ctaLabel,
  ctaHref = "/pricing",
  secondaryHref,
  secondaryLabel,
  requiredPlan,
  surface,
}: {
  toolId: PdfStudioToolId;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  requiredPlan: "starter" | "pro";
  surface: "public" | "workspace";
}) {
  const analytics = usePdfStudioAnalytics(toolId);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
          {requiredPlan === "pro" ? "⭐" : "🔒"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-amber-900/90">{description}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
              onClick={() =>
                analytics.trackUpgradeIntent({
                  destination: ctaHref,
                  requiredPlan,
                  surface,
                })
              }
            >
              {ctaLabel}
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-100"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
