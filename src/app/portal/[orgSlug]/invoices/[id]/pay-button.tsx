"use client";

import { useTransition } from "react";
import { initiatePortalPayment } from "../../actions";

export function PortalPayButton({
  orgSlug,
  invoiceId,
}: {
  orgSlug: string;
  invoiceId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handlePay() {
    startTransition(async () => {
      try {
        const result = await initiatePortalPayment(orgSlug, invoiceId);
        if (result.alreadyPaid) {
          window.location.reload();
          return;
        }
        if (result.url) {
          window.location.href = result.url;
        }
      } catch {
        // Error handled silently — user can retry
      }
    });
  }

  return (
    <button
      onClick={handlePay}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      )}
      Pay Now
    </button>
  );
}
