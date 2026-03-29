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
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.16),transparent_38%)]" />
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-8 px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
        <div className="flex flex-col gap-6 rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)] backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl leading-tight text-[var(--foreground)] md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--muted-foreground)]">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
            >
              Back to home
            </Link>
            <span className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)]">
              {slipwiseBrand.shellStatus}
            </span>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(20rem,27rem)_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-card)]">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                  Configuration panel
                </p>
                <h2 className="mt-3 text-2xl text-[var(--foreground)]">
                  Form and controls shell
                </h2>
              </div>
              <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                Slipwise
              </span>
            </div>

            <div className="space-y-4">
              {configurationSections.map((section) => (
                <article
                  key={section}
                  className="rounded-[1.5rem] border border-[var(--border-soft)] bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-medium text-[var(--foreground)]">
                        {section}
                      </h3>
                      <p className="mt-1 text-sm leading-7 text-[var(--muted-foreground)]">
                        This section belongs to the Slipwise product shell.
                      </p>
                    </div>
                    <span className="h-9 w-9 rounded-full border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(37,99,235,0.08),rgba(255,255,255,1))]" />
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
