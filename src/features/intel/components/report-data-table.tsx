"use client";

import { useCallback } from "react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface ReportDataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSort?: (key: string, dir: "asc" | "desc") => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  /** Optional summary row rendered below the table body */
  summaryRow?: React.ReactNode;
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  ISSUED: "bg-blue-100 text-blue-800",
  VIEWED: "bg-sky-100 text-sky-800",
  DRAFT: "bg-slate-100 text-slate-600",
  DUE: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-red-100 text-red-800",
  PARTIALLY_PAID: "bg-amber-100 text-amber-800",
  DISPUTED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-slate-200 text-slate-500",
  REISSUED: "bg-indigo-100 text-indigo-800",
  draft: "bg-slate-100 text-slate-600",
  approved: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  released: "bg-emerald-100 text-emerald-800",
  payment: "bg-red-100 text-red-700",
  receipt: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ReportDataTable<T extends { [key: string]: any }>({
  columns,
  rows,
  total,
  page,
  pageSize,
  onPageChange,
  onSort,
  sortKey,
  sortDir,
  summaryRow,
}: ReportDataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSort = useCallback(
    (key: string) => {
      if (!onSort) return;
      const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
      onSort(key, newDir);
    },
    [onSort, sortKey, sortDir]
  );

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] ${
                    col.sortable ? "cursor-pointer select-none hover:text-[var(--foreground)]" : ""
                  }`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-[var(--accent)]">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-[var(--muted-foreground)]"
                >
                  No records found
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={String((row as Record<string, unknown>).id ?? i)}
                  className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {summaryRow && (
            <tfoot>
              <tr className="border-t-2 border-[var(--border-soft)] bg-[var(--surface-soft)] font-semibold">
                {summaryRow}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
