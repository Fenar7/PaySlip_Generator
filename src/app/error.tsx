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
    <main className="slipwise-shell-bg flex min-h-screen items-center justify-center px-6 py-16">
      <section className="slipwise-state-shell w-full max-w-2xl p-5 sm:p-7">
        <div className="relative">
          <div className="slipwise-state-panel p-6 sm:p-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[var(--accent-soft)] bg-[var(--surface-accent)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
              <span className="text-xl font-semibold">!</span>
            </div>

            <p className="mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
              Unexpected issue
            </p>
            <h1 className="mt-4 max-w-xl text-[2.35rem] leading-[0.96] text-[var(--foreground)] sm:text-[3rem]">
              Slipwise hit an unexpected error.
            </h1>
            <p className="mt-4 max-w-xl text-[1rem] leading-8 text-[var(--foreground-soft)]">
              Reload the current view and try again. This recovery screen keeps the
              product explicit when something fails instead of leaving you in a broken
              workspace state.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="slipwise-btn slipwise-btn-primary px-5 py-3 text-sm"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
