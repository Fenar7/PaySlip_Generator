import type { Metadata } from "next";
import Link from "next/link";
import { getCustomerHealthAction } from "../actions";

export const metadata: Metadata = { title: "Customer Health Detail — SW Intel" };

const RISK_LABELS: Record<string, string> = {
  healthy: "Healthy",
  at_risk: "At Risk",
  high_risk: "High Risk",
  critical: "Critical",
};

const ACTION_LABELS: Record<string, string> = {
  monitor: "Monitor — no action needed",
  send_reminder: "Send a payment reminder",
  schedule_follow_up: "Schedule a follow-up call",
  escalate_to_admin: "Escalate to admin for collection",
};

const IMPACT_ICONS: Record<string, string> = {
  positive: "↑",
  negative: "↓",
  neutral: "→",
};

export default async function CustomerHealthDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const result = await getCustomerHealthAction(customerId);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <p className="text-sm text-slate-500">{result.error}</p>
        <Link href="/app/intel/customer-health" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Back to Customer Health
        </Link>
      </div>
    );
  }

  const health = result.data;

  if (health.insufficientData) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Link href="/app/intel/customer-health" className="text-xs text-slate-400 hover:text-slate-600">
          ← Back to Customer Health
        </Link>
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <div className="text-4xl">📊</div>
          <h2 className="mt-3 text-base font-semibold text-slate-700">Insufficient data</h2>
          <p className="mt-1 text-sm text-slate-500">
            At least 3 invoices are required to compute a health score for this customer.
          </p>
        </div>
      </div>
    );
  }

  const scoreColor =
    health.score >= 75 ? "text-green-700" : health.score >= 50 ? "text-yellow-700" : "text-red-700";
  const riskLabel = RISK_LABELS[health.riskBand] ?? health.riskBand;
  const actionLabel = ACTION_LABELS[health.recommendedAction] ?? health.recommendedAction;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/app/intel/customer-health" className="text-xs text-slate-400 hover:text-slate-600">
          ← Back to Customer Health
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <h1 className="flex-1 text-xl font-semibold text-slate-900">{health.customerName}</h1>
          <span className={`text-4xl font-bold ${scoreColor}`}>{health.score}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Risk band: <strong>{riskLabel}</strong> · {actionLabel}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          Calculated {new Date(health.calculatedAt).toLocaleString()} · Valid until{" "}
          {new Date(health.validUntil).toLocaleString()}
        </p>
      </div>

      {/* Score factors */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Score Factors</h2>
        <div className="space-y-3">
          {health.factors.map((factor) => (
            <div key={factor.key} className="flex items-center gap-3">
              <span
                className={`w-4 text-center text-sm ${
                  factor.impact === "positive"
                    ? "text-green-600"
                    : factor.impact === "negative"
                      ? "text-red-600"
                      : "text-slate-400"
                }`}
              >
                {IMPACT_ICONS[factor.impact]}
              </span>
              <span className="flex-1 text-sm text-slate-700">{factor.label}</span>
              <span className="text-sm font-medium text-slate-900">{factor.value}</span>
              {factor.weight > 0 && (
                <span className="text-xs text-slate-400">({factor.weight} pts)</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recommended action */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
        <h2 className="mb-1 text-sm font-semibold text-indigo-800">Recommended Action</h2>
        <p className="text-sm text-indigo-700">{actionLabel}</p>
      </section>
    </div>
  );
}
