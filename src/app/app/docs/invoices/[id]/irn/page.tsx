"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  generateInvoiceIrn,
  cancelInvoiceIrn,
  getInvoiceIrnStatus,
} from "../../irn/actions";

// ─── IRN Management Page ──────────────────────────────────────────────────────

export default function IrnPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;

  const [irnData, setIrnData] = useState<{
    irnNumber: string | null;
    irnAckNumber: string | null;
    irnAckDate: string | null;
    irnQrCode: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cancel dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("1");
  const [cancelRemark, setCancelRemark] = useState("");

  // Generate confirmation
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getInvoiceIrnStatus(invoiceId);
      if (cancelled) return;
      if (result.success) {
        setIrnData(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [invoiceId]);

  const handleGenerate = async () => {
    setShowGenerateConfirm(false);
    setGenerating(true);
    setError(null);
    setSuccessMessage(null);

    const result = await generateInvoiceIrn(invoiceId);

    if (result.success) {
      setIrnData({
        irnNumber: result.data.irnNumber,
        irnAckNumber: result.data.irnAckNumber,
        irnAckDate: result.data.irnAckDate,
        irnQrCode: result.data.irnQrCode,
      });
      setSuccessMessage("IRN generated successfully");
    } else {
      setError(result.error);
    }

    setGenerating(false);
  };

  const handleCancel = async () => {
    if (!cancelRemark.trim()) {
      setError("Please provide a remark for cancellation");
      return;
    }

    setCancelling(true);
    setError(null);
    setSuccessMessage(null);
    setShowCancelDialog(false);

    const result = await cancelInvoiceIrn(invoiceId, cancelReason, cancelRemark);

    if (result.success) {
      setIrnData({ irnNumber: null, irnAckNumber: null, irnAckDate: null, irnQrCode: null });
      setSuccessMessage("IRN cancelled successfully");
      setCancelReason("1");
      setCancelRemark("");
    } else {
      setError(result.error);
    }

    setCancelling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const hasIrn = irnData?.irnNumber;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">IRN Management</h1>
        <a
          href={`/app/docs/invoices/${invoiceId}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Invoice
        </a>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-red-600">⚠</span>
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">✓ {successMessage}</p>
        </div>
      )}

      {/* IRN Status Card */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            e-Invoice Status
          </h2>
        </div>
        <div className="p-6">
          {hasIrn ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                  IRN Active
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    IRN Number
                  </p>
                  <p className="mt-1 break-all font-mono text-sm text-gray-900">
                    {irnData.irnNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Acknowledgement Number
                  </p>
                  <p className="mt-1 font-mono text-sm text-gray-900">
                    {irnData.irnAckNumber ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Acknowledgement Date
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {irnData.irnAckDate
                      ? new Date(irnData.irnAckDate).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
              </div>

              {/* QR Code display */}
              {irnData.irnQrCode && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase text-gray-500">
                    Signed QR Code
                  </p>
                  <div className="inline-block rounded-lg border border-slate-200 bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${irnData.irnQrCode}`}
                      alt="IRN QR Code"
                      className="h-40 w-40"
                    />
                  </div>
                </div>
              )}

              {/* Cancel IRN Button */}
              <div className="mt-4 border-t border-slate-100 pt-4">
                <button
                  onClick={() => setShowCancelDialog(true)}
                  disabled={cancelling}
                  className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Cancel IRN"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <span className="text-xl text-gray-400">📄</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  No IRN generated for this invoice yet.
                </p>
                <p className="text-xs text-gray-400">
                  Generate an IRN to make this a valid e-Invoice under GST.
                </p>
              </div>
              <button
                onClick={() => setShowGenerateConfirm(true)}
                disabled={generating}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? "Generating..." : "Generate IRN"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Generate Confirmation Dialog */}
      {showGenerateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Generate IRN?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This will submit the invoice to the IRP portal and generate an
              e-Invoice Reference Number. Once generated, the invoice details
              cannot be modified without cancelling the IRN first.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowGenerateConfirm(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? "Generating..." : "Confirm & Generate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel IRN Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Cancel IRN?
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This will cancel the e-Invoice on the IRP portal. This action
              cannot be undone.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Reason
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="1">Duplicate</option>
                  <option value="2">Data entry mistake</option>
                  <option value="3">Order cancelled</option>
                  <option value="4">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Remark
                </label>
                <input
                  type="text"
                  value={cancelRemark}
                  onChange={(e) => setCancelRemark(e.target.value)}
                  placeholder="Provide a reason for cancellation"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Keep IRN
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling || !cancelRemark.trim()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel IRN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
