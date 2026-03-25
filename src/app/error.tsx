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
          The shell hit an error.
        </h1>
        <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
          The foundation phase includes a recovery path so the workspace does not
          fail silently while later generator features are added.
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
