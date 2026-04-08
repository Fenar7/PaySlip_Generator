import { Suspense } from "react";
import Link from "next/link";
import { listArrangementsAction } from "./actions";

export const metadata = {
  title: "Payment Arrangements | Slipwise",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  DEFAULTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-200 text-slate-500",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function StatusFilterTabs({ current }: { current?: string }) {
  const tabs = [
    { value: "", label: "All" },
    { value: "ACTIVE", label: "Active" },
    { value: "COMPLETED", label: "Completed" },
    { value: "DEFAULTED", label: "Defaulted" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <Link
          key={t.value}
          href={t.value ? `?status=${t.value}` : "/app/pay/arrangements"}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            current === t.value || (!current && !t.value)
              ? "bg-red-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

async function ArrangementsTable({ status }: { status?: string }) {
  const result = await listArrangementsAction(status);

  if (!result.success) {
    return <p className="py-8 text-center text-red-500">{result.error}</p>;
  }

  const arrangements = result.data;

  if (arrangements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No payment arrangements</h3>
        <p className="mt-1 text-sm text-slate-500">Create a payment arrangement to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice #</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Total</th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">Installments</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Created</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {arrangements.map((arr) => (
            <tr key={arr.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{arr.invoiceNumber}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{arr.customerName}</td>
              <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">{formatCurrency(arr.totalArranged)}</td>
              <td className="px-4 py-3 text-center text-sm text-slate-700">
                <span className="font-medium">{arr.paidCount}</span>
                <span className="text-slate-400"> / {arr.installmentCount}</span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[arr.status] || "bg-slate-100 text-slate-700"}`}>
                  {arr.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {new Date(arr.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/app/pay/arrangements/${arr.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ArrangementsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Payment Arrangements</h1>
            <p className="mt-1 text-sm text-slate-500">Manage installment payment plans for invoices</p>
          </div>
          <Link
            href="/app/pay/arrangements/new"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Arrangement
          </Link>
        </div>

        {/* Status Filter */}
        <div className="mb-4">
          <StatusFilterTabs current={params.status} />
        </div>

        {/* Table */}
        <Suspense fallback={<div className="py-8 text-center text-slate-500">Loading arrangements...</div>}>
          <ArrangementsTable status={params.status} />
        </Suspense>
      </div>
    </div>
  );
}
