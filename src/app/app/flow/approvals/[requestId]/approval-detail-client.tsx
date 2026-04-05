"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { approveRequest, rejectRequest } from "../actions";

interface ApprovalDetailClientProps {
  requestId: string;
  canDecide: boolean;
}

export function ApprovalDetailClient({
  requestId,
  canDecide,
}: ApprovalDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!canDecide) return null;

  function handleApprove() {
    setFeedback(null);
    startTransition(async () => {
      const result = await approveRequest(requestId);
      if (result.success) {
        setFeedback({ type: "success", message: "Approval granted successfully" });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  function handleReject() {
    if (!rejectReason.trim()) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await rejectRequest(requestId, rejectReason.trim());
      if (result.success) {
        setFeedback({ type: "success", message: "Request rejected" });
        setShowRejectForm(false);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">
        Make a Decision
      </h3>

      {feedback && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {!showRejectForm ? (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? "Processing…" : "✅ Approve"}
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={isPending}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            ❌ Reject
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Reason for rejection <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Please provide a reason for rejection…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={isPending || !rejectReason.trim()}
              className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? "Processing…" : "Confirm Rejection"}
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason("");
              }}
              disabled={isPending}
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
