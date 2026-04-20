"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BillingPageActionsProps {
  orgId: string;
  canPause: boolean;
  canResume: boolean;
  canRefreshPending: boolean;
  canCancelPending: boolean;
}

type BillingAction = "pause" | "resume" | "cancel-pending" | "sync";

export function BillingPageActions({
  orgId,
  canPause,
  canResume,
  canRefreshPending,
  canCancelPending,
}: BillingPageActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<BillingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: BillingAction) {
    setPendingAction(action);
    setError(null);

    try {
      const response = await fetch(`/api/billing/razorpay/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? `Could not ${action} the subscription.`);
        return;
      }

      router.refresh();
    } catch (actionError) {
      console.error(`[Billing] ${action} action failed:`, actionError);
      setError(`Could not ${action} the subscription. Please try again.`);
    } finally {
      setPendingAction(null);
    }
  }

  if (!canPause && !canResume && !canRefreshPending && !canCancelPending) {
    return null;
  }

  return (
    <>
      {canPause ? (
        <button
          onClick={() => handleAction("pause")}
          disabled={pendingAction !== null}
          className="rounded-md border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-60"
        >
          {pendingAction === "pause" ? "Pausing..." : "Pause Subscription"}
        </button>
      ) : null}
      {canResume ? (
        <button
          onClick={() => handleAction("resume")}
          disabled={pendingAction !== null}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {pendingAction === "resume" ? "Resuming..." : "Resume Subscription"}
        </button>
      ) : null}
      {canRefreshPending ? (
        <button
          onClick={() => handleAction("sync")}
          disabled={pendingAction !== null}
          className="rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
        >
          {pendingAction === "sync" ? "Refreshing..." : "Refresh Status"}
        </button>
      ) : null}
      {canCancelPending ? (
        <button
          onClick={() => handleAction("cancel-pending")}
          disabled={pendingAction !== null}
          className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          {pendingAction === "cancel-pending"
            ? "Cancelling..."
            : "Cancel Pending Checkout"}
        </button>
      ) : null}
      {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
    </>
  );
}
