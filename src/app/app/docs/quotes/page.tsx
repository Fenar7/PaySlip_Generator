import { Suspense } from "react";
import Link from "next/link";
import { listQuotes, deleteQuote, duplicateQuote } from "./actions";
import type { QuoteStatus } from "./actions";

export const metadata = {
  title: "Quotes | Slipwise",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-amber-100 text-amber-700",
  CONVERTED: "bg-indigo-100 text-indigo-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getValidUntilColor(validUntil: Date | string, status: string): string {
  if (status === "ACCEPTED" || status === "CONVERTED") return "text-green-600";
  if (status === "DECLINED" || status === "EXPIRED") return "text-slate-400";

  const now = new Date();
  const until = new Date(validUntil);
  const diffDays = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "text-red-600 font-medium";
  if (diffDays <= 3) return "text-amber-600 font-medium";
  return "text-slate-500";
}

async function QuoteTable({
  status,
  search,
  page,
}: {
  status?: QuoteStatus;
  search?: string;
  page: number;
}) {
  const { quotes, total, totalPages } = await listQuotes({
    status,
    search,
    page,
    limit: 20,
  });

  if (quotes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No quotes yet</h3>
        <p className="mt-1 text-sm text-slate-500">Create your first quote to get started.</p>
        <Link
          href="/app/docs/quotes/new"
          className="mt-4 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Create Quote
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Quote #</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Title</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Total</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Issue Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Valid Until</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {quotes.map((quote) => (
            <tr key={quote.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link href={`/app/docs/quotes/${quote.id}`} className="font-medium text-blue-600 hover:underline">
                  {quote.quoteNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-slate-900 max-w-[200px] truncate">
                {quote.title}
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">
                {quote.customer?.name || "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={quote.status} />
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                {formatCurrency(quote.totalAmount)}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {new Date(quote.issueDate).toLocaleDateString("en-IN")}
              </td>
              <td className={`px-4 py-3 text-sm ${getValidUntilColor(quote.validUntil, quote.status)}`}>
                {new Date(quote.validUntil).toLocaleDateString("en-IN")}
              </td>
              <td className="px-4 py-3 text-right">
                <QuoteActions quoteId={quote.id} status={quote.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}`}
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

function QuoteActions({ quoteId, status }: { quoteId: string; status: string }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/app/docs/quotes/${quoteId}`}
        className="text-sm text-slate-600 hover:text-slate-900"
      >
        Open
      </Link>
      <form action={async () => {
        "use server";
        await duplicateQuote(quoteId);
      }}>
        <button type="submit" className="text-sm text-slate-600 hover:text-slate-900">
          Duplicate
        </button>
      </form>
      {status === "DRAFT" && (
        <form action={async () => {
          "use server";
          await deleteQuote(quoteId);
        }}>
          <button type="submit" className="text-sm text-red-600 hover:text-red-800">
            Delete
          </button>
        </form>
      )}
    </div>
  );
}

function StatusFilterChips({ currentStatus }: { currentStatus?: string }) {
  const statuses = [
    { value: "", label: "All" },
    { value: "DRAFT", label: "Draft" },
    { value: "SENT", label: "Sent" },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "DECLINED", label: "Declined" },
    { value: "EXPIRED", label: "Expired" },
    { value: "CONVERTED", label: "Converted" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((s) => (
        <Link
          key={s.value}
          href={s.value ? `?status=${s.value}` : "?"}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            currentStatus === s.value || (!currentStatus && !s.value)
              ? "bg-red-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const status = params.status as QuoteStatus | undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Quotes</h1>
            <p className="mt-1 text-sm text-slate-500">Create and manage quotes for your customers</p>
          </div>
          <Link
            href="/app/docs/quotes/new"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Create Quote
          </Link>
        </div>

        {/* Search */}
        <form method="GET">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <div className="relative mb-4 max-w-sm">
            <input
              type="text"
              name="search"
              defaultValue={params.search || ""}
              placeholder="Search quotes..."
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 pl-9 text-sm text-slate-700 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {params.search && (
              <a href={params.status ? `/app/docs/quotes?status=${params.status}` : "/app/docs/quotes"} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </a>
            )}
          </div>
        </form>

        {/* Filters */}
        <div className="mb-4">
          <StatusFilterChips currentStatus={status} />
        </div>

        {/* Table */}
        <Suspense fallback={<div className="py-8 text-center text-slate-500">Loading quotes...</div>}>
          <QuoteTable status={status} search={params.search} page={page} />
        </Suspense>
      </div>
    </div>
  );
}
