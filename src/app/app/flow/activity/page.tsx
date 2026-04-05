import { Suspense } from "react";
import Link from "next/link";
import { listActivity } from "./actions";

export const metadata = {
  title: "Activity Feed | Slipwise",
};

function eventIcon(event: string) {
  if (event.includes("invoice_created") || event.includes("created"))
    return (
      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    );
  if (event.includes("paid") || event.includes("accepted") || event.includes("approved"))
    return (
      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  if (event.includes("rejected") || event.includes("dispute"))
    return (
      <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  if (event.includes("ticket") || event.includes("reply"))
    return (
      <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    );
  if (event.includes("issued") || event.includes("upload") || event.includes("proof"))
    return (
      <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  if (event.includes("approval") || event.includes("requested"))
    return (
      <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    );
  return (
    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function eventDescription(event: string, docType?: string | null, docId?: string | null) {
  const ref = docId || "unknown";
  const type = docType || "document";

  const map: Record<string, string> = {
    invoice_created: `created invoice ${ref}`,
    invoice_issued: `issued invoice ${ref}`,
    invoice_paid: `marked invoice ${ref} as paid`,
    proof_uploaded: `uploaded payment proof for invoice ${ref}`,
    proof_accepted: `accepted payment proof for invoice ${ref}`,
    proof_rejected: `rejected payment proof for invoice ${ref}`,
    ticket_opened: `opened a support ticket for invoice ${ref}`,
    ticket_reply: `replied to ticket ${ref}`,
    ticket_resolved: `resolved ticket ${ref}`,
    ticket_assigned: `was assigned to ticket ${ref}`,
    ticket_in_progress: `marked ticket ${ref} as in progress`,
    ticket_closed: `closed ticket ${ref}`,
    approval_requested: `requested approval for ${type} ${ref}`,
    approval_approved: `approved ${type} ${ref}`,
    approval_rejected: `rejected ${type} ${ref}`,
  };

  return map[event] || event;
}

function timeAgo(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

async function ActivityTimeline({
  docType,
  days,
  page,
}: {
  docType?: string;
  days?: number;
  page: number;
}) {
  const { logs, hasMore, total } = await listActivity({ docType, days, page });

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No activity yet</h3>
        <p className="mt-1 text-sm text-slate-500">Activity will appear here as actions are performed.</p>
      </div>
    );
  }

  const queryParts: string[] = [];
  if (docType && docType !== "all") queryParts.push(`docType=${docType}`);
  if (days) queryParts.push(`days=${days}`);

  return (
    <div>
      <div className="space-y-0">
        {logs.map((log, i) => (
          <div key={log.id} className="relative flex gap-4 pb-6">
            {/* Timeline line */}
            {i < logs.length - 1 && (
              <div className="absolute left-5 top-10 h-full w-px bg-slate-200" />
            )}
            {/* Icon */}
            <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
              {eventIcon(log.event)}
            </div>
            {/* Content */}
            <div className="flex-1 pt-1.5">
              <p className="text-sm text-slate-900">
                <span className="font-medium">{log.actorName}</span>{" "}
                <span className="text-slate-600">
                  {eventDescription(log.event, log.docType, log.docId)}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{timeAgo(log.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <Link
            href={`?page=${page + 1}${queryParts.length ? "&" + queryParts.join("&") : ""}`}
            className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Load More
          </Link>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-slate-400">
        Showing {(page - 1) * 30 + logs.length} of {total} activities
      </p>
    </div>
  );
}

function FilterBar({
  currentDocType,
  currentDays,
}: {
  currentDocType?: string;
  currentDays?: string;
}) {
  const docTypes = [
    { value: "all", label: "All Types" },
    { value: "invoice", label: "Invoices" },
    { value: "voucher", label: "Vouchers" },
    { value: "salary-slip", label: "Salary Slips" },
    { value: "ticket", label: "Tickets" },
  ];

  const timeRanges = [
    { value: "", label: "All Time" },
    { value: "7", label: "Last 7 Days" },
    { value: "30", label: "Last 30 Days" },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-wrap gap-2">
        {docTypes.map((dt) => {
          const isActive = currentDocType === dt.value || (!currentDocType && dt.value === "all");
          const href = dt.value === "all"
            ? currentDays ? `?days=${currentDays}` : "/app/flow/activity"
            : currentDays ? `?docType=${dt.value}&days=${currentDays}` : `?docType=${dt.value}`;
          return (
            <Link
              key={dt.value}
              href={href}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-red-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {dt.label}
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {timeRanges.map((tr) => {
          const isActive = currentDays === tr.value || (!currentDays && !tr.value);
          const dtParam = currentDocType && currentDocType !== "all" ? `docType=${currentDocType}&` : "";
          const href = tr.value
            ? `?${dtParam}days=${tr.value}`
            : dtParam ? `?${dtParam.slice(0, -1)}` : "/app/flow/activity";
          return (
            <Link
              key={tr.value}
              href={href}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tr.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ docType?: string; days?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const days = params.days ? parseInt(params.days, 10) : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Activity Feed</h1>
          <p className="mt-1 text-sm text-slate-500">Track all actions across your organization</p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <FilterBar currentDocType={params.docType} currentDays={params.days} />
        </div>

        {/* Timeline */}
        <Suspense fallback={<div className="py-8 text-center text-slate-500">Loading activity...</div>}>
          <ActivityTimeline docType={params.docType} days={days} page={page} />
        </Suspense>
      </div>
    </div>
  );
}
