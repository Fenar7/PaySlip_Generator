import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAiUsageDashboardAction, listRecentAiJobsAction } from "./actions";

export const metadata: Metadata = {
  title: "AI Usage & Governance — SW Intel",
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    COMPLETED: "text-green-700 bg-green-50 border-green-200",
    RUNNING: "text-blue-700 bg-blue-50 border-blue-200",
    FAILED: "text-red-700 bg-red-50 border-red-200",
    PENDING: "text-slate-600 bg-slate-50 border-slate-200",
    CANCELLED: "text-orange-700 bg-orange-50 border-orange-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${config[status] ?? "text-slate-600 bg-slate-50 border-slate-200"}`}
    >
      {status}
    </span>
  );
}

function HealthIndicator({ healthy }: { healthy: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${healthy ? "bg-green-500" : "bg-red-500"}`}
        aria-hidden="true"
      />
      <span className={healthy ? "text-green-700" : "text-red-700"}>
        {healthy ? "Healthy" : "Unavailable"}
      </span>
    </span>
  );
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function AiUsagePage() {
  const [summaryResult, jobsResult] = await Promise.all([
    getAiUsageDashboardAction(),
    listRecentAiJobsAction(),
  ]);

  if (!summaryResult.success) {
    if (summaryResult.error.includes("plan")) {
      redirect("/app/intel");
    }
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{summaryResult.error}</p>
      </div>
    );
  }

  const { totalThisMonth, successRate, byFeature, providerHealth, planLimits } = summaryResult.data;
  const jobs = jobsResult.success ? jobsResult.jobs : [];

  const limitLabel =
    planLimits.aiRunsPerMonth === Infinity || planLimits.aiRunsPerMonth === -1
      ? "Unlimited"
      : planLimits.aiRunsPerMonth.toString();

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AI Usage &amp; Governance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor AI provider health, monthly usage, and recent AI job history.
        </p>
      </div>

      {/* Provider health + plan limits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 p-4 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Provider Health</p>
          <HealthIndicator healthy={providerHealth.healthy} />
          {!providerHealth.healthy && providerHealth.error && (
            <p className="text-xs text-slate-500 mt-1">{providerHealth.error}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            {providerHealth.provider} · checked {timeAgo(providerHealth.checkedAt)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 p-4 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">This Month</p>
          <p className="text-2xl font-semibold text-slate-900">{totalThisMonth}</p>
          <p className="text-xs text-slate-500 mt-1">
            of {limitLabel} AI runs · {(successRate * 100).toFixed(0)}% success rate
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 p-4 bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-2">Plan Features</p>
          <ul className="space-y-1">
            {[
              { label: "Document Intelligence", enabled: planLimits.documentIntelligence },
              { label: "AI Insights", enabled: planLimits.aiInsights },
              { label: "Anomaly Detection", enabled: planLimits.anomalyDetection },
            ].map(({ label, enabled }) => (
              <li key={label} className="flex items-center gap-1.5 text-xs">
                <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-green-500" : "bg-slate-300"}`} />
                <span className={enabled ? "text-slate-700" : "text-slate-400"}>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Usage by feature */}
      {byFeature.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-medium text-slate-800">Usage by Feature — This Month</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Feature</th>
                <th className="px-4 py-2 text-right font-medium">Calls</th>
                <th className="px-4 py-2 text-right font-medium">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byFeature.map((row) => (
                <tr key={row.feature} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700 font-mono text-xs">{row.feature}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{row.count}</td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={
                        row.successRate >= 0.9
                          ? "text-green-700"
                          : row.successRate >= 0.7
                            ? "text-yellow-700"
                            : "text-red-700"
                      }
                    >
                      {(row.successRate * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent AI jobs */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-medium text-slate-800">Recent AI Jobs</h2>
        </div>
        {jobs.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">
            No AI jobs recorded yet. Jobs appear here after extraction, insight, or anomaly runs.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Feature</th>
                <th className="px-4 py-2 text-left font-medium">Provider / Model</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Started</th>
                <th className="px-4 py-2 text-left font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700 font-mono text-xs">{job.feature}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">
                    {job.provider} / {job.model}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{timeAgo(job.startedAt)}</td>
                  <td className="px-4 py-2 text-red-600 text-xs max-w-xs truncate" title={job.errorMessage ?? ""}>
                    {job.errorMessage ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
