"use client";

import { useState, useTransition } from "react";
import { bulkCreatePaymentLinks } from "@/app/app/docs/invoices/payment-link-actions";

interface Props {
  invoiceIds: string[];
}

export function BulkPaymentLinkButton({ invoiceIds }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    succeeded: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (invoiceIds.length === 0) return null;

  function handleClick() {
    setResult(null);
    setError(null);
    startTransition(async () => {
      const res = await bulkCreatePaymentLinks(invoiceIds);
      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Generating…
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Generate Payment Links ({invoiceIds.length})
          </>
        )}
      </button>

      {result && (
        <span className="text-xs text-slate-600">
          {result.succeeded > 0 && (
            <span className="text-green-700 font-medium">{result.succeeded} created</span>
          )}
          {result.failed > 0 && (
            <span className="ml-1 text-red-600">{result.failed} failed</span>
          )}
        </span>
      )}

      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
