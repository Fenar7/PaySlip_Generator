"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getComplianceDashboard } from "./einvoice/actions";

type DashboardData = Awaited<ReturnType<typeof getComplianceDashboard>>;

function StatCard({ label, value, href, color }: { label: string; value: number | string; href?: string; color?: string }) {
  const inner = (
    <div className={`rounded-lg border bg-white p-5 shadow-sm ${href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function CompliancePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getComplianceDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const eInvoiceByStatus = Object.fromEntries(
    (data?.eInvoiceStats ?? []).map((s) => [s.status, s._count.id])
  );
  const tdsTotal = (data?.tdsStats ?? []).reduce(
    (sum, s) => sum + Number(s._sum?.tdsAmount ?? 0),
    0
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Compliance</h1>
        <p className="text-sm text-slate-500 mt-1">
          GST reconciliation, E-Invoicing, and TDS tracking
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : (
        <>
          {/* E-Invoice */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">E-Invoicing (IRN)</h2>
              <Link href="/app/settings/compliance/einvoice" className="text-xs text-blue-600 hover:underline">
                Configure →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Generated" value={eInvoiceByStatus["SUCCESS"] ?? 0} href="/app/compliance/einvoice" color="text-green-700" />
              <StatCard label="Pending" value={eInvoiceByStatus["PENDING"] ?? 0} color="text-yellow-600" />
              <StatCard label="Failed" value={eInvoiceByStatus["FAILED"] ?? 0} color="text-red-600" />
              <StatCard label="Cancelled" value={eInvoiceByStatus["CANCELLED"] ?? 0} color="text-slate-500" />
            </div>
          </section>

          {/* GSTR-2B */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">GSTR-2B Reconciliation</h2>
              <Link href="/app/compliance/gst/reconciliation" className="text-xs text-blue-600 hover:underline">
                Import & Reconcile →
              </Link>
            </div>
            <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Matched</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Unmatched</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.gstr2bStats ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No imports yet.{" "}
                        <Link href="/app/compliance/gst/reconciliation" className="text-blue-600 hover:underline">
                          Import GSTR-2B →
                        </Link>
                      </td>
                    </tr>
                  )}
                  {(data?.gstr2bStats ?? []).map((imp) => (
                    <tr key={imp.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{imp.period}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          imp.status === "RECONCILED" ? "bg-green-100 text-green-700" :
                          imp.status === "RECONCILING" ? "bg-yellow-100 text-yellow-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {imp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{imp.totalEntries}</td>
                      <td className="px-4 py-3 text-right text-green-700">{imp.matchedCount}</td>
                      <td className="px-4 py-3 text-right text-amber-600">{imp.unmatchedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* TDS */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">TDS Ledger</h2>
              <Link href="/app/compliance/tds" className="text-xs text-blue-600 hover:underline">
                View Ledger →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Total TDS Tracked"
                value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(tdsTotal)}
                href="/app/compliance/tds"
              />
              {(data?.tdsStats ?? []).map((s) => (
                <StatCard
                  key={s.certStatus}
                  label={`TDS – ${s.certStatus}`}
                  value={s._count.id}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
