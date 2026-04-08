"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createArrangementAction, listEligibleInvoicesAction } from "../actions";

interface EligibleInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerId: string;
  totalAmount: number;
  remainingAmount: number;
}

interface InstallmentRow {
  dueDate: string;
  amount: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function ArrangementForm() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<EligibleInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [installmentCount, setInstallmentCount] = useState(3);
  const [totalArranged, setTotalArranged] = useState(0);
  const [notes, setNotes] = useState("");
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId);

  useEffect(() => {
    listEligibleInvoicesAction().then((result) => {
      if (result.success) {
        setInvoices(result.data);
      }
      setLoading(false);
    });
  }, []);

  // When invoice or count changes, auto-generate schedule
  useEffect(() => {
    if (!selectedInvoice) {
      setInstallments([]);
      setTotalArranged(0);
      return;
    }

    const max = selectedInvoice.remainingAmount;
    setTotalArranged(max);
    generateSchedule(max, installmentCount);
  }, [selectedInvoiceId, installmentCount]); // eslint-disable-line react-hooks/exhaustive-deps

  function generateSchedule(total: number, count: number) {
    const perInstallment = Math.floor((total / count) * 100) / 100;
    const remainder = Math.round((total - perInstallment * count) * 100) / 100;

    const rows: InstallmentRow[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const dueDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      rows.push({
        dueDate: dueDate.toISOString().split("T")[0],
        amount: i === count - 1 ? perInstallment + remainder : perInstallment,
      });
    }

    setInstallments(rows);
  }

  function updateInstallment(index: number, field: keyof InstallmentRow, value: string | number) {
    setInstallments((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  const installmentSum = installments.reduce((sum, i) => sum + i.amount, 0);
  const sumMismatch = Math.abs(installmentSum - totalArranged) > 0.01;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedInvoiceId) {
      setError("Please select an invoice");
      return;
    }
    if (sumMismatch) {
      setError("Installment amounts must equal the total arranged");
      return;
    }

    setSubmitting(true);

    const result = await createArrangementAction({
      invoiceId: selectedInvoiceId,
      totalArranged,
      installmentCount: installments.length,
      notes: notes || undefined,
      installments: installments.map((i) => ({
        dueDate: i.dueDate,
        amount: i.amount,
      })),
    });

    if (result.success) {
      router.push(`/app/pay/arrangements/${result.data.id}`);
    } else {
      setError(result.error);
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-slate-500">Loading invoices...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Invoice Selection */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-3">Select Invoice</h2>
        <select
          value={selectedInvoiceId}
          onChange={(e) => setSelectedInvoiceId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
          required
        >
          <option value="">Choose an invoice...</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoiceNumber} — {inv.customerName} — Remaining: {formatCurrency(inv.remainingAmount)}
            </option>
          ))}
        </select>

        {selectedInvoice && (
          <div className="mt-3 grid grid-cols-3 gap-4 rounded bg-slate-50 p-3">
            <div>
              <p className="text-xs text-slate-500">Customer</p>
              <p className="text-sm font-medium">{selectedInvoice.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Invoice Total</p>
              <p className="text-sm font-medium">{formatCurrency(selectedInvoice.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Remaining Balance</p>
              <p className="text-sm font-medium text-red-600">{formatCurrency(selectedInvoice.remainingAmount)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Arrangement Details */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-3">Arrangement Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Total to Arrange
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={selectedInvoice?.remainingAmount || 0}
              value={totalArranged}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setTotalArranged(val);
                generateSchedule(val, installmentCount);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Number of Installments
            </label>
            <input
              type="number"
              min="2"
              max="24"
              value={installmentCount}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 3;
                setInstallmentCount(val);
                generateSchedule(totalArranged, val);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              required
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            placeholder="Internal notes about this arrangement..."
          />
        </div>
      </div>

      {/* Installment Schedule */}
      {installments.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Installment Schedule
            </h2>
            <button
              type="button"
              onClick={() => generateSchedule(totalArranged, installmentCount)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset to Equal Split
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">#</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-slate-500">Due Date</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {installments.map((inst, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2 text-sm text-slate-700">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={inst.dueDate}
                      onChange={(e) => updateInstallment(idx, "dueDate", e.target.value)}
                      className="rounded border border-slate-300 px-2 py-1 text-sm focus:border-red-400 focus:outline-none"
                      required
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={inst.amount}
                      onChange={(e) => updateInstallment(idx, "amount", parseFloat(e.target.value) || 0)}
                      className="w-32 rounded border border-slate-300 px-2 py-1 text-sm text-right focus:border-red-400 focus:outline-none"
                      required
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300 bg-slate-50">
                <td colSpan={2} className="px-4 py-2 text-sm font-medium text-slate-700">Total</td>
                <td className={`px-4 py-2 text-right text-sm font-medium ${sumMismatch ? "text-red-600" : "text-slate-900"}`}>
                  {formatCurrency(installmentSum)}
                  {sumMismatch && (
                    <span className="ml-2 text-xs text-red-500">
                      (expected {formatCurrency(totalArranged)})
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/app/pay/arrangements")}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !selectedInvoiceId || sumMismatch}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating..." : "Create Arrangement"}
        </button>
      </div>
    </form>
  );
}
