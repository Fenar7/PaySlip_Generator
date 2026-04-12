"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { recordBooksVendorBillPayment } from "../actions";

interface VendorBillPaymentFormProps {
  vendorBillId: string;
  maxAmount: number;
}

export function VendorBillPaymentForm({ vendorBillId, maxAmount }: VendorBillPaymentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const parsedAmount = Number.parseFloat(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    startTransition(async () => {
      const result = await recordBooksVendorBillPayment({
        vendorBillId,
        amount: parsedAmount,
        paidAt: paidAt || undefined,
        method: method.trim() || undefined,
        note: note.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMethod("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Record payment</h3>
        <p className="mt-1 text-sm text-slate-500">
          Outstanding balance {maxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Amount</span>
          <input
            type="number"
            min="0"
            max={maxAmount}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Paid at</span>
          <input
            type="date"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Method</span>
          <input
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            placeholder="Bank transfer, cheque, UPI..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Note</span>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional bank reference"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={isPending}>
          {isPending ? "Recording..." : "Record Payment"}
        </Button>
      </div>
    </div>
  );
}
