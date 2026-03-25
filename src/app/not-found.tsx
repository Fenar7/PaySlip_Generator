import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-8 text-center shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
          Not found
        </p>
        <h1 className="mt-4 text-4xl text-[var(--foreground)]">
          This workspace does not exist yet.
        </h1>
        <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
          Head back to the product shell and continue from one of the supported
          module routes.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-[var(--background)]"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
