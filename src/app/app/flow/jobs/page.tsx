import type { Metadata } from "next";
import { listJobLogs } from "./actions";

export const metadata: Metadata = { title: "Job Execution Log | Slipwise" };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const JOB_NAMES = [
  "mark-overdue",
  "send-scheduled",
  "recurring-generate",
  "send-reminders",
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status}
    </span>
  );
}

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ jobName?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const jobName = params.jobName;
  const status = params.status;
  const page = Number(params.page) || 1;

  const { logs, totalPages } = await listJobLogs({ jobName, status, page });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
          SW&gt; Flow
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Job Execution Log</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Monitor automated job runs for debugging and audit.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Job name filter */}
        <div className="flex gap-2">
          <a
            href="/app/flow/jobs"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !jobName
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-soft)] text-[var(--muted-foreground)] hover:bg-[var(--border-strong)]"
            }`}
          >
            All Jobs
          </a>
          {JOB_NAMES.map((name) => (
            <a
              key={name}
              href={`/app/flow/jobs?jobName=${name}${status ? `&status=${status}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                jobName === name
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-soft)] text-[var(--muted-foreground)] hover:bg-[var(--border-strong)]"
              }`}
            >
              {name}
            </a>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {["ALL", "pending", "completed", "failed"].map((s) => (
            <a
              key={s}
              href={`/app/flow/jobs?${jobName ? `jobName=${jobName}&` : ""}${s === "ALL" ? "" : `status=${s}`}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                (s === "ALL" && !status) || status === s
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-soft)] text-[var(--muted-foreground)] hover:bg-[var(--border-strong)]"
              }`}
            >
              {s === "ALL" ? "All Status" : s}
            </a>
          ))}
        </div>
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[var(--muted-foreground)]">No job logs found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-strong)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-strong)] bg-[var(--surface-soft)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Job Name</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Job ID</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Invoice</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Triggered At</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Completed At</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[var(--border-strong)] last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{log.jobName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                    {log.jobId ? log.jobId.substring(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {log.invoiceId ? log.invoiceId.substring(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {formatDate(log.triggeredAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">
                    {formatDate(log.completedAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-red-600 max-w-xs truncate">
                    {log.error || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/app/flow/jobs?${jobName ? `jobName=${jobName}&` : ""}${status ? `status=${status}&` : ""}page=${p}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                p === page
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-soft)] text-[var(--muted-foreground)] hover:bg-[var(--border-strong)]"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
