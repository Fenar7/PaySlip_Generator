"use client";

import { useState, useTransition } from "react";
import { InvoiceTimeline } from "@/features/docs/invoice/components/invoice-timeline";
import {
  issueInvoice,
  markInvoicePaid,
  cancelInvoice,
  disputeInvoice,
  recordPayment,
} from "../actions";

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

interface InvoiceDetailClientProps {
  invoiceId: string;
  status: string;
  events: TimelineEvent[];
}

const ACTION_CONFIG: Record<string, { label: string; allowedFrom: string[]; color: string }> = {
  ISSUE: {
    label: "Issue Invoice",
    allowedFrom: ["DRAFT"],
    color: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  PAID: {
    label: "Mark Paid",
    allowedFrom: ["ISSUED", "VIEWED", "DUE", "PARTIALLY_PAID", "OVERDUE"],
    color: "bg-green-600 hover:bg-green-700 text-white",
  },
  CANCEL: {
    label: "Cancel",
    allowedFrom: ["DRAFT", "ISSUED", "VIEWED", "DUE", "PARTIALLY_PAID", "OVERDUE", "DISPUTED"],
    color: "bg-slate-600 hover:bg-slate-700 text-white",
  },
  DISPUTE: {
    label: "Dispute",
    allowedFrom: ["ISSUED", "VIEWED", "DUE", "PARTIALLY_PAID", "PAID", "OVERDUE"],
    color: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  RECORD_PAYMENT: {
    label: "Record Payment",
    allowedFrom: ["ISSUED", "VIEWED", "DUE", "PARTIALLY_PAID", "OVERDUE"],
    color: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
};

export function InvoiceDetailClient({
  invoiceId,
  status,
  events,
}: InvoiceDetailClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReasonInput, setShowReasonInput] = useState<"cancel" | "dispute" | null>(null);
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [reason, setReason] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isPartial, setIsPartial] = useState(false);

  const handleAction = (action: string) => {
    setError(null);
    if (action === "CANCEL") {
      setShowReasonInput("cancel");
      return;
    }
    if (action === "DISPUTE") {
      setShowReasonInput("dispute");
      return;
    }
    if (action === "RECORD_PAYMENT") {
      setShowPaymentInput(true);
      return;
    }

    startTransition(async () => {
      let result;
      if (action === "ISSUE") {
        result = await issueInvoice(invoiceId);
      } else if (action === "PAID") {
        result = await markInvoicePaid(invoiceId);
      }
      if (result && !result.success) {
        setError(result.error);
      }
    });
  };

  const submitReason = () => {
    if (!reason.trim()) return;
    startTransition(async () => {
      const result =
        showReasonInput === "cancel"
          ? await cancelInvoice(invoiceId, reason)
          : await disputeInvoice(invoiceId, reason);
      if (!result.success) {
        setError(result.error);
      }
      setShowReasonInput(null);
      setReason("");
    });
  };

  const submitPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    startTransition(async () => {
      const result = await recordPayment(invoiceId, {
        amount,
        isPartial,
        method: paymentMethod || undefined,
      });
      if (!result.success) {
        setError(result.error);
      }
      setShowPaymentInput(false);
      setPaymentAmount("");
      setPaymentMethod("");
      setIsPartial(false);
    });
  };

  const availableActions = Object.entries(ACTION_CONFIG).filter(
    ([, config]) => config.allowedFrom.includes(status)
  );

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      {availableActions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Actions</h3>
          <div className="flex flex-wrap gap-2">
            {availableActions.map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleAction(key)}
                disabled={isPending}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${config.color}`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Reason Input Modal */}
      {showReasonInput && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {showReasonInput === "cancel" ? "Cancellation Reason" : "Dispute Reason"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            rows={2}
            placeholder="Enter reason..."
          />
          <div className="flex gap-2">
            <button
              onClick={submitReason}
              disabled={isPending || !reason.trim()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setShowReasonInput(null);
                setReason("");
              }}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Payment Input */}
      {showPaymentInput && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h4 className="mb-2 text-sm font-medium text-slate-700">Record Payment</h4>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Amount</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Method</label>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
                placeholder="e.g. UPI, NEFT"
              />
            </div>
          </div>
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isPartial}
              onChange={(e) => setIsPartial(e.target.checked)}
              className="rounded border-slate-300"
            />
            Partial payment
          </label>
          <div className="flex gap-2">
            <button
              onClick={submitPayment}
              disabled={isPending || !paymentAmount}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Record
            </button>
            <button
              onClick={() => {
                setShowPaymentInput(false);
                setPaymentAmount("");
                setPaymentMethod("");
                setIsPartial(false);
              }}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-700">Timeline</h3>
        <InvoiceTimeline events={events} />
      </div>
    </div>
  );
}
