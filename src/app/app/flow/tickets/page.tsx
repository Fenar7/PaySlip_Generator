import { Suspense } from "react";
import Link from "next/link";
import { listTickets, getTicketCounts } from "./actions";

export const metadata = {
  title: "Support Tickets | Slipwise",
};

const CATEGORY_COLORS: Record<string, string> = {
  BILLING_QUERY: "bg-blue-100 text-blue-700",
  AMOUNT_DISPUTE: "bg-red-100 text-red-700",
  MISSING_ITEM: "bg-amber-100 text-amber-700",
  OTHER: "bg-slate-100 text-slate-700",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-200 text-slate-500",
};

function formatCategory(cat: string) {
  return cat.replace(/_/g, " ");
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ");
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function TicketFilters({ currentStatus }: { currentStatus?: string }) {
  const counts = await getTicketCounts();

  const statuses = [
    { value: "", label: "All", count: counts.all },
    { value: "OPEN", label: "Open", count: counts.open },
    { value: "IN_PROGRESS", label: "In Progress", count: counts.inProgress },
    { value: "RESOLVED", label: "Resolved", count: counts.resolved },
    { value: "CLOSED", label: "Closed", count: counts.closed },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((s) => (
        <Link
          key={s.value}
          href={s.value ? `?status=${s.value}` : "/app/flow/tickets"}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            currentStatus === s.value || (!currentStatus && !s.value)
              ? "bg-red-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {s.label}
          <span className="ml-1.5 text-xs opacity-75">({s.count})</span>
        </Link>
      ))}
    </div>
  );
}

async function TicketTable({
  status,
  search,
  page,
}: {
  status?: string;
  search?: string;
  page: number;
}) {
  const { tickets, total, totalPages } = await listTickets({ status, search, page });

  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No tickets found</h3>
        <p className="mt-1 text-sm text-slate-500">
          {search ? "Try a different search term." : "No support tickets have been submitted yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Ticket ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice #</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Submitter</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Category</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Created</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Replies</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link href={`/app/flow/tickets/${ticket.id}`} className="font-mono text-sm text-blue-600 hover:underline">
                  {ticket.id.slice(0, 8)}…
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">
                {ticket.invoice.invoiceNumber}
              </td>
              <td className="px-4 py-3">
                <div className="text-sm text-slate-900">{ticket.submitterName}</div>
                <div className="text-xs text-slate-500">{ticket.submitterEmail}</div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[ticket.category] || "bg-slate-100 text-slate-700"}`}>
                  {formatCategory(ticket.category)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status] || "bg-slate-100 text-slate-700"}`}>
                  {formatStatus(ticket.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {formatDate(ticket.createdAt)}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {ticket._count.replies}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/app/flow/tickets/${ticket.id}`}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  View
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
                href={`?page=${page - 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
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

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Support Tickets</h1>
          <p className="mt-1 text-sm text-slate-500">Manage customer support tickets for invoices</p>
        </div>

        {/* Search */}
        <form method="GET">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <div className="relative mb-4 max-w-sm">
            <input
              type="text"
              name="search"
              defaultValue={params.search || ""}
              placeholder="Search by name, email, or invoice #..."
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 pl-9 text-sm text-slate-700 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {params.search && (
              <a
                href={params.status ? `/app/flow/tickets?status=${params.status}` : "/app/flow/tickets"}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </a>
            )}
          </div>
        </form>

        {/* Filters */}
        <div className="mb-4">
          <Suspense fallback={<div className="h-8" />}>
            <TicketFilters currentStatus={params.status} />
          </Suspense>
        </div>

        {/* Table */}
        <Suspense fallback={<div className="py-8 text-center text-slate-500">Loading tickets...</div>}>
          <TicketTable status={params.status} search={params.search} page={page} />
        </Suspense>
      </div>
    </div>
  );
}
