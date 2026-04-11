"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BillingPageActionsProps {
  orgId: string;
  canPause: boolean;
  canResume: boolean;
}

type BillingAction = "pause" | "resume";

export function BillingPageActions({
  orgId,
  canPause,
  canResume,
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

  if (!canPause && !canResume) {
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
      {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
    </>
  );
}
