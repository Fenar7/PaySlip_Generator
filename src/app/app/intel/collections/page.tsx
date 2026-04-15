import type { Metadata } from "next";
import Link from "next/link";
import { getCollectionQueueAction } from "../customer-health/actions";

export const metadata: Metadata = { title: "Collections Queue — SW Intel" };

const RISK_CONFIG: Record<string, { badge: string; dot: string }> = {
  healthy: { badge: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-500" },
  at_risk: { badge: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
  high_risk: { badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  critical: { badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

const ACTION_LABELS: Record<string, string> = {
  monitor: "Monitor",
  send_reminder: "Send Reminder",
  schedule_follow_up: "Schedule Follow-up",
  escalate_to_admin: "Escalate",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    amount / 100, // amounts are in paise
  );
}

export default async function CollectionsQueuePage() {
  const result = await getCollectionQueueAction();

  if (!result.success && result.error?.includes("plan")) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="text-5xl">📋</div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Collections Queue requires a Pro plan</h2>
        <p className="mt-2 text-sm text-slate-500">
          Upgrade to Pro or Enterprise to prioritize collection follow-ups.
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

  const queue = result.success ? result.data : [];
  const totalOverdue = queue.reduce((sum, e) => sum + e.overdueAmount, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Collections Queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ranked by risk and overdue amount. Focus your collection effort on the highest-priority accounts.
          </p>
        </div>
        <Link
          href="/app/intel/customer-health"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
        >
          ← Customer Health
        </Link>
      </div>

      {/* Summary */}
      {queue.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-500">Customers with Overdue</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{queue.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-500">Total Overdue Amount</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{formatCurrency(totalOverdue)}</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 shadow-sm">
            <p className="text-xs text-red-600">Critical / High Risk</p>
            <p className="mt-1 text-2xl font-bold text-red-800">
              {queue.filter((e) => e.riskBand === "critical" || e.riskBand === "high_risk").length}
            </p>
          </div>
        </div>
      )}

      {queue.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <div className="text-4xl">🎉</div>
          <p className="mt-3 text-sm font-medium text-slate-600">No overdue accounts</p>
          <p className="mt-1 text-xs text-slate-400">All customers are current on payments.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Overdue
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Invoices
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Oldest (days)
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Risk
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queue.map((entry, idx) => {
                const riskCfg = RISK_CONFIG[entry.riskBand] ?? RISK_CONFIG.at_risk;
                return (
                  <tr key={entry.customerId} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-400">#{idx + 1}</td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/app/intel/customer-health/${entry.customerId}`}
                        className="font-medium text-slate-900 hover:text-indigo-700"
                      >
                        {entry.customerName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-red-700">
                      {formatCurrency(entry.overdueAmount)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">{entry.overdueCount}</td>
                    <td className="px-5 py-3 text-right text-slate-700">{entry.oldestOverdueDays}d</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${riskCfg.dot}`} />
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${riskCfg.badge}`}
                        >
                          {entry.riskBand.replace("_", " ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {ACTION_LABELS[entry.recommendedAction] ?? entry.recommendedAction}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
