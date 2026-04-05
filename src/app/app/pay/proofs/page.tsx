import { Suspense } from "react";
import Link from "next/link";
import { listProofs } from "./actions";

export const metadata = {
  title: "Payment Proofs | Slipwise",
};

const REVIEW_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
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
    { value: "PENDING", label: "Pending" },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value ? `?status=${tab.value}` : "/app/pay/proofs"}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            current === tab.value || (!current && !tab.value)
              ? "bg-red-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

async function ProofsTable({ status, page }: { status?: string; page: number }) {
  const result = await listProofs({ status, page });

  if (!result.success) {
    return <p className="py-8 text-center text-red-500">{result.error}</p>;
  }

  const { proofs, total, totalPages } = result.data;

  if (proofs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No payment proofs</h3>
        <p className="mt-1 text-sm text-slate-500">
          {status ? `No ${status.toLowerCase()} proofs found.` : "Payment proofs from your customers will appear here."}
        </p>
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
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount Claimed</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {proofs.map((proof) => (
            <tr key={proof.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{proof.invoiceNumber}</td>
              <td className="px-4 py-3 text-sm text-slate-700">{proof.customerName}</td>
              <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">{formatCurrency(proof.amount)}</td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {new Date(proof.createdAt).toLocaleDateString("en-IN")}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${REVIEW_STATUS_COLORS[proof.reviewStatus] || "bg-slate-100 text-slate-700"}`}>
                  {proof.reviewStatus}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/app/pay/proofs/${proof.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}${status ? `&status=${status}` : ""}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}${status ? `&status=${status}` : ""}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function ProofsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Payment Proofs</h1>
          <p className="mt-1 text-sm text-slate-500">Review and verify payment proofs from your customers</p>
        </div>

        <div className="mb-4">
          <StatusFilterTabs current={params.status} />
        </div>

        <Suspense fallback={<div className="py-8 text-center text-slate-500">Loading proofs...</div>}>
          <ProofsTable status={params.status} page={page} />
        </Suspense>
      </div>
    </div>
  );
}
