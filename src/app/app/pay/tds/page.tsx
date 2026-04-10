"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  getTdsRecords,
  exportTdsCsv,
  updateTdsCert,
  markTdsFiled,
  deleteTdsRecord,
  getCurrentFY,
  getCurrentQuarter,
  TDS_SECTIONS,
} from "./actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TdsRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  tdsSection: string;
  tdsRate: number;
  tdsAmount: number;
  certStatus: string;
  certNumber: string | null;
  certDate: Date | null;
  deductorTan: string | null;
  financialYear: string;
  quarter: string;
  notes: string | null;
  createdAt: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const CERT_STATUS_COLORS: Record<string, string> = {
  PENDING_CERT: "bg-yellow-100 text-yellow-700",
  CERT_RECEIVED: "bg-blue-100 text-blue-700",
  FILED: "bg-green-100 text-green-700",
};

const CERT_STATUS_LABELS: Record<string, string> = {
  PENDING_CERT: "Pending",
  CERT_RECEIVED: "Received",
  FILED: "Filed",
};

function generateFYOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const options: string[] = [];
  for (let y = currentYear + 1; y >= currentYear - 3; y--) {
    options.push(`${y - 1}-${y}`);
  }
  return options;
}

// ─── Certificate Dialog ──────────────────────────────────────────────────────

function CertDialog({
  recordId,
  open,
  onClose,
  onSaved,
}: {
  recordId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [certNumber, setCertNumber] = useState("");
  const [certDate, setCertDate] = useState("");
  const [certFilePath, setCertFilePath] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await updateTdsCert({
        tdsRecordId: recordId,
        certNumber,
        certDate,
        certFilePath: certFilePath || undefined,
      });
      if (result.success) {
        setCertNumber("");
        setCertDate("");
        setCertFilePath("");
        onSaved();
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Update TDS Certificate
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Certificate Number *
            </label>
            <input
              type="text"
              required
              value={certNumber}
              onChange={(e) => setCertNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              placeholder="e.g. TDS/2025/00123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Certificate Date *
            </label>
            <input
              type="date"
              required
              value={certDate}
              onChange={(e) => setCertDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              File Path (optional)
            </label>
            <input
              type="text"
              value={certFilePath}
              onChange={(e) => setCertFilePath(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              placeholder="/path/to/certificate.pdf"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save Certificate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TdsPage() {
  const [records, setRecords] = useState<TdsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  // Filters
  const [financialYear, setFinancialYear] = useState(getCurrentFY());
  const [quarter, setQuarter] = useState("");
  const [certStatusFilter, setCertStatusFilter] = useState("");

  // Dialog
  const [certDialogRecordId, setCertDialogRecordId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const fyOptions = generateFYOptions();

  async function loadRecords() {
    setLoading(true);
    setError("");
    const result = await getTdsRecords({
      financialYear: financialYear || undefined,
      quarter: quarter || undefined,
      certStatus: certStatusFilter || undefined,
    });
    if (result.success) {
      setRecords(result.data as TdsRow[]);
      setUpgradeRequired(false);
    } else {
      if (result.error.includes("Starter plan")) {
        setUpgradeRequired(true);
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialYear, quarter, certStatusFilter]);

  function handleMarkFiled(id: string) {
    startTransition(async () => {
      const result = await markTdsFiled(id);
      if (result.success) {
        loadRecords();
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTdsRecord(id);
      if (result.success) {
        loadRecords();
      } else {
        setError(result.error);
      }
    });
  }

  function handleExportCsv() {
    startTransition(async () => {
      const result = await exportTdsCsv({
        financialYear,
        quarter: quarter || undefined,
      });
      if (result.success) {
        const blob = new Blob([result.data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tds-${financialYear}${quarter ? `-${quarter}` : ""}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setError(result.error);
      }
    });
  }

  // ─── Summary Cards ─────────────────────────────────────────────────────────

  const totalTds = records.reduce((sum, r) => sum + r.tdsAmount, 0);
  const pendingCount = records.filter((r) => r.certStatus === "PENDING_CERT").length;
  const filedCount = records.filter((r) => r.certStatus === "FILED").length;

  // ─── Upgrade Gate ──────────────────────────────────────────────────────────

  if (upgradeRequired) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-6">
            TDS Management
          </h1>
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900">
              Upgrade to Starter
            </h3>
            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              TDS tracking is available on the Starter plan and above.
              Upgrade to manage TDS deductions, certificates, and filing.
            </p>
            <Link
              href="/app/settings/billing"
              className="mt-6 inline-flex items-center rounded-lg bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Upgrade Plan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              TDS Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track TDS deductions, certificates, and filing status
            </p>
          </div>
          <button
            onClick={handleExportCsv}
            disabled={isPending || records.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          >
            {fyOptions.map((fy) => (
              <option key={fy} value={fy}>
                FY {fy}
              </option>
            ))}
          </select>

          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          >
            <option value="">All Quarters</option>
            <option value="Q1">Q1 (Apr–Jun)</option>
            <option value="Q2">Q2 (Jul–Sep)</option>
            <option value="Q3">Q3 (Oct–Dec)</option>
            <option value="Q4">Q4 (Jan–Mar)</option>
          </select>

          <select
            value={certStatusFilter}
            onChange={(e) => setCertStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_CERT">Pending</option>
            <option value="CERT_RECEIVED">Received</option>
            <option value="FILED">Filed</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
          <div className="rounded-lg border bg-white p-5 border-slate-200">
            <p className="text-sm font-medium text-slate-500">Total TDS Amount</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {formatCurrency(totalTds)}
            </p>
          </div>
          <div className="rounded-lg border p-5 bg-yellow-50 border-yellow-200">
            <p className="text-sm font-medium text-yellow-700">Pending Certificates</p>
            <p className="text-2xl font-bold text-yellow-900 mt-1">{pendingCount}</p>
          </div>
          <div className="rounded-lg border p-5 bg-green-50 border-green-200">
            <p className="text-sm font-medium text-green-700">Filed</p>
            <p className="text-2xl font-bold text-green-900 mt-1">{filedCount}</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading TDS records…</div>
        ) : records.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900">No TDS records found</h3>
            <p className="mt-1 text-sm text-slate-500">
              TDS deductions will appear here when added to invoices.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Section
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Cert #
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {records.map((r) => {
                  const sectionInfo =
                    TDS_SECTIONS[r.tdsSection as keyof typeof TDS_SECTIONS];
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/docs/invoices/${r.invoiceId}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {r.invoiceNumber}
                        </Link>
                        <p className="text-xs text-slate-400">{r.invoiceDate}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {sectionInfo?.label ?? r.tdsSection}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">
                        {r.tdsRate}%
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                        {formatCurrency(r.tdsAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            CERT_STATUS_COLORS[r.certStatus] ?? "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {CERT_STATUS_LABELS[r.certStatus] ?? r.certStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {r.certNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.certStatus === "PENDING_CERT" && (
                            <>
                              <button
                                onClick={() => setCertDialogRecordId(r.id)}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800"
                              >
                                Update Cert
                              </button>
                              <button
                                onClick={() => handleDelete(r.id)}
                                disabled={isPending}
                                className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {r.certStatus === "CERT_RECEIVED" && (
                            <button
                              onClick={() => handleMarkFiled(r.id)}
                              disabled={isPending}
                              className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50"
                            >
                              Mark Filed
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Certificate Dialog */}
        {certDialogRecordId && (
          <CertDialog
            recordId={certDialogRecordId}
            open={true}
            onClose={() => setCertDialogRecordId(null)}
            onSaved={loadRecords}
          />
        )}
      </div>
    </div>
  );
}
