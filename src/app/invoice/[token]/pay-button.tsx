"use client";

import { useState } from "react";

interface PublicPayButtonProps {
  paymentLinkUrl: string;
  paymentLinkStatus: string | null;
  paymentLinkExpiresAt: string | null;
  remainingAmount: number;
}

export function PublicPayButton({
  paymentLinkUrl,
  paymentLinkStatus,
  paymentLinkExpiresAt,
  remainingAmount,
}: PublicPayButtonProps) {
  const [clicked, setClicked] = useState(false);

  const isExpired =
    paymentLinkStatus === "expired" ||
    paymentLinkStatus === "cancelled" ||
    (paymentLinkExpiresAt && new Date(paymentLinkExpiresAt) < new Date());

  if (isExpired || paymentLinkStatus === "paid") return null;

  function handlePay() {
    setClicked(true);
    window.location.href = paymentLinkUrl;
  }

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(remainingAmount);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <div className="text-center space-y-3">
        <div>
          <p className="text-sm font-medium text-blue-900">Pay Online</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{formattedAmount}</p>
        </div>
        <button
          type="button"
          onClick={handlePay}
          disabled={clicked}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {clicked ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          )}
          Pay Now with Razorpay
        </button>
        <p className="text-xs text-blue-600">Secure payment powered by Razorpay</p>
      </div>
    </div>
  );
}
