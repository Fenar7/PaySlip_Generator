"use client";

import type { SequenceSnapshotEntry } from "../services/sequence-history";

const CHANGE_TYPE_LABELS: Record<string, string> = {
  CREATED: "Created",
  UPDATED: "Updated",
  DEACTIVATED: "Deactivated",
  REACTIVATED: "Reactivated",
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  CREATED: "bg-green-100 text-green-700",
  UPDATED: "bg-blue-100 text-blue-700",
  DEACTIVATED: "bg-slate-100 text-slate-600",
  REACTIVATED: "bg-emerald-100 text-emerald-700",
};

const PERIOD_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-100 text-slate-500",
};

interface SequenceSnapshotViewProps {
  snapshot: SequenceSnapshotEntry;
  current?: {
    name: string;
    periodicity: string;
    isActive: boolean;
    formatString: string;
    startCounter: number;
    counterPadding: number;
    totalConsumed: number;
  } | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function diffHighlight(current: string | undefined, snapshot: string): string {
  if (current === undefined) return "";
  return current !== snapshot ? "bg-amber-50 border-l-2 border-amber-400 pl-2" : "";
}

export function SequenceSnapshotView({ snapshot, current }: SequenceSnapshotViewProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Version {snapshot.version}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CHANGE_TYPE_COLORS[snapshot.changeType] ?? "bg-slate-100 text-slate-600"}`}
              >
                {CHANGE_TYPE_LABELS[snapshot.changeType] ?? snapshot.changeType}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatDateTime(snapshot.createdAt)}
              {snapshot.changedBy && ` by ${snapshot.changedBy.name}`}
            </p>
          </div>
          {!snapshot.isActive && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              Inactive
            </span>
          )}
        </div>
        {snapshot.changeSummary && (
          <p className="mt-2 text-sm text-slate-600">{snapshot.changeSummary}</p>
        )}
        {snapshot.changeNote && (
          <p className="mt-1 text-xs text-slate-400">{snapshot.changeNote}</p>
        )}
      </div>

      {/* Config details */}
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Name</p>
          <p className={`mt-1 text-sm font-medium text-slate-900 ${current ? diffHighlight(current.name, snapshot.name) : ""}`}>
            {snapshot.name}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Document Type</p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {snapshot.documentType === "INVOICE" ? "Invoice" : "Voucher"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Periodicity</p>
          <p className={`mt-1 text-sm font-medium text-slate-900 ${current ? diffHighlight(current.periodicity, snapshot.periodicity) : ""}`}>
            {snapshot.periodicity.replace(/_/g, " ")}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Format String</p>
          <p className={`mt-1 text-sm font-mono text-slate-900 ${current ? diffHighlight(current.formatString, snapshot.formatString) : ""}`}>
            {snapshot.formatString}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Start Counter</p>
          <p className={`mt-1 text-sm font-medium text-slate-900 ${current && current.startCounter !== snapshot.startCounter ? "bg-amber-50 border-l-2 border-amber-400 pl-2" : ""}`}>
            {snapshot.startCounter}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Counter Padding</p>
          <p className={`mt-1 text-sm font-medium text-slate-900 ${current && current.counterPadding !== snapshot.counterPadding ? "bg-amber-50 border-l-2 border-amber-400 pl-2" : ""}`}>
            {snapshot.counterPadding}
          </p>
        </div>
      </div>

      {/* Periods table */}
      {snapshot.periodsSnapshot.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            Period Windows ({snapshot.periodsSnapshot.length})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Start</th>
                  <th className="pb-2 font-medium">End</th>
                  <th className="pb-2 text-right font-medium">Counter</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.periodsSnapshot.map((period) => (
                  <tr key={period.periodId} className="border-b border-slate-50">
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${PERIOD_STATUS_COLORS[period.status] ?? "bg-slate-100 text-slate-500"}`}
                      >
                        {period.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-700">{period.startDate}</td>
                    <td className="py-2 pr-4 text-slate-700">{period.endDate}</td>
                    <td className="py-2 text-right font-mono font-medium text-slate-900">
                      {period.currentCounter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Total consumed */}
      <div className="border-t border-slate-100 px-5 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Total Consumed
          </p>
          <p className={`text-sm font-mono font-semibold text-slate-900 ${current && current.totalConsumed !== snapshot.totalConsumed ? "bg-amber-50 border-l-2 border-amber-400 pl-2" : ""}`}>
            {snapshot.totalConsumed.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
