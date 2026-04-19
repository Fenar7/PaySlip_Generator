"use client";

import { useState, useTransition } from "react";
import { computeTaxLiabilityAction } from "./actions";
import type { TaxDashboardData, TaxConfigSummary } from "./actions";

function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const REGION_COLORS: Record<string, string> = {
  IN_GST: "bg-orange-50 border-orange-200",
  UK_VAT: "bg-blue-50 border-blue-200",
  EU_VAT: "bg-indigo-50 border-indigo-200",
  US_SALES: "bg-green-50 border-green-200",
  AU_GST: "bg-yellow-50 border-yellow-200",
  NZ_GST: "bg-teal-50 border-teal-200",
  SG_GST: "bg-red-50 border-red-200",
  EXEMPT: "bg-gray-50 border-gray-200",
};

export function TaxDashboard({ data }: { data: TaxDashboardData }) {
  const { configs, supportedRegions, orgPrimaryRegion } = data;

  return (
    <div className="space-y-6">
      {/* Primary region indicator */}
      {orgPrimaryRegion && (
        <div className="rounded-lg border bg-gray-50 px-4 py-2 text-sm">
          <span className="text-muted-foreground">Primary Tax Region:</span>{" "}
          <span className="font-semibold">
            {supportedRegions.find((r) => r.region === orgPrimaryRegion)?.displayName ?? orgPrimaryRegion}
          </span>
        </div>
      )}

      {/* Config cards */}
      {configs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No tax configurations</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Add your first tax registration to start computing liabilities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {configs.map((config) => (
            <TaxConfigCard key={config.id} config={config} />
          ))}
        </div>
      )}

      {/* Supported regions reference */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Supported Tax Regions</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          {supportedRegions.map((r) => (
            <div
              key={r.region}
              className={`rounded border px-3 py-2 text-xs ${REGION_COLORS[r.region] ?? "bg-gray-50"}`}
            >
              <div className="font-medium">{r.displayName}</div>
              <div className="text-muted-foreground">{r.currency}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaxConfigCard({ config }: { config: TaxConfigSummary }) {
  const [isPending, startTransition] = useTransition();
  const [estimate, setEstimate] = useState(config.latestEstimate);
  const [error, setError] = useState<string | null>(null);

  function handleCompute() {
    setError(null);
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    startTransition(async () => {
      const result = await computeTaxLiabilityAction(config.id, periodStart, periodEnd);
      if (result.success) {
        setEstimate(result.data);
      } else {
        setError(result.error);
      }
    });
  }

  const color = REGION_COLORS[config.region] ?? "bg-gray-50 border-gray-200";

  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold">{config.region.replace("_", " ")}</h4>
          <p className="text-muted-foreground text-xs">{config.registrationNumber}</p>
          {config.registrationName && (
            <p className="text-muted-foreground text-xs">{config.registrationName}</p>
          )}
        </div>
        <div className="flex gap-1">
          {config.isDefault && (
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Default</span>
          )}
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              config.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {config.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <p className="text-muted-foreground mt-1 text-xs">Filing: {config.filingFrequency}</p>

      {estimate && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Output Tax</span>
            <p className="font-mono font-medium text-red-700">
              {formatCurrency(estimate.outputTaxTotal, estimate.currency)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Input Tax (ITC)</span>
            <p className="font-mono font-medium text-green-700">
              {formatCurrency(estimate.inputTaxTotal, estimate.currency)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Net Liability</span>
            <p className={`font-mono font-semibold ${estimate.netLiability >= 0 ? "text-red-700" : "text-green-700"}`}>
              {formatCurrency(estimate.netLiability, estimate.currency)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleCompute}
          disabled={isPending || !config.isActive}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1 text-xs font-medium disabled:opacity-50"
        >
          {isPending ? "Computing…" : "Compute Liability"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
