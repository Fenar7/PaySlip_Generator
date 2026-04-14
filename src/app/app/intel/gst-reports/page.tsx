"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpgradeGate } from "@/components/plan/upgrade-gate";
import {
  getGstr1Data,
  getGstr3bSummary,
  exportGstr1Csv,
  getGstHealthCheck,
} from "./actions";
import type { Gstr1Data, Gstr3bSummary, GstHealthIssue } from "./actions";

// ── Helpers ────────────────────────────────────────────────────────────

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getMonthRange(year: number, month: number) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

// ── Tab Button ─────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

// ── GSTR-1 Tab ─────────────────────────────────────────────────────────

function Gstr1Tab({
  data,
  loading,
  onExportCsv,
  onExportJson,
  canExportJson,
}: {
  data: Gstr1Data | null;
  loading: boolean;
  onExportCsv: () => void;
  onExportJson: () => void;
  canExportJson: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-slate-500">Select a date range and load data.</p>;
  }

  const { b2b, b2c, summary } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium text-slate-500">B2B Invoices</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{summary.totalB2b}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium text-slate-500">B2C Invoices</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{summary.totalB2c}</p>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <p className="text-xs font-medium text-slate-500">Total Taxable</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(summary.totalTaxable)}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-slate-500">Total Tax</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatCurrency(summary.totalCgst + summary.totalSgst + summary.totalIgst + summary.totalCess)}
          </p>
        </div>
      </div>

      {summary.missingGstinCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          ⚠️ {summary.missingGstinCount} invoice(s) with customers are missing GSTIN — shown in B2C section.
        </div>
      )}

      {/* Export Button */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/app/intel/gst-filings">
          <Button variant="secondary">Open Filing Workspace</Button>
        </Link>
        {!canExportJson && (
          <p className="text-xs text-slate-500">
            GSTR-1 JSON export is available for a single filing month only.
          </p>
        )}
        <Button variant="secondary" onClick={onExportJson} disabled={!canExportJson}>
          Export JSON
        </Button>
        <Button variant="primary" onClick={onExportCsv}>
          Export CSV
        </Button>
      </div>

      {/* B2B Table */}
      {b2b.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500">
              B2B Invoices
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">GSTIN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">CGST</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">SGST</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">IGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {b2b.flatMap((entry) =>
                  entry.invoices.map((inv) => (
                    <tr key={inv.invoiceNumber} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-mono text-slate-700">{entry.customerGstin}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{entry.customerName}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{inv.invoiceDate}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(inv.cgst)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(inv.sgst)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(inv.igst)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* B2C Table */}
      {b2c.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200">
            <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500">
              B2C Invoices
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Place of Supply</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">CGST</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">SGST</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">IGST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {b2c.map((inv) => (
                  <tr key={inv.invoiceNumber} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{inv.invoiceDate}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{inv.placeOfSupply || "—"}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">{formatCurrency(inv.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(inv.cgst)}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(inv.sgst)}</td>
                    <td className="px-4 py-3 text-sm text-right text-slate-600">{formatCurrency(inv.igst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GSTR-3B Tab ────────────────────────────────────────────────────────

function Gstr3bTab({
  data,
  loading,
}: {
  data: Gstr3bSummary | null;
  loading: boolean;
}) {
  if (loading) {
    return <div className="h-64 rounded-lg bg-slate-100 animate-pulse" />;
  }

  if (!data) {
    return <p className="text-sm text-slate-500">Select a month and load data.</p>;
  }

  const { outwardSupplies, reverseCharge, totalTaxLiability } = data;

  return (
    <div className="space-y-6">
      {/* 3.1 Outward Supplies */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500">
            3.1 — Outward Supplies
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Nature of Supplies</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Taxable Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">IGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">CGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">SGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Cess</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">(a) Outward taxable supplies (B2B)</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.b2b.taxableValue)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.b2b.igst)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.b2b.cgst)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.b2b.sgst)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.b2b.cess)}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">(b) Outward taxable supplies (B2C)</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.b2c.taxableValue)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.b2c.igst)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.b2c.cgst)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.b2c.sgst)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.b2c.cess)}</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700">(c) Nil-rated / Exempt</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(outwardSupplies.nilRatedExempt.taxableValue)}</td>
                <td className="px-4 py-3 text-sm text-right text-slate-400">—</td>
                <td className="px-4 py-3 text-sm text-right text-slate-400">—</td>
                <td className="px-4 py-3 text-sm text-right text-slate-400">—</td>
                <td className="px-4 py-3 text-sm text-right text-slate-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3.1 Reverse Charge */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500">
            3.1 — Reverse Charge Liability
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Taxable Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">IGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">CGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">SGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Cess</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(reverseCharge.taxableValue)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(reverseCharge.igst)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(reverseCharge.cgst)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(reverseCharge.sgst)}</td>
                <td className="px-4 py-3 text-sm text-right">{formatCurrency(reverseCharge.cess)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Total Tax Liability */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-4">
          Total Tax Liability
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">IGST</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalTaxLiability.igst)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">CGST</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalTaxLiability.cgst)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">SGST</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalTaxLiability.sgst)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Cess</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(totalTaxLiability.cess)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Health Check Tab ───────────────────────────────────────────────────

function HealthCheckTab({
  issues,
  loading,
}: {
  issues: GstHealthIssue[] | null;
  loading: boolean;
}) {
  if (loading) {
    return <div className="h-48 rounded-lg bg-slate-100 animate-pulse" />;
  }

  if (!issues) {
    return <p className="text-sm text-slate-500">Loading health check…</p>;
  }

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-green-700 font-medium">✅ No GST issues found — all invoices look good!</p>
      </div>
    );
  }

  const severityVariant: Record<string, "danger" | "warning" | "default"> = {
    error: "danger",
    warning: "warning",
    info: "default",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">{issues.length} issue(s) found across your invoices.</p>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Issue</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {issues.map((issue, idx) => (
                <tr key={`${issue.invoiceId}-${idx}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">
                    <a
                      href={`/app/invoices/${issue.invoiceId}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {issue.invoiceNumber}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{issue.issue}</td>
                  <td className="px-4 py-3">
                    <Badge variant={severityVariant[issue.severity] ?? "default"}>
                      {issue.severity}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function GstReportsPage() {
  const [orgId, setOrgId] = useState("");
  const [activeTab, setActiveTab] = useState<"gstr1" | "gstr3b" | "health">("gstr1");

  // Date controls
  const now = new Date();
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [endYear, setEndYear] = useState(now.getFullYear());
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1);

  // Data
  const [gstr1Data, setGstr1Data] = useState<Gstr1Data | null>(null);
  const [gstr3bData, setGstr3bData] = useState<Gstr3bSummary | null>(null);
  const [healthIssues, setHealthIssues] = useState<GstHealthIssue[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load orgId
  useEffect(() => {
    fetch("/api/org/list")
      .then((r) => r.json())
      .then((d) => { if (d.activeOrgId) setOrgId(d.activeOrgId); })
      .catch(() => {});
  }, []);

  const loadGstr1 = useCallback(async () => {
    setLoading(true);
    setError("");
    const { startDate } = getMonthRange(startYear, startMonth);
    const endRange = getMonthRange(endYear, endMonth);
    const result = await getGstr1Data({ startDate, endDate: endRange.endDate });
    if (result.success) {
      setGstr1Data(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [startYear, startMonth, endYear, endMonth]);

  const loadGstr3b = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await getGstr3bSummary({ month: startMonth, year: startYear });
    if (result.success) {
      setGstr3bData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [startMonth, startYear]);

  const loadHealthCheck = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await getGstHealthCheck();
    if (result.success) {
      setHealthIssues(result.data.issues);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    if (activeTab === "gstr1") loadGstr1();
    else if (activeTab === "gstr3b") loadGstr3b();
    else loadHealthCheck();
  }, [activeTab, loadGstr1, loadGstr3b, loadHealthCheck]);

  const handleExportCsv = useCallback(async () => {
    const { startDate } = getMonthRange(startYear, startMonth);
    const endRange = getMonthRange(endYear, endMonth);
    const result = await exportGstr1Csv({ startDate, endDate: endRange.endDate });
    if (result.success) {
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gstr1-${startYear}${String(startMonth).padStart(2, "0")}-${endYear}${String(endMonth).padStart(2, "0")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [startYear, startMonth, endYear, endMonth]);

  const canExportJson = startYear === endYear && startMonth === endMonth;

  const handleExportJson = useCallback(() => {
    if (!canExportJson) {
      setError("GSTR-1 JSON export requires the start and end month to match.");
      return;
    }

    setError("");
    const period = `${startYear}-${String(startMonth).padStart(2, "0")}`;
    window.open(`/api/export/gstr1?period=${period}`, "_blank", "noopener,noreferrer");
  }, [canExportJson, startYear, startMonth]);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString("en-IN", { month: "short" }),
  }));

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">GST Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Export GSTR-1 and GSTR-3B data for GST return filing
          </p>
        </div>

        <UpgradeGate feature="gstrExport" orgId={orgId} minimumPlan="pro">
          {/* Date Range Picker */}
          <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Start Month</label>
              <div className="flex gap-2">
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            {activeTab !== "health" && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">End Month</label>
                <div className="flex gap-2">
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(Number(e.target.value))}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={endYear}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <Button variant="primary" onClick={handleLoad}>
              {loading ? "Loading…" : "Load Data"}
            </Button>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-slate-200">
            <div className="flex gap-0">
              <TabButton active={activeTab === "gstr1"} onClick={() => setActiveTab("gstr1")}>
                GSTR-1
              </TabButton>
              <TabButton active={activeTab === "gstr3b"} onClick={() => setActiveTab("gstr3b")}>
                GSTR-3B
              </TabButton>
              <TabButton active={activeTab === "health"} onClick={() => setActiveTab("health")}>
                Health Check
              </TabButton>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Tab Content */}
          {activeTab === "gstr1" && (
            <Gstr1Tab
              data={gstr1Data}
              loading={loading}
              onExportCsv={handleExportCsv}
              onExportJson={handleExportJson}
              canExportJson={canExportJson}
            />
          )}
          {activeTab === "gstr3b" && (
            <Gstr3bTab data={gstr3bData} loading={loading} />
          )}
          {activeTab === "health" && (
            <HealthCheckTab issues={healthIssues} loading={loading} />
          )}
        </UpgradeGate>
      </div>
    </div>
  );
}
