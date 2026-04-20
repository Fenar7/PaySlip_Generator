"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function HelpError({
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
        <div className="slipwise-state-panel p-6 sm:p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[var(--accent-soft)] bg-[var(--surface-accent)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
            <span className="text-lg font-semibold">?</span>
          </div>

          <p className="mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
            Help center
          </p>
          <h1 className="mt-4 text-[2.1rem] leading-tight text-[var(--foreground)] sm:text-[2.6rem]">
            The support article could not be loaded.
          </h1>
          <p className="mt-4 text-[1rem] leading-8 text-[var(--foreground-soft)]">
            Reload the current article or head back to the help index. This keeps support
            content recoverable instead of dropping you into a blank page.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="slipwise-btn slipwise-btn-primary px-5 py-3 text-sm"
            >
              Try again
            </button>
            <Link href="/help" className="slipwise-btn slipwise-btn-secondary px-5 py-3 text-sm">
              Browse help center
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
