import type { Metadata } from "next";
import Link from "next/link";
import {
  getInsightSummaryAction,
  listInsightsAction,
} from "./actions";

export const metadata: Metadata = {
  title: "Insights — SW Intel",
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  CRITICAL: { label: "Critical", color: "text-red-700 bg-red-50 border-red-200", dot: "bg-red-500" },
  HIGH: { label: "High", color: "text-orange-700 bg-orange-50 border-orange-200", dot: "bg-orange-500" },
  MEDIUM: { label: "Medium", color: "text-yellow-700 bg-yellow-50 border-yellow-200", dot: "bg-yellow-500" },
  LOW: { label: "Low", color: "text-blue-700 bg-blue-50 border-blue-200", dot: "bg-blue-500" },
  INFO: { label: "Info", color: "text-slate-600 bg-slate-50 border-slate-200", dot: "bg-slate-400" },
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
  EXPIRED: "Expired",
};

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; severity?: string }>;
}) {
  const params = await searchParams;

  const [summaryResult, listResult] = await Promise.all([
    getInsightSummaryAction(),
    listInsightsAction({
      status: params.status
        ? [params.status as "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED" | "EXPIRED"]
        : ["ACTIVE", "ACKNOWLEDGED"],
    }),
  ]);

  const isPlanGated = !summaryResult.success && summaryResult.error?.includes("plan");

  if (isPlanGated) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="text-5xl">💡</div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">AI Insights require a Pro plan</h2>
        <p className="mt-2 text-sm text-slate-500">
          Upgrade to Pro or Enterprise to unlock AI-powered intelligence across your business.
        </p>
        <Link
          href="/app/billing"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          View Plans
        </Link>
      </div>
    );
  }

  const summary = summaryResult.success ? summaryResult.data : null;
  const insights = listResult.success ? listResult.data : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Insights</h1>
          <p className="mt-1 text-sm text-slate-500">
            AI-powered operational intelligence across receivables, documents, and customers.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const).map((sev) => {
            const cfg = SEVERITY_CONFIG[sev];
            const count = summary.bySeverity[sev] ?? 0;
            return (
              <Link
                key={sev}
                href={`/app/intel/insights?severity=${sev}`}
                className={`flex flex-col gap-1 rounded-xl border px-4 py-3 transition-shadow hover:shadow-md ${cfg.color}`}
              >
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                <span className="text-2xl font-bold">{count}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { label: "Active", params: "status=ACTIVE" },
          { label: "Acknowledged", params: "status=ACKNOWLEDGED" },
          { label: "Resolved", params: "status=RESOLVED" },
          { label: "All Open", params: "" },
        ].map(({ label, params: p }) => (
          <Link
            key={label}
            href={`/app/intel/insights?${p}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Insights list */}
      {insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <div className="text-4xl">✅</div>
          <p className="mt-3 text-sm font-medium text-slate-600">No active insights</p>
          <p className="mt-1 text-xs text-slate-400">
            Insights appear here when the intelligence engine detects patterns worth acting on.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {insights.map((insight) => {
            const sevCfg = SEVERITY_CONFIG[insight.severity];
            return (
              <Link
                key={insight.id}
                href={`/app/intel/insights/${insight.id}`}
                className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <span className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${sevCfg.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{insight.title}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${sevCfg.color}`}
                    >
                      {sevCfg.label}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.65rem] text-slate-500">
                      {STATUS_LABELS[insight.status] ?? insight.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{insight.summary}</p>
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(insight.lastDetectedAt)}</p>
                </div>
                <span className="flex-shrink-0 text-xs text-slate-400">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

