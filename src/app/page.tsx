import Link from "next/link";
import { ModuleCard } from "@/components/foundation/module-card";
import { productModules } from "@/lib/modules";

export default function Home() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-[-14rem] -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(198,152,84,0.24),transparent_40%)]" />
      <div className="absolute inset-x-0 top-32 -z-10 h-[24rem] bg-[radial-gradient(circle_at_20%_20%,rgba(108,122,118,0.12),transparent_38%)]" />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-8 lg:px-8 lg:py-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-white text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-card)]">
              BD
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                Phase 1 foundation
              </p>
              <p className="text-sm text-[var(--foreground-soft)]">
                Business Document Generator
              </p>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <a
              href="#modules"
              className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-[var(--foreground)] transition-colors hover:bg-white"
            >
              Modules
            </a>
            <Link
              href="/salary-slip"
              className="rounded-full bg-[var(--foreground)] px-4 py-2 font-medium text-[var(--background)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Open app shell
            </Link>
          </nav>
        </header>

        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--muted-foreground)]">
              Calm, branded document workspaces
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl leading-[1.02] text-[var(--foreground)] md:text-7xl">
              Generate vouchers, salary slips, and invoices without touching a
              design tool.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
              The foundation phase establishes a premium shell for fast,
              document-first workflows. Each module is staged to support clean
              forms, live preview, and export-ready output in later phases.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/voucher"
                className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-[var(--background)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                Explore workspaces
              </Link>
              <a
                href="#modules"
                className="rounded-full border border-[var(--border-strong)] px-5 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white"
              >
                See the modules
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
              Foundation focus
            </p>
            <div className="mt-6 space-y-4">
              {[
                "Premium landing and navigation flow",
                "Generator route shells with A4 preview framing",
                "Shared design tokens, motion, and accessibility baseline",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] border border-[var(--border-soft)] bg-white px-4 py-4"
                >
                  <p className="text-sm leading-7 text-[var(--foreground-soft)]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="modules"
          className="rounded-[2.4rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)] md:p-8"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                Product modules
              </p>
              <h2 className="mt-3 text-3xl text-[var(--foreground)] md:text-4xl">
                Three focused workspaces, one consistent shell.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[var(--muted-foreground)]">
              Each module already has its route and layout foundation, ready for
              forms, live previews, and export logic in the next phases.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {productModules.map((module, index) => (
              <ModuleCard key={module.slug} module={module} index={index} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
