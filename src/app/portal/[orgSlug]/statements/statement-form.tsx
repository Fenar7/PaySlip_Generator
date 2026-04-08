"use client";

import { useState, useTransition } from "react";
import { generatePortalStatement } from "../actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

interface StatementResult {
  id: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  closingBalance: number;
  totalInvoiced: number;
  totalReceived: number;
  formattedOpeningBalance: string;
  formattedClosingBalance: string;
  formattedTotalInvoiced: string;
  formattedTotalReceived: string;
}

export function PortalStatementForm({ orgSlug }: { orgSlug: string }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<StatementResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!fromDate || !toDate) {
      setError("Please select both start and end dates.");
      return;
    }
    if (new Date(fromDate) > new Date(toDate)) {
      setError("Start date must be before end date.");
      return;
    }

    startTransition(async () => {
      try {
        const stmt = await generatePortalStatement(orgSlug, fromDate, toDate);
        setResult(stmt);
      } catch {
        setError("Failed to generate statement. Please try again.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900 mb-4">
        Generate New Statement
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stmt-from" className="text-xs font-semibold text-slate-700">
              From Date
            </label>
            <input
              id="stmt-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="stmt-to" className="text-xs font-semibold text-slate-700">
              To Date
            </label>
            <input
              id="stmt-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
              disabled={isPending}
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600" role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : (
            "Generate Statement"
          )}
        </button>
      </form>

      {/* Inline result */}
      {result && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5">
          <h3 className="text-sm font-semibold text-green-800 mb-3">
            Statement Generated
          </h3>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between sm:flex-col sm:gap-0.5">
              <span className="text-green-600">Period</span>
              <span className="font-medium text-green-900">
                {new Date(result.fromDate).toLocaleDateString("en-IN")} –{" "}
                {new Date(result.toDate).toLocaleDateString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-0.5">
              <span className="text-green-600">Opening Balance</span>
              <span className="font-medium text-green-900">{formatCurrency(result.openingBalance)}</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-0.5">
              <span className="text-green-600">Total Invoiced</span>
              <span className="font-medium text-green-900">{formatCurrency(result.totalInvoiced)}</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-0.5">
              <span className="text-green-600">Total Received</span>
              <span className="font-medium text-green-900">{formatCurrency(result.totalReceived)}</span>
            </div>
            <div className="flex justify-between sm:flex-col sm:gap-0.5 sm:col-span-2">
              <span className="text-green-600">Closing Balance</span>
              <span className="text-lg font-bold text-green-900">{formatCurrency(result.closingBalance)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
