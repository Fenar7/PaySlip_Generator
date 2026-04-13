import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicketDetail } from "./actions";
import { TicketDetailClient } from "./ticket-detail-client";

export const metadata = {
  title: "Ticket Detail | Slipwise",
};

const CATEGORY_COLORS: Record<string, string> = {
  BILLING_QUERY: "bg-blue-100 text-blue-700",
  AMOUNT_DISPUTE: "bg-red-100 text-red-700",
  MISSING_ITEM: "bg-amber-100 text-amber-700",
  OTHER: "bg-slate-100 text-slate-700",
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const ticket = await getTicketDetail(ticketId);

  if (!ticket) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/app/flow/tickets" className="hover:text-slate-900">
            Tickets
          </Link>
          <span>/</span>
          <span className="font-mono text-slate-700">{ticket.id.slice(0, 8)}…</span>
        </div>

        {/* Ticket Info Card */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Ticket #{ticket.id.slice(0, 8)}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Opened {formatDate(ticket.createdAt)}
              </p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[ticket.category] || "bg-slate-100 text-slate-700"}`}>
              {ticket.category.replace(/_/g, " ")}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Invoice</dt>
              <dd className="mt-1">
                <Link
                  href={`/app/docs/invoices/${ticket.invoice.id}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {ticket.invoice.invoiceNumber}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Submitter</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {ticket.submitterName}
                <span className="ml-1 text-slate-500">({ticket.submitterEmail})</span>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                {ticket.description}
              </dd>
            </div>
            {ticket.assigneeId && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Assigned To</dt>
                <dd className="mt-1 text-sm text-slate-900">{ticket.assigneeId.slice(0, 8)}…</dd>
              </div>
            )}
            {ticket.resolvedAt && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-400">Resolved At</dt>
                <dd className="mt-1 text-sm text-slate-900">{formatDate(ticket.resolvedAt)}</dd>
              </div>
            )}
          </div>
        </div>

        {/* Interactive section */}
        <TicketDetailClient
          ticket={{
            id: ticket.id,
            status: ticket.status,
            assigneeId: ticket.assigneeId,
            invoice: ticket.invoice,
            replies: ticket.replies.map((r) => ({
              id: r.id,
              authorName: r.authorName,
              isInternal: r.isInternal,
              message: r.message,
              createdAt: r.createdAt,
              attachments: r.attachments?.map(a => ({ id: a.id, fileName: a.fileName, size: a.size })),
            })),
          }}
        />
      </div>
    </div>
  );
}
