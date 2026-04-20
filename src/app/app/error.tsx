"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function WorkspaceError({
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
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl items-center px-6 py-10">
      <section className="slipwise-state-shell w-full p-5 sm:p-7">
        <div className="slipwise-state-panel p-6 sm:p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[var(--accent-soft)] bg-[var(--surface-accent)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
            <span className="text-xl font-semibold">!</span>
          </div>

          <p className="mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
            Workspace recovery
          </p>
          <h1 className="mt-4 max-w-xl text-[2rem] leading-tight text-[var(--foreground)] sm:text-[2.5rem]">
            This workspace hit an unexpected issue.
          </h1>
          <p className="mt-4 max-w-xl text-[1rem] leading-8 text-[var(--foreground-soft)]">
            Reset the current view or step back to the product shell. The rest of Slipwise
            stays available so one failing route does not take the whole app down with it.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="slipwise-btn slipwise-btn-primary px-5 py-3 text-sm"
            >
              Try again
            </button>
            <Link href="/app/home" className="slipwise-btn slipwise-btn-secondary px-5 py-3 text-sm">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
