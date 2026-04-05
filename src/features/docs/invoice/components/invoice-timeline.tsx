"use client";

interface TimelineEvent {
  id: string;
  invoiceId: string;
  fromStatus: string;
  toStatus: string;
  actorId: string | null;
  actorName: string | null;
  reason: string | null;
  metadata: unknown;
  createdAt: Date | string;
}

const STATUS_ICONS: Record<string, string> = {
  ISSUED: "📤",
  VIEWED: "👁️",
  DUE: "📅",
  PARTIALLY_PAID: "💰",
  PAID: "✅",
  OVERDUE: "⏰",
  DISPUTED: "⚠️",
  CANCELLED: "❌",
  REISSUED: "🔄",
  DRAFT: "📝",
};

const STATUS_LABELS: Record<string, string> = {
  ISSUED: "Invoice Issued",
  VIEWED: "Invoice Viewed",
  DUE: "Invoice Due",
  PARTIALLY_PAID: "Partial Payment Recorded",
  PAID: "Payment Received",
  OVERDUE: "Marked Overdue",
  DISPUTED: "Invoice Disputed",
  CANCELLED: "Invoice Cancelled",
  REISSUED: "Invoice Reissued",
  DRAFT: "Created as Draft",
};

const STATUS_COLORS: Record<string, string> = {
  ISSUED: "bg-blue-100 border-blue-400",
  VIEWED: "bg-purple-100 border-purple-400",
  DUE: "bg-yellow-100 border-yellow-400",
  PARTIALLY_PAID: "bg-orange-100 border-orange-400",
  PAID: "bg-green-100 border-green-400",
  OVERDUE: "bg-red-100 border-red-400",
  DISPUTED: "bg-pink-100 border-pink-400",
  CANCELLED: "bg-slate-100 border-slate-400",
  REISSUED: "bg-indigo-100 border-indigo-400",
  DRAFT: "bg-slate-50 border-slate-300",
};

function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function InvoiceTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No timeline events yet
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, idx) => {
          const isLast = idx === events.length - 1;
          const icon = STATUS_ICONS[event.toStatus] || "📋";
          const label = STATUS_LABELS[event.toStatus] || `Status → ${event.toStatus}`;
          const colorClass = STATUS_COLORS[event.toStatus] || "bg-slate-50 border-slate-300";

          return (
            <li key={event.id}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-start space-x-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border ${colorClass} text-sm`}
                  >
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatTimestamp(event.createdAt)}
                    </p>
                    {event.actorName && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        by {event.actorName}
                      </p>
                    )}
                    {event.reason && (
                      <p className="mt-1 text-xs italic text-slate-400">
                        {event.reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
