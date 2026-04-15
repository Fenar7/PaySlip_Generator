import type { Metadata } from "next";
import Link from "next/link";
import { listCustomersWithHealthAction } from "./actions";

export const metadata: Metadata = { title: "Customer Health — SW Intel" };

const RISK_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  healthy: { label: "Healthy", badge: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  at_risk: { label: "At Risk", badge: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
  high_risk: { label: "High Risk", badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  critical: { label: "Critical", badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

export default async function CustomerHealthPage() {
  const result = await listCustomersWithHealthAction();

  if (!result.success && result.error?.includes("plan")) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="text-5xl">❤️</div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Customer Health requires a Pro plan</h2>
        <p className="mt-2 text-sm text-slate-500">
          Upgrade to Pro or Enterprise to track customer payment health and collection risk.
        </p>
        <Link
          href="/app/billing"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          View Plans
        </Link>
      </div>
    );
  }

  const customers = result.success ? result.data : [];
  const scored = customers.filter((c) => c.score !== null);
  const unscored = customers.filter((c) => c.score === null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Customer Health</h1>
          <p className="mt-1 text-sm text-slate-500">
            Payment behavior, collection risk, and health scores across your customer base.
          </p>
        </div>
        <Link
          href="/app/intel/collections"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
        >
          Collections Queue →
        </Link>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <div className="text-4xl">👥</div>
          <p className="mt-3 text-sm font-medium text-slate-600">No customers yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scored.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Scored ({scored.length})
              </h2>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
                {scored
                  .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))
                  .map((customer) => {
                    const riskCfg = RISK_CONFIG[customer.riskBand ?? "at_risk"] ?? RISK_CONFIG.at_risk;
                    const score = customer.score ?? 0;
                    const scoreColor = score >= 75 ? "text-green-700" : score >= 50 ? "text-yellow-700" : "text-red-700";
                    return (
                      <Link
                        key={customer.id}
                        href={`/app/intel/customer-health/${customer.id}`}
                        className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                      >
                        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${riskCfg.dot}`} />
                        <span className="flex-1 text-sm font-medium text-slate-900">{customer.name}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${riskCfg.badge}`}
                        >
                          {riskCfg.label}
                        </span>
                        <span className={`w-10 text-right text-sm font-bold ${scoreColor}`}>
                          {score}
                        </span>
                        {customer.snapshotAge && (
                          <span className="text-xs text-slate-400">{customer.snapshotAge}</span>
                        )}
                        <span className="text-xs text-slate-400">→</span>
                      </Link>
                    );
                  })}
              </div>
            </section>
          )}

          {unscored.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Not yet scored ({unscored.length})
              </h2>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
                {unscored.map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/app/intel/customer-health/${customer.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                  >
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-slate-300" />
                    <span className="flex-1 text-sm text-slate-700">{customer.name}</span>
                    <span className="text-xs text-slate-400">No data</span>
                    <span className="text-xs text-slate-400">→</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
