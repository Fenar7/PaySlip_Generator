"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-8 shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
          Unexpected issue
        </p>
        <h1 className="mt-4 text-4xl text-[var(--foreground)]">
          Slipwise hit an unexpected error.
        </h1>
        <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
          Reload the current view and try the action again. The recovery path is
          here so the workspace never fails silently while you are working.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-[var(--background)]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
