"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCrmDashboard } from "./actions";

type Dashboard = Awaited<ReturnType<typeof getCrmDashboard>>;

const LIFECYCLE_COLORS: Record<string, string> = {
  PROSPECT: "bg-slate-100 text-slate-600",
  QUALIFIED: "bg-blue-100 text-blue-700",
  NEGOTIATION: "bg-yellow-100 text-yellow-700",
  WON: "bg-green-100 text-green-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  AT_RISK: "bg-orange-100 text-orange-700",
  CHURNED: "bg-red-100 text-red-600",
};

const COMPLIANCE_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  VERIFIED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  BLOCKED: "bg-red-100 text-red-600",
};

export default function CrmPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCrmDashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
        <p className="text-sm text-slate-500 mt-1">
          Customer lifecycle, vendor compliance, and relationship history
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Lifecycle */}
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Customer Lifecycle</h2>
              <Link href="/app/data/customers" className="text-xs text-blue-600 hover:underline">
                View Customers →
              </Link>
            </div>
            <div className="space-y-2">
              {(data?.lifecycleBreakdown ?? []).length === 0 && (
                <p className="text-sm text-slate-400">No customer data yet.</p>
              )}
              {(data?.lifecycleBreakdown ?? []).map((s) => (
                <div key={s.lifecycleStage} className="flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${LIFECYCLE_COLORS[s.lifecycleStage ?? "PROSPECT"] ?? "bg-slate-100 text-slate-600"}`}>
                    {(s.lifecycleStage ?? "UNKNOWN").replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{s._count.id}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Vendor Compliance */}
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Vendor Compliance</h2>
              <Link href="/app/data/vendors" className="text-xs text-blue-600 hover:underline">
                View Vendors →
              </Link>
            </div>
            <div className="space-y-2">
              {(data?.vendorCompliance ?? []).length === 0 && (
                <p className="text-sm text-slate-400">No vendor data yet.</p>
              )}
              {(data?.vendorCompliance ?? []).map((s) => (
                <div key={s.complianceStatus} className="flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${COMPLIANCE_COLORS[s.complianceStatus ?? "PENDING"] ?? "bg-slate-100 text-slate-600"}`}>
                    {(s.complianceStatus ?? "PENDING").replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{s._count.id}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Follow-ups */}
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Upcoming Follow-ups (7 days)</h2>
            {(data?.upcomingFollowUps ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No follow-ups scheduled this week.</p>
            ) : (
              <div className="divide-y">
                {(data?.upcomingFollowUps ?? []).map((c) => (
                  <div key={c.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        {c.nextFollowUpAt ? new Date(c.nextFollowUpAt).toLocaleDateString("en-IN") : "—"}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${LIFECYCLE_COLORS[c.lifecycleStage ?? "PROSPECT"] ?? "bg-slate-100 text-slate-600"}`}>
                        {(c.lifecycleStage ?? "PROSPECT").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Notes */}
          <section className="rounded-lg border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-800 mb-4">Recent Activity</h2>
            {(data?.recentNotes ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">No recent notes.</p>
            ) : (
              <div className="divide-y">
                {(data?.recentNotes ?? []).map((n) => (
                  <div key={n.id} className="py-2.5">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {n.entityType}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(n.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mt-0.5 line-clamp-2">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
