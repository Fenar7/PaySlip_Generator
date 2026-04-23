"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlanId } from "@/lib/plans/config";
import {
  clampPdfStudioHistoryLimit,
  getPdfStudioHistoryEntryLimit,
} from "@/features/docs/pdf-studio/lib/plan-gates";
import type { PdfStudioAnalyticsSnapshot } from "@/features/docs/pdf-studio/lib/dashboard";

type PdfStudioDashboardResponse = {
  summary?: PdfStudioAnalyticsSnapshot;
  meta?: {
    historyLimit?: number;
    planId?: PlanId;
  };
};

const EMPTY_SUMMARY: PdfStudioAnalyticsSnapshot = {
  totalJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  activeJobs: 0,
  batchJobs: 0,
  outputItems: 0,
  uniqueTools: 0,
  successRate: null,
  topTools: [],
};

function formatSuccessRate(value: number | null) {
  return value == null ? "—" : `${value}%`;
}

function StatCard(props: {
  label: string;
  value: string | number;
  sublabel: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-soft)] p-4">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
        {props.label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
        {props.value}
      </p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{props.sublabel}</p>
    </div>
  );
}

export function PdfStudioAnalyticsPanel(props: {
  orgId?: string;
  planId?: PlanId;
  planName?: string;
  planLoading: boolean;
}) {
  const requestedLimit = useMemo(
    () =>
      clampPdfStudioHistoryLimit(
        props.planId ?? "starter",
        getPdfStudioHistoryEntryLimit(props.planId ?? "starter"),
      ),
    [props.planId],
  );
  const [summary, setSummary] = useState<PdfStudioAnalyticsSnapshot>(EMPTY_SUMMARY);
  const [historyLimit, setHistoryLimit] = useState(requestedLimit);
  const [loading, setLoading] = useState(Boolean(props.orgId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.orgId) {
      setSummary(EMPTY_SUMMARY);
      setHistoryLimit(0);
      setLoading(false);
      setError(null);
      return;
    }

    if (props.planLoading) {
      setLoading(true);
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/pdf-studio/conversions/history?limit=${requestedLimit}`,
          {
            cache: "no-store",
          },
        );
        if (!response.ok) {
          throw new Error("Could not load PDF Studio activity.");
        }

        const payload = (await response.json()) as PdfStudioDashboardResponse;
        if (cancelled) {
          return;
        }

        setSummary(payload.summary ?? EMPTY_SUMMARY);
        setHistoryLimit(payload.meta?.historyLimit ?? requestedLimit);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setSummary(EMPTY_SUMMARY);
        setHistoryLimit(requestedLimit);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load PDF Studio activity.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [props.orgId, props.planLoading, requestedLimit]);

  const panelSubtitle = props.orgId
    ? `Based on your last ${historyLimit} tracked worker-backed PDF Studio jobs on ${props.planName ?? "your workspace plan"}. Browser-first tools run locally and do not appear here yet.`
    : "Choose an active organization to load tracked PDF Studio processing activity.";

  return (
    <section className="rounded-2xl border border-[var(--border-strong)] bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            PDF Studio activity
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">
            {panelSubtitle}
          </p>
        </div>
        <div className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-medium text-[var(--foreground-soft)]">
          History window: {historyLimit}
        </div>
      </div>

      {!props.orgId ? (
        <p className="mt-5 text-sm text-[var(--muted-foreground)]">
          Select an organization to see recent tracked jobs, success rate, and batch usage.
        </p>
      ) : loading ? (
        <p className="mt-5 text-sm text-[var(--muted-foreground)]">
          Loading tracked PDF Studio activity…
        </p>
      ) : error ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : summary.totalJobs === 0 ? (
        <p className="mt-5 text-sm text-[var(--muted-foreground)]">
          No tracked processing jobs yet. Start an Office conversion or another
          worker-backed PDF Studio task to build recent activity here.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tracked jobs"
              value={summary.totalJobs}
              sublabel={`${summary.activeJobs} active or retrying`}
            />
            <StatCard
              label="Success rate"
              value={formatSuccessRate(summary.successRate)}
              sublabel={`${summary.completedJobs} completed vs ${summary.failedJobs} failed`}
            />
            <StatCard
              label="Output files"
              value={summary.outputItems}
              sublabel="Completed files ready from tracked jobs"
            />
            <StatCard
              label="Batch jobs"
              value={summary.batchJobs}
              sublabel={`${summary.uniqueTools} processing tools used in this window`}
            />
          </div>

          {summary.topTools.length > 0 ? (
            <div className="mt-5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-soft)] p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Most-used tracked tools
              </h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {summary.topTools.map((tool) => (
                  <div
                    key={tool.toolId}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-strong)] bg-white px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-[var(--foreground)]">
                      {tool.title}
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      {tool.count} job{tool.count === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

