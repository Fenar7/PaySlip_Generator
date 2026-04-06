"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function CancelBillingPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgId = searchParams.get("orgId") ?? "";

  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/billing/razorpay/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, cancelAtPeriodEnd }),
      });

      if (res.ok) {
        router.push("/app/billing");
      } else {
        const data = await res.json();
        console.error("Cancel failed:", data.error);
      }
    } catch (error) {
      console.error("Error cancelling:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">
          Cancel Subscription
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          We&apos;re sorry to see you go. Please review what you&apos;ll lose
          before cancelling.
        </p>

        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-medium text-amber-800">
            ⚠️ You&apos;ll lose access to:
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            <li>• Increased document limits</li>
            <li>• Custom branding</li>
            <li>• Advanced workflows</li>
            <li>• Priority support</li>
            <li>• Additional team member seats</li>
          </ul>
        </div>

        <div className="mt-6 space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={cancelAtPeriodEnd}
              onChange={(e) => setCancelAtPeriodEnd(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            <span className="text-sm text-gray-700">
              Cancel at end of billing period (you&apos;ll retain access until
              then)
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600"
            />
            <span className="text-sm text-gray-700">
              I understand that my plan will be downgraded to Free
            </span>
          </label>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={handleCancel}
            disabled={!confirmed || loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Cancelling..." : "Cancel Subscription"}
          </button>
          <button
            onClick={() => router.push("/app/billing")}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Keep My Plan
          </button>
        </div>
      </div>
    </div>
  );
}
