"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markBooksPaymentRunItemFailed } from "../actions";

interface PaymentRunItemFailureButtonProps {
  paymentRunId: string;
  paymentRunItemId: string;
  disabled?: boolean;
}

export function PaymentRunItemFailureButton({
  paymentRunId,
  paymentRunItemId,
  disabled = false,
}: PaymentRunItemFailureButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleFail() {
    const reason = prompt("Reason for marking this payout line as failed");
    if (!reason?.trim()) {
      return;
    }

    startTransition(async () => {
      const result = await markBooksPaymentRunItemFailed({
        paymentRunId,
        paymentRunItemId,
        reason: reason.trim(),
      });
      if (!result.success) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      onClick={handleFail}
      disabled={disabled || isPending}
    >
      {isPending ? "Updating..." : "Mark Failed"}
    </Button>
  );
}
