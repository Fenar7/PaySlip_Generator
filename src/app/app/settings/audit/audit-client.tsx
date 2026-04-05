"use client";

import { useEffect, useState, useCallback } from "react";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  getAuditLogs,
  exportAuditLogsCSV,
  getAuditActors,
  type AuditLogRow,
} from "./actions";

type Actor = { id: string; name: string; email: string };

const CATEGORIES = ["All", "Access", "Documents", "Settings", "System"];

function entityLink(type: string | null, id: string | null) {
  if (!type || !id) return null;
  const routes: Record<string, string> = {
    Invoice: `/app/invoices/${id}`,
    Voucher: `/app/vouchers/${id}`,
    SalarySlip: `/app/salary/${id}`,
  };
  return routes[type] ?? null;
}

function formatIp(ip: string | null) {
  if (!ip) return "—";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip.slice(0, 12) + "…";
}

export function AuditClient() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [actorId, setActorId] = useState("");
  const [category, setCategory] = useState("All");
  const [proxyOnly, setProxyOnly] = useState(false);
  const [actors, setActors] = useState<Actor[]>([]);

  useEffect(() => {
    getAuditActors().then(setActors).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        actorId: actorId || undefined,
        category: category === "All" ? undefined : category,
        proxyOnly: proxyOnly || undefined,
        page,
      });
      setRows(res.rows);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, actorId, category, proxyOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, actorId, category, proxyOnly]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportAuditLogsCSV({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        actorId: actorId || undefined,
        category: category === "All" ? undefined : category,
        proxyOnly: proxyOnly || undefined,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Audit Log
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Track all actions taken across your organization.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-[var(--border-soft)] bg-white shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
              From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-[var(--border-strong)] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
              To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-[var(--border-strong)] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
              Actor
            </label>
            <select
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              className="rounded-lg border border-[var(--border-strong)] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="">All users</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-[var(--border-strong)] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <label className="inline-flex items-center gap-1.5 text-sm text-[var(--foreground)] cursor-pointer pb-0.5">
            <input
              type="checkbox"
              checked={proxyOnly}
              onChange={(e) => setProxyOnly(e.target.checked)}
              className="rounded border-[var(--border-strong)] accent-[var(--accent)]"
            />
            Proxy only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border-soft)] bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            No audit entries found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-soft)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">
                  Time
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">
                  Actor
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">
                  Action
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">
                  Entity
                </th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted-foreground)]">
                  IP
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const link = entityLink(r.entityType, r.entityId);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors"
                  >
                    <td className="px-4 py-3 text-[var(--muted-foreground)] whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[var(--foreground)]">
                        {r.actorName}
                      </span>
                      {r.representedName && (
                        <span className="text-[var(--muted-foreground)]">
                          {" "}
                          (as{" "}
                          <span className="font-medium">
                            {r.representedName}
                          </span>
                          )
                        </span>
                      )}
                      {r.proxyGrantId && (
                        <Badge variant="warning" className="ml-1.5">
                          Proxy
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {r.actionLabel}
                    </td>
                    <td className="px-4 py-3">
                      {link ? (
                        <a
                          href={link}
                          className="text-[var(--accent)] hover:underline"
                        >
                          {r.entityType}
                        </a>
                      ) : r.entityType ? (
                        <span className="text-[var(--muted-foreground)]">
                          {r.entityType}
                        </span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      <span title={r.ipAddress ?? ""}>
                        {formatIp(r.ipAddress)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
          <span>
            Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of{" "}
            {total}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
