"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBooksPaymentRun } from "../actions";

interface CreatePaymentRunFormProps {
  bills: Array<{
    id: string;
    billNumber: string;
    dueDate: string | null;
    remainingAmount: number;
    vendorName: string | null;
    status: string;
  }>;
}

export function CreatePaymentRunForm({ bills }: CreatePaymentRunFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [selectedBills, setSelectedBills] = useState<Record<string, { checked: boolean; amount: string }>>(
    Object.fromEntries(
      bills.map((bill) => [
        bill.id,
        {
          checked: false,
          amount: bill.remainingAmount.toFixed(2),
        },
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  const selectedCount = useMemo(
    () => Object.values(selectedBills).filter((item) => item.checked).length,
    [selectedBills],
  );

  function toggleBill(billId: string, checked: boolean) {
    setSelectedBills((current) => ({
      ...current,
      [billId]: {
        ...current[billId],
        checked,
      },
    }));
  }

  function updateAmount(billId: string, amount: string) {
    setSelectedBills((current) => ({
      ...current,
      [billId]: {
        ...current[billId],
        amount,
      },
    }));
  }

  function submit() {
    setError(null);

    const items = bills
      .filter((bill) => selectedBills[bill.id]?.checked)
      .map((bill) => ({
        vendorBillId: bill.id,
        amount: Number.parseFloat(selectedBills[bill.id]?.amount ?? String(bill.remainingAmount)),
      }));

    if (items.length === 0) {
      setError("Select at least one bill for the payment run.");
      return;
    }

    if (items.some((item) => !Number.isFinite(item.amount) || item.amount <= 0)) {
      setError("Each selected bill needs a valid payment amount.");
      return;
    }

    startTransition(async () => {
      const result = await createBooksPaymentRun({
        scheduledDate,
        notes: notes.trim() || undefined,
        items,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(`/app/books/payment-runs/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Create payment run</h2>
        <p className="mt-1 text-sm text-slate-500">
          Select approved or overdue bills, set payout amounts, and generate a batch ready for approval.
        </p>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Scheduled date</span>
          <input
            type="date"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Notes</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional payout instructions"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Eligible bills</h3>
          <span className="text-sm text-slate-500">{selectedCount} selected</span>
        </div>

        <div className="space-y-3">
          {bills.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No approved or overdue vendor bills are ready for payment.
            </div>
          ) : (
            bills.map((bill) => (
              <div key={bill.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[auto_1.6fr_1fr_1fr]">
                <label className="flex items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    checked={selectedBills[bill.id]?.checked ?? false}
                    onChange={(event) => toggleBill(bill.id, event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="sr-only">Select {bill.billNumber}</span>
                </label>

                <div>
                  <p className="font-medium text-slate-900">{bill.billNumber}</p>
                  <p className="text-sm text-slate-500">
                    {bill.vendorName ?? "Unassigned vendor"} • {bill.status.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-slate-500">
                    Due {bill.dueDate ?? "Not set"} • Remaining{" "}
                    {bill.remainingAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Payout amount</span>
                  <input
                    type="number"
                    min="0"
                    max={bill.remainingAmount}
                    step="0.01"
                    value={selectedBills[bill.id]?.amount ?? bill.remainingAmount.toFixed(2)}
                    onChange={(event) => updateAmount(bill.id, event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <div className="text-sm text-slate-600">
                  <span className="mb-1 block font-medium text-slate-700">Remaining</span>
                  {bill.remainingAmount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={isPending || bills.length === 0}>
          {isPending ? "Creating..." : "Create Payment Run"}
        </Button>
      </div>
    </div>
  );
}
