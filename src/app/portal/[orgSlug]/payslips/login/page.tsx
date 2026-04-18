"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestEmployeeOtp, verifyEmployeeOtp } from "../actions";

export default function EmployeeLoginPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = React.use(params);
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequestOtp() {
    if (!email.trim()) {
      setError("Enter your work email address");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await requestEmployeeOtp(orgSlug, email);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStep("otp");
    });
  }

  function handleVerifyOtp() {
    if (!otp.trim()) {
      setError("Enter the 6-digit code");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyEmployeeOtp(orgSlug, email, otp);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/portal/${orgSlug}/payslips`);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              Employee Pay Portal
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {step === "email"
                ? "Enter your work email to receive a one-time code"
                : `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {step === "email" ? (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRequestOtp()}
                placeholder="you@company.com"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={handleRequestOtp}
                disabled={isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? "Sending…" : "Send Code"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
                placeholder="123456"
                inputMode="numeric"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={handleVerifyOtp}
                disabled={isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {isPending ? "Verifying…" : "Sign In"}
              </button>
              <button
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setError(null);
                }}
                className="w-full text-sm text-slate-500 hover:text-slate-700"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
