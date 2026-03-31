"use client";

const boardCards = [
  { label: "Salary slip", value: "₹45,500", tone: "bg-[rgba(232,64,30,0.09)]" },
  { label: "Invoice due", value: "₹39,100", tone: "bg-[rgba(34,34,34,0.06)]" },
  { label: "Voucher ready", value: "₹1,850", tone: "bg-[rgba(173,173,173,0.14)]" },
];

export function SlipwiseProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem]">
      <div className="absolute -left-6 top-10 h-24 w-24 rounded-full bg-[rgba(232,64,30,0.06)] blur-[70px]" />
      <div className="absolute -right-6 top-2 h-32 w-32 rounded-full bg-[rgba(34,34,34,0.05)] blur-[80px]" />

      <div data-animate="mockup-shell" className="relative overflow-hidden rounded-[1.75rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,241,235,0.96))] p-3 shadow-[var(--shadow-card)]">
        <div className="overflow-hidden rounded-[1.45rem] border border-[var(--border-soft)] bg-white p-4 text-[var(--foreground)]">
          <div data-animate="mockup-pane" className="flex items-center justify-between rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-white text-sm font-semibold text-[var(--accent)]">
                S
              </span>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                  Slipwise
                </p>
                <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                  Document workspace
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {["Salary slip", "Invoice", "Voucher"].map((item, index) => (
                <span
                  key={item}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    index === 0
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--border-soft)] bg-white text-[var(--foreground-soft)]"
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <section data-animate="mockup-pane" className="rounded-[1.25rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                    Live preview
                  </p>
                  <p className="mt-2 text-sm text-[var(--foreground-soft)]">
                    Salary slip · Corporate Clean
                  </p>
                </div>
                <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-xs text-[var(--muted-foreground)]">
                  Export ready
                </span>
              </div>

              <div className="mt-4 rounded-[1rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,240,234,0.98))] p-4 text-slate-900">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="h-2.5 w-24 rounded-full bg-slate-200" />
                    <div className="mt-3 h-4 w-40 rounded-full bg-slate-300" />
                  </div>
                  <div className="h-10 w-10 rounded-xl border border-slate-200 bg-white" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-[0.9rem] border border-slate-200 bg-white px-3 py-3"
                    >
                      <div className="h-2 w-16 rounded-full bg-slate-200" />
                      <div className="mt-3 h-3 w-24 rounded-full bg-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-3">
              {boardCards.map((card) => (
                <div
                  key={card.label}
                  data-animate="mockup-stat"
                  className={`rounded-[1rem] border border-[var(--border-soft)] px-4 py-3 ${card.tone}`}
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {card.value}
                  </p>
                </div>
              ))}
            </section>

            <section data-animate="mockup-pane" className="rounded-[1.25rem] border border-[var(--border-soft)] bg-white p-4">
              <div className="grid gap-3 md:grid-cols-3">
                {["Brand setup", "Live preview", "Export flow"].map((item) => (
                  <div
                    key={item}
                    data-animate="mockup-capability"
                    className="rounded-[0.95rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-[var(--foreground)]">{item}</p>
                    <p className="mt-1 text-xs leading-6 text-[var(--muted-foreground)]">
                      Clean product surfaces that stay consistent across the workflow.
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
