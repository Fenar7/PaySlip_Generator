"use client";

import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/* ─────────────────────────────────────────────────────────────────────────── */

interface UsageRow {
  label: string;
  current: number;
  limit: number | null;
  unit?: string;
  isBytes?: boolean;
}

interface Props {
  rows: UsageRow[];
  planName: string;
  periodLabel: string;
}

/* ─────────────────────────────────────────────────────────────────────────── */

function toNumber(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "number") return v;
  if (typeof v === "string" && !Number.isNaN(Number(v))) return Number(v);
  return 0;
}

function pct(current: unknown, limit: unknown): number {
  const c = toNumber(current);
  const l = toNumber(limit);
  if (l === 0) return 0;
  return Math.min(100, Math.round((c / l) * 100));
}

function displayValue(value: unknown, isBytes?: boolean): string {
  const n = toNumber(value);
  if (isBytes) return formatBytes(n);
  return n.toLocaleString("en-IN");
}

function displayLimit(limit: unknown, isBytes?: boolean): string {
  if (limit === null || limit === undefined) return "Unlimited";
  const l = toNumber(limit);
  if (isBytes) return formatBytes(l);
  return l.toLocaleString("en-IN");
}

/* ── Icons ───────────────────────────────────────────────────────────────── */

const ICONS: Record<string, { svg: ReactNode; group: string }> = {
  "Invoices (active)": {
    group: "Documents",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M9 12h.01M9 16h.01M13 16h.01M13 12h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM5 6h14M5 10h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "Quotes (active)": {
    group: "Documents",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M9 7h6M9 11h6M9 15h4M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  Vouchers: {
    group: "Documents",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "Salary Slips": {
    group: "Documents",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "Team Members": {
    group: "Team & Access",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "Active Portal Sessions": {
    group: "Team & Access",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M15 7h.01M15 11h.01M15 15h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2zM9 7h.01M9 11h.01M9 15h.01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "Storage Used": {
    group: "Storage & Media",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zM4 7h16M12 11v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "Pixel Jobs Saved": {
    group: "Storage & Media",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "Webhook Calls (this month)": {
    group: "Platform",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  "Active Share Bundles": {
    group: "Platform",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

const GROUP_ICONS: Record<string, ReactNode> = {
  Documents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M9 12h.01M9 16h.01M13 16h.01M13 12h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  "Team & Access": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  "Storage & Media": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7zM4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  Platform: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
};

const GROUP_ORDER = ["Documents", "Team & Access", "Storage & Media", "Platform"];

/* ── UI helpers ──────────────────────────────────────────────────────────── */

function statusColor(p: number, isUnlimited: boolean): { bg: string; text: string; bar: string } {
  if (isUnlimited) return { bg: "bg-slate-50", text: "text-slate-600", bar: "bg-slate-300" };
  if (p >= 90) return { bg: "bg-red-50", text: "text-red-600", bar: "bg-red-500" };
  if (p >= 70) return { bg: "bg-amber-50", text: "text-amber-600", bar: "bg-amber-500" };
  return { bg: "bg-emerald-50", text: "text-emerald-600", bar: "bg-emerald-500" };
}

function MetricCard({ row }: { row: UsageRow }) {
  const meta = ICONS[row.label] ?? { group: "Platform", svg: null };
  const p = pct(row.current, row.limit);
  const isUnlimited = row.limit === null;
  const colors = statusColor(p, isUnlimited);

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-white p-4 shadow-[var(--shadow-card)] transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}>
          {meta.svg}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{row.label}</p>
          <p className="mt-0.5 text-lg font-semibold text-[var(--text-primary)]">
            {displayValue(row.current, row.isBytes)}
            <span className="text-sm font-normal text-[var(--text-muted)]">
              {" "}/ {displayLimit(row.limit, row.isBytes)}
            </span>
          </p>
        </div>
        {!isUnlimited && (
          <span className={`shrink-0 text-xs font-semibold ${colors.text}`}>{p}%</span>
        )}
        {isUnlimited && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
            Unlimited
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]">
        {isUnlimited ? (
          <div className="h-full w-full bg-slate-200" />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${p}%` }}
          />
        )}
      </div>

      {/* Status text */}
      {!isUnlimited && p >= 90 && (
        <p className="mt-2 text-[0.7rem] font-medium text-red-600">
          At {p}% of limit —{" "}
          <a href="/app/settings/billing" className="underline hover:text-red-700">Upgrade</a>
        </p>
      )}
      {!isUnlimited && p >= 70 && p < 90 && (
        <p className="mt-2 text-[0.7rem] font-medium text-amber-600">Approaching limit ({p}% used)</p>
      )}
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */

export function UsageDashboardClient({ rows, planName, periodLabel }: Props) {
  /* Group rows */  
  const groups: Record<string, UsageRow[]> = {};
  for (const row of rows) {
    const g = ICONS[row.label]?.group ?? "Platform";
    groups[g] = groups[g] ?? [];
    groups[g].push(row);
  }

  /* Summary stats */
  const limitedRows = rows.filter((r) => r.limit !== null);
  const totalLimits = limitedRows.length;
  const nearLimit = limitedRows.filter((r) => {
    const p = pct(r.current, r.limit);
    return p >= 70;
  }).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Billing Period
          </p>
          <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {nearLimit > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {nearLimit} limit{nearLimit > 1 ? "s" : ""} near capacity
            </span>
          )}
          <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1 text-sm font-semibold capitalize text-[var(--text-primary)]">
            {planName} Plan
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-soft)] bg-white p-4 text-center shadow-[var(--shadow-card)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Total Limits</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{totalLimits}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-soft)] bg-white p-4 text-center shadow-[var(--shadow-card)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Near Limit</p>
          <p className={`mt-1 text-2xl font-bold ${nearLimit > 0 ? "text-red-500" : "text-[var(--text-primary)]"}`}>{nearLimit}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-soft)] bg-white p-4 text-center shadow-[var(--shadow-card)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Unlimited</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{rows.filter((r) => r.limit === null).length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-soft)] bg-white p-4 text-center shadow-[var(--shadow-card)]">
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Active Metrics</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{rows.filter((r) => r.current > 0).length}</p>
        </div>
      </div>

      {/* Grouped metric cards */}
      <div className="space-y-8">
        {GROUP_ORDER.filter((g) => groups[g]?.length > 0).map((groupName) => (
          <section key={groupName} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)]">{GROUP_ICONS[groupName]}</span>
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {groupName}
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups[groupName].map((row) => (
                <MetricCard key={row.label} row={row} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)]/40 p-4 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Need more capacity?{" "}
          <a href="/app/settings/billing" className="font-medium text-[var(--brand-primary)] underline underline-offset-2 hover:text-[var(--brand-primary)]/80">
            Compare plans and upgrade →
          </a>
        </p>
      </div>
    </div>
  );
}
