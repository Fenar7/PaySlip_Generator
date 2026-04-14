"use client";

import type { DocEventRow } from "@/lib/document-events";

// ─── Event display maps ───────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, string> = {
  created:         "📝",
  updated:         "✏️",
  duplicated:      "📋",
  archived:        "🗄️",
  restored:        "♻️",
  issued:          "📤",
  approved:        "✅",
  released:        "🚀",
  paid:            "💰",
  partially_paid:  "💸",
  overdue:         "⏰",
  disputed:        "⚠️",
  cancelled:       "❌",
  reissued:        "🔄",
  sent:            "📨",
  viewed:          "👁️",
  quote_accepted:  "🤝",
  quote_declined:  "🚫",
  quote_converted: "⚡",
};

const EVENT_LABELS: Record<string, string> = {
  created:         "Document Created",
  updated:         "Document Updated",
  duplicated:      "Document Duplicated",
  archived:        "Document Archived",
  restored:        "Document Restored",
  issued:          "Invoice Issued",
  approved:        "Voucher Approved",
  released:        "Salary Slip Released",
  paid:            "Payment Recorded",
  partially_paid:  "Partial Payment Recorded",
  overdue:         "Marked Overdue",
  disputed:        "Invoice Disputed",
  cancelled:       "Document Cancelled",
  reissued:        "Invoice Reissued",
  sent:            "Sent to Customer",
  viewed:          "Document Viewed",
  quote_accepted:  "Quote Accepted",
  quote_declined:  "Quote Declined",
  quote_converted: "Quote Converted to Invoice",
};

const EVENT_COLORS: Record<string, string> = {
  created:         "bg-slate-50 border-slate-300 text-slate-600",
  updated:         "bg-blue-50 border-blue-300 text-blue-600",
  duplicated:      "bg-purple-50 border-purple-300 text-purple-600",
  archived:        "bg-slate-100 border-slate-400 text-slate-500",
  restored:        "bg-teal-50 border-teal-300 text-teal-600",
  issued:          "bg-blue-100 border-blue-400 text-blue-700",
  approved:        "bg-green-50 border-green-300 text-green-600",
  released:        "bg-green-100 border-green-400 text-green-700",
  paid:            "bg-green-100 border-green-400 text-green-700",
  partially_paid:  "bg-orange-50 border-orange-300 text-orange-600",
  overdue:         "bg-red-50 border-red-300 text-red-600",
  disputed:        "bg-pink-50 border-pink-300 text-pink-600",
  cancelled:       "bg-red-100 border-red-400 text-red-700",
  reissued:        "bg-indigo-50 border-indigo-300 text-indigo-600",
  sent:            "bg-cyan-50 border-cyan-300 text-cyan-600",
  viewed:          "bg-purple-50 border-purple-300 text-purple-600",
  quote_accepted:  "bg-emerald-100 border-emerald-400 text-emerald-700",
  quote_declined:  "bg-red-100 border-red-400 text-red-700",
  quote_converted: "bg-indigo-100 border-indigo-400 text-indigo-700",
};

function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

interface MetadataEntry {
  [key: string]: unknown;
}

function renderMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as MetadataEntry;
  const parts: string[] = [];

  if (m.reason && typeof m.reason === "string") parts.push(m.reason);
  if (m.newInvoiceNumber) parts.push(`New invoice: ${m.newInvoiceNumber}`);
  if (m.newVoucherNumber) parts.push(`New voucher: ${m.newVoucherNumber}`);
  if (m.newSlipNumber) parts.push(`New slip: ${m.newSlipNumber}`);
  if (m.newQuoteNumber) parts.push(`New quote: ${m.newQuoteNumber}`);
  if (m.duplicatedFrom) parts.push(`Copied from earlier document`);
  if (m.invoiceId) parts.push(`Invoice created`);

  return parts.length > 0 ? parts.join(" · ") : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DocumentTimelineProps {
  events: DocEventRow[];
  /** Optional label override for the section title */
  title?: string;
}

export function DocumentTimeline({ events, title = "Timeline" }: DocumentTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-400">No history events yet</p>
      </div>
    );
  }

  // Newest first for display
  const sorted = [...events].sort(
    (a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime()
  );

  return (
    <div>
      {title && (
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
      )}
      <div className="flow-root">
        <ul className="-mb-6">
          {sorted.map((event, idx) => {
            const isLast = idx === sorted.length - 1;
            const icon = EVENT_ICONS[event.eventType] ?? "📋";
            const label = EVENT_LABELS[event.eventType] ?? event.eventType.replace(/_/g, " ");
            const colorClass = EVENT_COLORS[event.eventType] ?? "bg-slate-50 border-slate-300 text-slate-600";
            const note = renderMetadata(event.metadata);

            return (
              <li key={event.id}>
                <div className="relative pb-6">
                  {!isLast && (
                    <span
                      className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-slate-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex items-start space-x-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm ${colorClass}`}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-slate-900">{label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatTimestamp(event.eventAt)}
                      </p>
                      {event.actorLabel && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          by {event.actorLabel}
                        </p>
                      )}
                      {note && (
                        <p className="mt-1 text-xs italic text-slate-400">{note}</p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
