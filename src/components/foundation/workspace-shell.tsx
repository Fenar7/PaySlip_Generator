import Link from "next/link";
import { PreviewFrame } from "@/components/foundation/preview-frame";
import { slipwiseBrand } from "@/components/foundation/slipwise-brand";

type WorkspaceShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  configurationSections: string[];
  previewSummary: string;
};

export function WorkspaceShell({
  eyebrow,
  title,
  description,
  configurationSections,
  previewSummary,
}: WorkspaceShellProps) {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(232,64,30,0.10),transparent_36%),radial-gradient(circle_at_80%_10%,rgba(87,87,96,0.05),transparent_26%)]" />
      <div className="mx-auto flex w-full max-w-[var(--container-shell)] flex-col gap-8 px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
        <div className="flex flex-col gap-6 rounded-[2.5rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,240,234,0.96))] p-6 shadow-[var(--shadow-card)] backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-2xl text-[2.6rem] leading-[0.98] tracking-[-0.05em] text-[var(--foreground)] md:text-[3.6rem]">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-[1.02rem] leading-8 text-[var(--muted-foreground)]">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-colors hover:bg-[var(--surface-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Back to home
            </Link>
            <span className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-2 text-sm font-medium text-white shadow-[0_16px_32px_rgba(34,34,34,0.10)]">
              {slipwiseBrand.shellStatus}
            </span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(22rem,29rem)_minmax(0,1fr)]">
          <section className="rounded-[2.25rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,240,234,0.96))] p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                  Configuration panel
                </p>
                <h2 className="mt-3 text-[1.55rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                  Form and controls shell
                </h2>
              </div>
              <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)] shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                Slipwise
              </span>
            </div>

            <div className="space-y-4">
              {configurationSections.map((section) => (
                <article
                  key={section}
                  className="rounded-[1.5rem] border border-[var(--border-soft)] bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.03)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-[1rem] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                        {section}
                      </h3>
                      <p className="mt-1 text-sm leading-7 text-[var(--muted-foreground)]">
                        This section belongs to the Slipwise product shell.
                      </p>
                    </div>
                    <span className="h-10 w-10 rounded-2xl border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(232,64,30,0.08),rgba(255,255,255,1))] shadow-[0_10px_24px_rgba(34,34,34,0.03)]" />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <PreviewFrame title={title} summary={previewSummary} />
          </section>
        </div>
      </div>
    </main>
  );
}
