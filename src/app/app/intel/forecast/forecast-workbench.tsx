"use client";

import { useState, useTransition } from "react";
import { regenerateForecastAction } from "./actions";
import type { ForecastResult } from "@/lib/intel/forecast";
import type { SpendingAnomaly } from "@/lib/intel/forecast-math";

function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPct(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

interface Props {
  initialData: ForecastResult | null;
}

export function ForecastWorkbench({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRegenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateForecastAction();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    });
  }

  if (data?.readiness.status === "gathering_data") {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">Gathering data</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Forecasts unlock after at least {data.readiness.minimumHistoryMonths} months of
          settled inflow or outflow activity. We&apos;ve captured{" "}
          {data.readiness.availableHistoryMonths} so far.
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Last generated: {new Date(data.generatedAt).toLocaleString()}
        </p>
        <button
          onClick={handleRegenerate}
          disabled={isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Refreshing…" : "Refresh Forecast"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-semibold">No forecast yet</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Generate your first AI-powered cash flow forecast.
        </p>
        <button
          onClick={handleRegenerate}
          disabled={isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Generating…" : "Generate Forecast"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  const { historical, projections, runRate, anomalies, baseCurrency, generatedAt } = data;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          Last generated: {new Date(generatedAt).toLocaleString()}
        </p>
        <button
          onClick={handleRegenerate}
          disabled={isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {isPending ? "Regenerating…" : "Regenerate"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="MRR"
          value={formatCurrency(runRate.mrr, baseCurrency)}
          sub={`ARR: ${formatCurrency(runRate.arr, baseCurrency)}`}
          color="blue"
        />
        <KpiCard
          label="MoM Growth"
          value={formatPct(runRate.momGrowth)}
          sub={runRate.momGrowth !== null && runRate.momGrowth >= 0 ? "Positive" : "Negative/Flat"}
          color={runRate.momGrowth !== null && runRate.momGrowth >= 0 ? "green" : "red"}
        />
        <KpiCard
          label="Forecast Horizon"
          value={`${projections.length} months`}
          sub={`${historical.length} months historical`}
          color="purple"
        />
      </div>

      {/* Historical + Projections Table */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Cash Flow Timeline</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium">Month</th>
                <th className="px-4 py-2 font-medium text-right">Inflow</th>
                <th className="px-4 py-2 font-medium text-right">Outflow</th>
                <th className="px-4 py-2 font-medium text-right">Net</th>
                <th className="px-4 py-2 font-medium text-right">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {historical.slice(-6).map((h) => (
                <tr key={h.month} className="border-b">
                  <td className="px-4 py-2 font-mono text-xs">{h.month}</td>
                  <td className="px-4 py-2 text-right text-green-700">
                    {formatCurrency(h.inflow, baseCurrency)}
                  </td>
                  <td className="px-4 py-2 text-right text-red-700">
                    {formatCurrency(h.outflow, baseCurrency)}
                  </td>
                  <td className={`px-4 py-2 text-right font-medium ${h.net >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatCurrency(h.net, baseCurrency)}
                  </td>
                  <td className="text-muted-foreground px-4 py-2 text-right text-xs">Actual</td>
                </tr>
              ))}
              {projections.map((p) => (
                <tr key={p.month} className="border-b bg-blue-50/30">
                  <td className="px-4 py-2 font-mono text-xs">
                    {p.month} <span className="text-blue-500">★</span>
                  </td>
                  <td className="px-4 py-2 text-right text-green-600">
                    {formatCurrency(p.predictedInflow, baseCurrency)}
                  </td>
                  <td className="px-4 py-2 text-right text-red-600">
                    {formatCurrency(p.predictedOutflow, baseCurrency)}
                  </td>
                  <td className={`px-4 py-2 text-right font-medium ${p.predictedNet >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(p.predictedNet, baseCurrency)}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-gray-500">
                    {formatCurrency(p.confidenceLow, baseCurrency)} – {formatCurrency(p.confidenceHigh, baseCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && <AnomalyFeed anomalies={anomalies} currency={baseCurrency} />}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const borderColors: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    purple: "border-purple-200 bg-purple-50",
  };

  return (
    <div className={`rounded-lg border p-4 ${borderColors[color] ?? "border-gray-200"}`}>
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
    </div>
  );
}

function AnomalyFeed({
  anomalies,
  currency,
}: {
  anomalies: SpendingAnomaly[];
  currency: string;
}) {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50/50">
      <div className="border-b border-yellow-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-yellow-800">⚠ Spending Anomalies Detected</h3>
      </div>
      <ul className="divide-y divide-yellow-100">
        {anomalies.map((a, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <span
              className={`mt-0.5 inline-block h-2 w-2 rounded-full ${
                Math.abs(a.zScore) >= 3 ? "bg-red-500" : "bg-yellow-500"
              }`}
            />
            <div className="text-sm">
              <span className="font-medium">{a.month}</span>
              <span className="text-muted-foreground"> — {a.type === "INFLOW" ? "Revenue" : "Spending"} of </span>
              <span className="font-medium">{formatCurrency(a.actual, currency)}</span>
              <span className="text-muted-foreground">
                {" "}
                ({a.zScore > 0 ? "+" : ""}
                {a.zScore.toFixed(1)}σ from mean {formatCurrency(a.mean, currency)})
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
