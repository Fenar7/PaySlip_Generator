"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { KPICard } from "@/features/intel/components/kpi-card";
import { RevenueTrendChart } from "@/features/intel/components/revenue-trend-chart";
import {
  getDashboardKPIs,
  getRevenueTrendData,
  getRecentActivity,
  type DashboardKPIs,
  type RevenueTrendPoint,
  type ActivityEntry,
} from "@/app/app/intel/dashboard/actions";

// ── Helpers ────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtNum(value: number): string {
  return value.toLocaleString("en-IN");
}

function timeAgo(date: Date | string): string {
  const now = Date.now();
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Date range options ─────────────────────────────────────────────────

const DATE_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-quarter", label: "This Quarter" },
  { value: "this-year", label: "This Year" },
] as const;

// ── Component ──────────────────────────────────────────────────────────

export function DashboardClient() {
  const [range, setRange] = useState("this-month");
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [trend, setTrend] = useState<RevenueTrendPoint[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(
    (preset: string) => {
      startTransition(async () => {
        const [kpiResult, trendResult, activityResult] = await Promise.all([
          getDashboardKPIs(preset),
          getRevenueTrendData(),
          getRecentActivity(),
        ]);

        if (kpiResult.success) setKpis(kpiResult.data);
        if (trendResult.success) setTrend(trendResult.data);
        if (activityResult.success) setActivity(activityResult.data);
      });
    },
    [startTransition]
  );

  useEffect(() => {
    loadData(range);
  }, [range, loadData]);

  function handleRangeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setRange(e.target.value);
  }

  const k = kpis ?? {
    pay: { invoicesIssued: 0, totalDue: 0, overdue: 0, paidThisMonth: 0 },
    voucher: { voucherSpend: 0, voucherCount: 0, receiptTotal: 0 },
    salary: { pendingTotal: 0, released: 0, headcount: 0 },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Your organization at a glance
          </p>
        </div>
        <select
          value={range}
          onChange={handleRangeChange}
          disabled={isPending}
          className="h-9 rounded-lg border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--foreground)] shadow-sm outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
        >
          {DATE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Loading overlay */}
      <div className={isPending ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"}>
        {/* Pay Section */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Pay — Invoices
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              icon="📄"
              label="Invoices Issued"
              value={fmtNum(k.pay.invoicesIssued)}
              subtitle="in selected period"
            />
            <KPICard
              icon="💰"
              label="Total Due"
              value={fmt(k.pay.totalDue)}
              subtitle="outstanding balance"
            />
            <KPICard
              icon="⚠️"
              label="Overdue"
              value={fmt(k.pay.overdue)}
              subtitle="needs attention"
            />
            <KPICard
              icon="✅"
              label="Paid"
              value={fmt(k.pay.paidThisMonth)}
              subtitle="in selected period"
            />
          </div>
        </section>

        {/* Voucher Section */}
        <section className="mt-8 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Vouchers
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard
              icon="📤"
              label="Voucher Spend"
              value={fmt(k.voucher.voucherSpend)}
              subtitle="payments made"
            />
            <KPICard
              icon="🔢"
              label="Voucher Count"
              value={fmtNum(k.voucher.voucherCount)}
              subtitle="total vouchers"
            />
            <KPICard
              icon="📥"
              label="Receipt Total"
              value={fmt(k.voucher.receiptTotal)}
              subtitle="receipts received"
            />
          </div>
        </section>

        {/* Salary Section */}
        <section className="mt-8 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Salary
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard
              icon="⏳"
              label="Pending Total"
              value={fmt(k.salary.pendingTotal)}
              subtitle="draft & pending slips"
            />
            <KPICard
              icon="🚀"
              label="Released"
              value={fmt(k.salary.released)}
              subtitle="in selected period"
            />
            <KPICard
              icon="👥"
              label="Headcount"
              value={fmtNum(k.salary.headcount)}
              subtitle="unique employees"
            />
          </div>
        </section>

        {/* Revenue Trend Chart */}
        <section className="mt-8">
          <RevenueTrendChart data={trend} />
        </section>

        {/* Recent Activity Feed */}
        <section className="mt-8 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Recent Activity
          </h2>
          <div className="rounded-xl border border-[var(--border-soft)] bg-white shadow-sm">
            {activity.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  No activity yet. Actions across the platform will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-soft)]">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-sm">
                      {entry.docType === "invoice"
                        ? "📄"
                        : entry.docType === "voucher"
                          ? "📋"
                          : entry.docType === "salary_slip"
                            ? "💳"
                            : "📌"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--foreground)]">
                        <span className="font-medium">{entry.actorName}</span>{" "}
                        {entry.event}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
