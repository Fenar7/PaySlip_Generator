"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  manuallyReconcilePayment,
  markPaymentAsOther,
} from "./actions";
import type { UnmatchedPaymentWithInvoice } from "./actions";

interface Props {
  initialPayments: UnmatchedPaymentWithInvoice[];
}

function formatPaise(paise: bigint): string {
  return `₹${(Number(paise) / 100).toFixed(2)}`;
}

function ReconcileRow({
  payment,
  onResolved,
}: {
  payment: UnmatchedPaymentWithInvoice;
  onResolved: (id: string) => void;
}) {
  const [invoiceId, setInvoiceId] = useState(
    payment.matchedInvoiceId ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReconcile() {
    if (!invoiceId.trim()) {
      setError("Please enter an Invoice ID.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await manuallyReconcilePayment(payment.id, invoiceId.trim());
      if (!result.success) {
        setError(result.error);
        return;
      }
      onResolved(payment.id);
    });
  }

  function handleMarkOther() {
    startTransition(async () => {
      const result = await markPaymentAsOther(payment.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onResolved(payment.id);
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{formatPaise(payment.amountPaise)}</span>
            <Badge variant={payment.status === "suggested" ? "warning" : "default"}>
              {payment.status === "suggested" ? "Suggested Match" : "Unmatched"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Received {new Date(payment.receivedAt).toLocaleString()}
          </p>
          {payment.payerName && (
            <p className="text-sm">
              <span className="text-muted-foreground">Payer:</span> {payment.payerName}{" "}
              {payment.payerAccount && (
                <span className="font-mono text-xs">({payment.payerAccount})</span>
              )}
            </p>
          )}
          {payment.suggestedInvoice && (
            <div className="mt-2 rounded bg-amber-50 px-3 py-2 text-sm">
              <p className="font-medium text-amber-800">Suggested Invoice</p>
              <p className="text-amber-700">
                #{payment.suggestedInvoice.invoiceNumber} — ₹
                {payment.suggestedInvoice.remainingAmount.toFixed(2)} remaining
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">Invoice ID to match</label>
          <input
            className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={payment.matchedInvoiceId ?? "inv_…"}
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            disabled={isPending}
          />
        </div>
        <Button variant="primary" onClick={handleReconcile} disabled={isPending}>
          Reconcile
        </Button>
        <Button variant="ghost" onClick={handleMarkOther} disabled={isPending}>
          Mark Other
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function UnmatchedQueueClient({ initialPayments }: Props) {
  const [payments, setPayments] = useState(initialPayments);

  function handleResolved(id: string) {
    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        No unmatched payments. All virtual account deposits have been reconciled.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((p) => (
        <ReconcileRow key={p.id} payment={p} onResolved={handleResolved} />
      ))}
    </div>
  );
}
