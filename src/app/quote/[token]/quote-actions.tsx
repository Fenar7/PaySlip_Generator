"use client";

import { useState } from "react";
import { acceptPublicQuote, declinePublicQuote } from "./actions";

interface QuoteActionsProps {
  token: string;
  status: string;
}

export function QuoteActions({ token, status }: QuoteActionsProps) {
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleAccept() {
    setLoading(true);
    setResult(null);
    const res = await acceptPublicQuote(token);
    setLoading(false);
    if (res.success) {
      setResult({ type: "success", message: "Quote accepted! Thank you." });
    } else {
      setResult({ type: "error", message: res.error });
    }
  }

  async function handleDecline() {
    setLoading(true);
    setResult(null);
    const res = await declinePublicQuote(token, declineReason || undefined);
    setLoading(false);
    if (res.success) {
      setResult({ type: "success", message: "Quote declined." });
    } else {
      setResult({ type: "error", message: res.error });
    }
  }

  if (status !== "SENT") return null;

  return (
    <div className="space-y-4">
      {result && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            result.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {result.message}
        </div>
      )}

      {!result?.type && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Processing..." : "Accept Quote"}
          </button>
          <button
            onClick={() => setShowDeclineForm(!showDeclineForm)}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Decline Quote
          </button>
        </div>
      )}

      {showDeclineForm && !result?.type && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Reason for declining (optional)
          </label>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            rows={3}
            placeholder="Let us know why you're declining this quote..."
          />
          <button
            onClick={handleDecline}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Processing..." : "Confirm Decline"}
          </button>
        </div>
      )}
    </div>
  );
}
