import { Suspense } from "react";
import { getCashFlowData, getHealthData } from "./actions";

export const metadata = {
  title: "Cash Flow Intelligence | Slipwise",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ─── Snapshot Cards ─────────────────────────────────────────────────────────

async function SnapshotCards() {
  const result = await getCashFlowData();

  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{result.error}</p>
      </div>
    );
  }

  const { snapshot, dso } = result.data;

  const cards = [
    {
      label: "Total Outstanding",
      value: formatCurrency(snapshot.totalOutstanding),
      bg: "bg-blue-50 border-blue-200",
      icon: "text-blue-600",
    },
    {
      label: "Total Overdue",
      value: formatCurrency(snapshot.totalOverdue),
      bg: "bg-red-50 border-red-200",
      icon: "text-red-600",
    },
    {
      label: "Expected This Month",
      value: formatCurrency(snapshot.expectedThisMonth),
      bg: "bg-yellow-50 border-yellow-200",
      icon: "text-yellow-600",
    },
    {
      label: "Received This Month",
      value: formatCurrency(snapshot.receivedThisMonth),
      bg: "bg-green-50 border-green-200",
      icon: "text-green-600",
    },
    {
      label: "DSO (Days Sales Outstanding)",
      value: `${dso.dso} days`,
      subtitle: dso.trend === "improving"
        ? "↓ Improving"
        : dso.trend === "worsening"
        ? "↑ Worsening"
        : "→ Stable",
      subtitleColor: dso.trend === "improving"
        ? "text-green-600"
        : dso.trend === "worsening"
        ? "text-red-600"
        : "text-slate-500",
      bg: "bg-purple-50 border-purple-200",
      icon: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-lg border p-4 ${card.bg}`}>
          <p className="text-xs font-medium text-slate-500">{card.label}</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
          {"subtitle" in card && card.subtitle && (
            <p className={`mt-0.5 text-xs font-medium ${card.subtitleColor}`}>
              {card.subtitle}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Aging Report ───────────────────────────────────────────────────────────

async function AgingChart() {
  const result = await getCashFlowData();
  if (!result.success) return null;

  const { aging } = result.data;
  const maxAmount = Math.max(...aging.map((b) => b.total), 1);

  const barColors = [
    "bg-green-500",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-red-400",
    "bg-red-600",
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-4">
        Aging Report
      </h2>
      <div className="space-y-3">
        {aging.map((bucket, idx) => (
          <div key={bucket.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-700">{bucket.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{bucket.count} invoices</span>
                <span className="text-sm font-medium text-slate-900">
                  {formatCurrency(bucket.total)}
                </span>
                <span className="text-xs text-slate-400 w-12 text-right">
                  {bucket.percentage}%
                </span>
              </div>
            </div>
            <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColors[idx] || "bg-slate-400"} transition-all`}
                style={{ width: `${maxAmount > 0 ? (bucket.total / maxAmount) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Customer Health ────────────────────────────────────────────────────────

async function CustomerHealthSection() {
  const result = await getHealthData();

  if (!result.success) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-4">
          Customer Health
        </h2>
        <p className="text-sm text-slate-500">{result.error}</p>
      </div>
    );
  }

  const { distribution, topAtRisk } = result.data;
  const total =
    distribution.excellent +
    distribution.good +
    distribution.fair +
    distribution.atRisk +
    distribution.critical;

  const segments = [
    { label: "Excellent (80-100)", count: distribution.excellent, color: "bg-green-500" },
    { label: "Good (60-79)", count: distribution.good, color: "bg-blue-500" },
    { label: "Fair (40-59)", count: distribution.fair, color: "bg-yellow-500" },
    { label: "At Risk (20-39)", count: distribution.atRisk, color: "bg-orange-500" },
    { label: "Critical (0-19)", count: distribution.critical, color: "bg-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Distribution */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-4">
          Customer Health Distribution
        </h2>

        {/* Stacked bar */}
        {total > 0 && (
          <div className="h-6 w-full rounded-full overflow-hidden flex mb-4">
            {segments.map((seg) =>
              seg.count > 0 ? (
                <div
                  key={seg.label}
                  className={`${seg.color} transition-all`}
                  style={{ width: `${(seg.count / total) * 100}%` }}
                  title={`${seg.label}: ${seg.count}`}
                />
              ) : null,
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {segments.map((seg) => (
            <div key={seg.label} className="text-center">
              <div className={`mx-auto mb-1 h-3 w-3 rounded-full ${seg.color}`} />
              <p className="text-lg font-bold text-slate-900">{seg.count}</p>
              <p className="text-xs text-slate-500">{seg.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top At-Risk */}
      {topAtRisk.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-4">
            Top 5 At-Risk Customers
          </h2>
          <div className="space-y-3">
            {topAtRisk.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{customer.name}</p>
                  {customer.email && (
                    <p className="text-xs text-slate-500">{customer.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Outstanding</p>
                    <p className="text-sm font-medium text-red-600">
                      {formatCurrency(customer.outstandingAmount)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Score</p>
                    <div
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold text-white ${
                        customer.score < 20 ? "bg-red-600" : "bg-orange-500"
                      }`}
                    >
                      {customer.score}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Forecast ───────────────────────────────────────────────────────────────

async function ForecastTable() {
  const result = await getCashFlowData();
  if (!result.success) return null;

  const { forecast } = result.data;

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">
          3-Month Forecast
        </h2>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Month</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Expected Inflow</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Est. Collection</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Arrangements Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {forecast.map((m) => (
            <tr key={m.month} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{m.month}</td>
              <td className="px-4 py-3 text-right text-sm text-slate-700">{formatCurrency(m.expectedInflow)}</td>
              <td className="px-4 py-3 text-right text-sm font-medium text-green-700">{formatCurrency(m.estimatedCollection)}</td>
              <td className="px-4 py-3 text-right text-sm text-blue-700">{formatCurrency(m.arrangementsDue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CashFlowPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Cash Flow Intelligence</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time insights into your accounts receivable and cash flow
          </p>
        </div>

        {/* Snapshot Cards */}
        <Suspense
          fallback={
            <div className="grid grid-cols-5 gap-4 mb-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          }
        >
          <SnapshotCards />
        </Suspense>

        {/* Aging + Forecast Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
          <Suspense fallback={<div className="h-64 rounded-lg bg-slate-100 animate-pulse" />}>
            <AgingChart />
          </Suspense>
          <Suspense fallback={<div className="h-64 rounded-lg bg-slate-100 animate-pulse" />}>
            <ForecastTable />
          </Suspense>
        </div>

        {/* Customer Health */}
        <Suspense fallback={<div className="h-48 rounded-lg bg-slate-100 animate-pulse" />}>
          <CustomerHealthSection />
        </Suspense>
      </div>
    </div>
  );
}
