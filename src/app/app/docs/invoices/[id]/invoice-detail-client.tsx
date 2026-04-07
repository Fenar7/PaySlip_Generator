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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

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

interface PaymentEntry {
  id: string;
  amount: number;
  paidAt: string;
  method: string | null;
  note: string | null;
  source: string;
  status: string;
  externalPaymentId: string | null;
  paymentMethodDisplay: string | null;
  plannedNextPaymentDate: string | null;
}

interface InvoiceSummary {
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  lastPaymentAt: string | null;
  lastPaymentMethod: string | null;
  paymentPromiseDate: string | null;
  razorpayPaymentLinkUrl: string | null;
  paymentLinkStatus: string | null;
  paymentLinkExpiresAt: string | null;
  paymentLinkLastEventAt: string | null;
}

interface InvoiceDetailClientProps {
  invoiceId: string;
  status: string;
  events: TimelineEvent[];
  invoiceSummary?: InvoiceSummary;
  payments?: PaymentEntry[];
}

const SOURCE_LABELS: Record<string, string> = {
  admin_manual: "Manual",
  public_proof: "Proof Upload",
  razorpay_payment_link: "Payment Link",
  smart_collect: "Smart Collect",
  api: "API",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  SETTLED: "bg-green-100 text-green-700",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-red-100 text-red-700",
  OVERPAID_REVIEW: "bg-orange-100 text-orange-700",
};

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
  invoiceSummary,
  payments = [],
}: InvoiceDetailClientProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReasonInput, setShowReasonInput] = useState<"cancel" | "dispute" | null>(null);
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [reason, setReason] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

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
        method: paymentMethod || undefined,
      });
      if (!result.success) {
        setError(result.error);
      }
      setShowPaymentInput(false);
      setPaymentAmount("");
      setPaymentMethod("");
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
              }}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Payment Summary */}
      {invoiceSummary && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Payment Summary</h3>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Total</span>
              <span className="font-medium text-slate-900">{formatCurrency(invoiceSummary.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid</span>
              <span className="font-medium text-green-700">{formatCurrency(invoiceSummary.amountPaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Remaining</span>
              <span className={`font-medium ${invoiceSummary.remainingAmount > 0 ? "text-orange-700" : "text-slate-500"}`}>
                {invoiceSummary.remainingAmount > 0 ? formatCurrency(invoiceSummary.remainingAmount) : "—"}
              </span>
            </div>
            {invoiceSummary.lastPaymentAt && (
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Last payment</span>
                <span className="text-slate-700 text-xs">
                  {new Date(invoiceSummary.lastPaymentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {invoiceSummary.lastPaymentMethod && ` via ${invoiceSummary.lastPaymentMethod}`}
                </span>
              </div>
            )}
            {invoiceSummary.paymentPromiseDate && (
              <div className="flex justify-between">
                <span className="text-slate-500">Next promised</span>
                <span className="text-slate-700">{invoiceSummary.paymentPromiseDate}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Ledger */}
      {payments.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Payment Ledger</h3>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-2 py-2 text-left font-medium text-slate-500">Date</th>
                  <th className="px-2 py-2 text-right font-medium text-slate-500">Amount</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-500">Source</th>
                  <th className="px-2 py-2 text-left font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-2 py-2 text-slate-600">
                      {new Date(p.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-slate-900">{formatCurrency(p.amount)}</td>
                    <td className="px-2 py-2 text-slate-600">{SOURCE_LABELS[p.source] ?? p.source}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[p.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Link Card */}
      {invoiceSummary?.razorpayPaymentLinkUrl && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Payment Link</h3>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-sm">
            {invoiceSummary.paymentLinkStatus && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {invoiceSummary.paymentLinkStatus}
                </span>
              </div>
            )}
            {invoiceSummary.paymentLinkExpiresAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">Expires</span>
                <span className="text-slate-700">{new Date(invoiceSummary.paymentLinkExpiresAt).toLocaleDateString("en-IN")}</span>
              </div>
            )}
            {invoiceSummary.paymentLinkLastEventAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">Last event</span>
                <span className="text-slate-700">{new Date(invoiceSummary.paymentLinkLastEventAt).toLocaleDateString("en-IN")}</span>
              </div>
            )}
            <div className="pt-1 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-1 truncate">{invoiceSummary.razorpayPaymentLinkUrl}</p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(invoiceSummary.razorpayPaymentLinkUrl!)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Copy Link
              </button>
            </div>
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
