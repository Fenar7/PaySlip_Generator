"use client";

import { useState, useTransition } from "react";
import {
  replyToTicket,
  assignTicket,
  updateTicketStatus,
} from "./actions";

interface TicketDetailClientProps {
  ticket: {
    id: string;
    status: string;
    assigneeId: string | null;
    invoice: { id: string; invoiceNumber: string };
    replies: {
      id: string;
      authorName: string;
      isInternal: boolean;
      message: string;
      createdAt: Date;
    }[];
  };
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-slate-200 text-slate-500",
};

const ALLOWED_TRANSITIONS: Record<string, { status: string; label: string; color: string }[]> = {
  OPEN: [
    { status: "IN_PROGRESS", label: "Mark In Progress", color: "bg-amber-600 hover:bg-amber-700" },
    { status: "CLOSED", label: "Close", color: "bg-slate-600 hover:bg-slate-700" },
  ],
  IN_PROGRESS: [
    { status: "RESOLVED", label: "Resolve", color: "bg-green-600 hover:bg-green-700" },
    { status: "CLOSED", label: "Close", color: "bg-slate-600 hover:bg-slate-700" },
  ],
  RESOLVED: [
    { status: "CLOSED", label: "Close", color: "bg-slate-600 hover:bg-slate-700" },
  ],
  CLOSED: [],
};

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

export function TicketDetailClient({ ticket }: TicketDetailClientProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setFeedback(null);

    startTransition(async () => {
      const result = await replyToTicket(ticket.id, { message, isInternal });
      if (result.success) {
        setMessage("");
        setFeedback({ type: "success", text: "Reply sent" });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: "error", text: result.error });
      }
    });
  }

  function handleAssign() {
    setFeedback(null);
    startTransition(async () => {
      const result = await assignTicket(ticket.id);
      if (result.success) {
        setFeedback({ type: "success", text: "Ticket assigned to you" });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: "error", text: result.error });
      }
    });
  }

  function handleStatusChange(status: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateTicketStatus(ticket.id, status);
      if (result.success) {
        setFeedback({ type: "success", text: `Status updated to ${status.replace(/_/g, " ")}` });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: "error", text: result.error });
      }
    });
  }

  const transitions = ALLOWED_TRANSITIONS[ticket.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[ticket.status] || "bg-slate-100 text-slate-700"}`}>
          {ticket.status.replace(/_/g, " ")}
        </span>

        {!ticket.assigneeId && ticket.status !== "CLOSED" && (
          <button
            onClick={handleAssign}
            disabled={isPending}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Assign to Me
          </button>
        )}

        {transitions.map((t) => (
          <button
            key={t.status}
            onClick={() => handleStatusChange(t.status)}
            disabled={isPending}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50 ${t.color}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Reply Thread */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-900">
          Replies ({ticket.replies.length})
        </h3>

        {ticket.replies.length === 0 && (
          <p className="text-sm text-slate-500">No replies yet.</p>
        )}

        {ticket.replies.map((reply) => (
          <div
            key={reply.id}
            className={`rounded-lg border p-4 ${
              reply.isInternal
                ? "border-amber-200 bg-amber-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-900">
                  {reply.authorName}
                </span>
                {reply.isInternal && (
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-800">
                    Internal
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">{timeAgo(reply.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{reply.message}</p>
          </div>
        ))}
      </div>

      {/* Reply Form */}
      {ticket.status !== "CLOSED" && (
        <form onSubmit={handleReply} className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-medium text-slate-900">Add Reply</h3>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Type your reply..."
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          />

          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={isInternal}
                onClick={() => setIsInternal(!isInternal)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isInternal ? "bg-amber-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    isInternal ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
              <span className="text-sm text-slate-600">Internal Note</span>
            </label>

            <button
              type="submit"
              disabled={isPending || !message.trim()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
