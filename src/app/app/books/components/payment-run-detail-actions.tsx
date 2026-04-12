"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  approveBooksPaymentRun,
  executeBooksPaymentRun,
  requestBooksPaymentRunApproval,
} from "../actions";

interface PaymentRunDetailActionsProps {
  paymentRunId: string;
  status: string;
}

export function PaymentRunDetailActions({
  paymentRunId,
  status,
}: PaymentRunDetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRequestApproval() {
    startTransition(async () => {
      const result = await requestBooksPaymentRunApproval(paymentRunId);
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleExecute() {
    const paidAt = prompt("Paid date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
    if (paidAt === null) {
      return;
    }

    const method = prompt("Payment method", "Bank transfer");
    if (method === null) {
      return;
    }

    const note = prompt("Optional execution note", "");
    if (note === null) {
      return;
    }

    startTransition(async () => {
      const result = await executeBooksPaymentRun({
        paymentRunId,
        paidAt: paidAt || undefined,
        method: method || undefined,
        note: note || undefined,
      });
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      {status === "DRAFT" && (
        <Button type="button" variant="secondary" onClick={handleRequestApproval} disabled={isPending}>
          {isPending ? "Submitting..." : "Request Approval"}
        </Button>
      )}
      {status === "PENDING_APPROVAL" && (
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            startTransition(async () => {
              const result = await approveBooksPaymentRun(paymentRunId);
              if (!result.success) {
                alert(result.error);
                return;
              }
              router.refresh();
            })
          }
          disabled={isPending}
        >
          {isPending ? "Approving..." : "Approve Run"}
        </Button>
      )}
      {status === "APPROVED" && (
        <Button type="button" onClick={handleExecute} disabled={isPending}>
          {isPending ? "Executing..." : "Execute Run"}
        </Button>
      )}
    </div>
  );
}
