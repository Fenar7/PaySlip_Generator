"use client";

import { useEffect, useState } from "react";
import { getTdsRecords } from "@/app/app/pay/tds/actions";

type TdsRecord = {
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
};

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

export default function TdsLedgerPage() {
  const [records, setRecords] = useState<TdsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fy, setFy] = useState<string>(() => {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${year}-${year + 1}`;
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    getTdsRecords({ financialYear: fy }).then((result) => {
      if (result.success) setRecords(result.data);
    }).finally(() => setLoading(false));
  }, [fy]);

  const filteredRecords = records.filter((r) =>
    statusFilter === "all" ? true : r.certStatus === statusFilter
  );

  const totalTds = filteredRecords.reduce((s, r) => s + r.tdsAmount, 0);

  // Compute section summary from records
  const sectionSummary = Object.values(
    filteredRecords.reduce<Record<string, { section: string; total: number; count: number }>>(
      (acc, r) => {
        const key = r.tdsSection;
        acc[key] ??= { section: key, total: 0, count: 0 };
        acc[key].total += r.tdsAmount;
        acc[key].count++;
        return acc;
      },
      {}
    )
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">TDS Ledger</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tax deducted at source — track certificates and filings
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={fy}
          onChange={(e) => setFy(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          {[2025, 2024, 2023].map((y) => (
            <option key={y} value={`${y}-${y + 1}`}>{`FY ${y}-${y + 1}`}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="PENDING_CERT">Pending Certificate</option>
          <option value="CERT_RECEIVED">Certificate Received</option>
          <option value="FILED">Filed</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total TDS ({fy})</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{formatINR(totalTds)}</p>
        </div>
        {sectionSummary.map((s) => (
          <div key={s.section} className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{s.section.replace(/_/g, " ")}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{formatINR(s.total)}</p>
            <p className="text-xs text-slate-400">{s.count} entries</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : (
        <div className="rounded-lg border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Invoice</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Section</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Quarter</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Rate</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">TDS Amount</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Cert No.</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No TDS records for the selected period
                  </td>
                </tr>
              )}
              {filteredRecords.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{r.invoiceId.slice(-8)}</td>
                  <td className="px-4 py-3">{r.tdsSection.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">{r.quarter}</td>
                  <td className="px-4 py-3 text-right">{r.tdsRate}%</td>
                  <td className="px-4 py-3 text-right font-medium">{formatINR(r.tdsAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.certStatus === "FILED" ? "bg-green-100 text-green-700" :
                      r.certStatus === "CERT_RECEIVED" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {r.certStatus.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.certNumber ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
