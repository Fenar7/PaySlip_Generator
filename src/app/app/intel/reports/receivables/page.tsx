"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  getReceivablesAging,
  exportReceivablesCSV,
  type AgingBucket,
} from "./actions";
import { formatCurrency } from "@/features/intel/components/report-data-table";

const BUCKET_COLORS: Record<string, string> = {
  "Current (0–30 days)": "bg-emerald-50 border-emerald-200 text-emerald-800",
  "31–60 days": "bg-amber-50 border-amber-200 text-amber-800",
  "61–90 days": "bg-orange-50 border-orange-200 text-orange-800",
  "90+ days": "bg-red-50 border-red-200 text-red-800",
  "No Due Date": "bg-slate-50 border-slate-200 text-slate-700",
};

export default function ReceivablesAgingPage() {
  const [isPending, startTransition] = useTransition();
  const [buckets, setBuckets] = useState<AgingBucket[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  const fetchData = useCallback((cid: string) => {
    startTransition(async () => {
      const result = await getReceivablesAging({
        customerId: cid || undefined,
      });
      setBuckets(result.buckets);
      setGrandTotal(result.grandTotal);
      setLoaded(true);
    });
  }, []);

  const toggleBucket = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleExport = () => {
    startTransition(async () => {
      const csv = await exportReceivablesCSV({
        customerId: customerId || undefined,
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receivables-aging-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  useEffect(() => {
    if (loaded) return;
    fetchData("");
  }, [fetchData, loaded]);

  return (
    <div className="min-h-screen">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/app/intel/reports"
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ← Back to Reports
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Receivables Aging Report
          </h1>
        </div>
        <button
          onClick={handleExport}
          disabled={isPending || grandTotal === 0}
          className="h-9 rounded-lg border border-[var(--border-soft)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:opacity-40 transition-colors"
        >
          Export CSV
        </button>
      </header>

      {/* Customer filter */}
      <div className="mb-6 flex items-end gap-3 rounded-xl border border-[var(--border-soft)] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">
            Customer ID
          </label>
          <input
            type="text"
            placeholder="Filter by customer ID"
            className="h-9 rounded-lg border border-[var(--border-soft)] bg-white px-3 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
        </div>
        <button
          onClick={() => fetchData(customerId)}
          className="h-9 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-white hover:bg-[var(--accent-strong)] transition-colors"
        >
          Apply
        </button>
        <button
          onClick={() => {
            setCustomerId("");
            fetchData("");
          }}
          className="h-9 rounded-lg border border-[var(--border-soft)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] transition-colors"
        >
          Clear
        </button>
      </div>

      {isPending && !loaded ? (
        <div className="flex items-center justify-center py-20 text-[var(--muted-foreground)]">
          Loading…
        </div>
      ) : (
        <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
          {/* Summary cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {buckets.map((b) => {
              const colors =
                BUCKET_COLORS[b.label] ?? "bg-slate-50 border-slate-200 text-slate-700";
              return (
                <div
                  key={b.label}
                  className={`rounded-xl border p-4 ${colors}`}
                >
                  <p className="text-xs font-medium uppercase tracking-wider opacity-75">
                    {b.label}
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {formatCurrency(b.total)}
                  </p>
                  <p className="text-xs opacity-75">
                    {b.count} invoice{b.count !== 1 ? "s" : ""}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Grand total */}
          {loaded && (
            <div className="mb-6 rounded-xl border border-[var(--border-soft)] bg-white p-4 shadow-sm">
              <span className="text-sm text-[var(--muted-foreground)]">
                Grand Total Outstanding:{" "}
              </span>
              <span className="text-lg font-bold text-[var(--foreground)]">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          )}

          {/* Accordion sections */}
          <div className="space-y-4">
            {buckets.map((bucket) => (
              <div
                key={bucket.label}
                className="rounded-xl border border-[var(--border-soft)] bg-white shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleBucket(bucket.label)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--surface-soft)] transition-colors"
                >
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {bucket.label}{" "}
                    <span className="font-normal text-[var(--muted-foreground)]">
                      ({bucket.count} invoices · {formatCurrency(bucket.total)})
                    </span>
                  </span>
                  <svg
                    className={`h-4 w-4 text-[var(--muted-foreground)] transition-transform ${
                      expanded[bucket.label] ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m19.5 8.25-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </button>

                {expanded[bucket.label] && (
                  <div className="border-t border-[var(--border-soft)] overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[var(--surface-soft)]">
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Invoice #
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Customer
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Invoice Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Due Date
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Total
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Paid
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Balance
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                            Days
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bucket.invoices.map((inv) => (
                          <tr
                            key={inv.id}
                            className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-soft)]"
                          >
                            <td className="px-4 py-2">
                              <Link
                                href={`/app/docs/invoices/${inv.id}`}
                                className="text-[var(--accent)] hover:underline"
                              >
                                {inv.invoiceNumber}
                              </Link>
                            </td>
                            <td className="px-4 py-2">{inv.customerName}</td>
                            <td className="px-4 py-2">{inv.invoiceDate}</td>
                            <td className="px-4 py-2">{inv.dueDate ?? "—"}</td>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(inv.totalAmount)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {formatCurrency(inv.amountPaid)}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-red-600">
                              {formatCurrency(inv.balance)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {inv.daysOverdue != null ? inv.daysOverdue : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {loaded && buckets.every((b) => b.count === 0) && (
              <div className="rounded-xl border border-[var(--border-soft)] bg-white p-12 text-center text-[var(--muted-foreground)] shadow-sm">
                No outstanding receivables found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
