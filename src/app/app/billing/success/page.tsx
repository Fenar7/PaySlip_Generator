"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function BillingSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planName = searchParams.get("plan") ?? "your new plan";

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/app");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Payment Successful! 🎉
        </h1>
        <p className="mt-3 text-gray-600">
          Your plan has been upgraded to{" "}
          <span className="font-semibold text-indigo-600">{planName}</span>.
        </p>
        <p className="mt-4 text-sm text-gray-400">
          Redirecting to dashboard...
        </p>
        <div className="mt-4">
          <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full animate-[loading_3s_linear] bg-indigo-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
