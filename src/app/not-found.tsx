import Link from "next/link";

export default function NotFound() {
  return (
    <main className="slipwise-shell-bg flex min-h-screen items-center justify-center px-6 py-16">
      <section className="slipwise-state-shell w-full max-w-2xl p-5 sm:p-7">
        <div className="relative">
          <div className="slipwise-state-panel p-6 text-center sm:p-8">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[var(--accent-soft)] bg-[var(--surface-accent)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
              <span className="text-lg font-semibold">404</span>
            </div>

            <p className="mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
              Not found
            </p>
            <h1 className="mt-4 text-[2.35rem] leading-[0.96] text-[var(--foreground)] sm:text-[3rem]">
              This workspace does not exist yet.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[1rem] leading-8 text-[var(--foreground-soft)]">
              Head back to the product shell and continue from one of the supported
              module routes.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/"
                className="slipwise-btn slipwise-btn-primary px-5 py-3 text-sm"
              >
                Return home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
