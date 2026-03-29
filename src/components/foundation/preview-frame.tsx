type PreviewFrameProps = {
  title: string;
  summary: string;
};

export function PreviewFrame({ title, summary }: PreviewFrameProps) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(241,245,249,0.98))] p-4 shadow-[var(--shadow-card)]">
      <div className="absolute inset-x-10 top-0 h-24 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.16),transparent_70%)] blur-3xl" />
      <div className="relative rounded-[1.5rem] border border-[var(--border-soft)] bg-white p-6">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-4">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
              A4 Preview Surface
            </p>
            <h3 className="mt-2 text-xl text-[var(--foreground)]">{title}</h3>
          </div>
          <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
            Slipwise canvas
          </span>
        </div>

        <div className="grid gap-6 py-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border-soft)] px-4 py-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="h-3 w-20 rounded-full bg-[var(--ink-soft)]/20" />
                  <div className="mt-3 h-5 w-44 rounded-full bg-[var(--ink-soft)]/35" />
                </div>
                <div className="h-10 w-10 rounded-full border border-[var(--border-soft)]" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-[var(--border-soft)] px-3 py-3"
                  >
                    <div className="h-2.5 w-16 rounded-full bg-[var(--ink-soft)]/20" />
                    <div className="mt-3 h-3 w-28 rounded-full bg-[var(--ink-soft)]/35" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-soft)] px-4 py-5">
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 rounded-full bg-[var(--ink-soft)]/20" />
                <div className="h-3 w-20 rounded-full bg-[var(--accent)]/30" />
              </div>
              <div className="mt-5 space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-xl bg-[var(--surface-soft)] px-3 py-3"
                  >
                    <div className="h-2.5 w-24 rounded-full bg-[var(--ink-soft)]/20" />
                    <div className="h-2.5 w-12 rounded-full bg-[var(--ink-soft)]/35" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div className="h-3 w-20 rounded-full bg-[var(--ink-soft)]/20" />
            <p className="mt-4 text-sm leading-7 text-[var(--muted-foreground)]">
              {summary}
            </p>
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[var(--border-soft)] bg-white px-3 py-3"
                >
                  <div className="h-2.5 w-14 rounded-full bg-[var(--ink-soft)]/20" />
                  <div className="mt-3 h-3 w-full rounded-full bg-[var(--ink-soft)]/20" />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
