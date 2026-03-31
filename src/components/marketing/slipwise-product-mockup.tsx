"use client";

const workspaceTabs = ["Salary slip", "Invoice", "Voucher"];

const statCards = [
  { label: "Salary run", value: "₹45,500", tone: "bg-[rgba(232,64,30,0.08)]" },
  { label: "Invoice due", value: "₹39,100", tone: "bg-[rgba(34,34,34,0.05)]" },
  { label: "Voucher total", value: "₹1,850", tone: "bg-[rgba(173,173,173,0.12)]" },
];

const railItems = [
  { title: "Brand", detail: "Identity, logo, and sender details" },
  { title: "Review", detail: "Live document updates while editing" },
  { title: "Export", detail: "PDF, PNG, and print-ready output" },
];

export function SlipwiseProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[39rem]">
      <div className="absolute -left-10 top-12 h-28 w-28 rounded-full bg-[rgba(232,64,30,0.06)] blur-[82px]" />
      <div className="absolute -right-8 top-8 h-36 w-36 rounded-full bg-[rgba(87,87,96,0.06)] blur-[96px]" />

      <div
        data-animate="mockup-shell"
        className="relative overflow-hidden rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,239,232,0.98))] p-3 shadow-[var(--shadow-card)]"
      >
        <div className="overflow-hidden rounded-[1.6rem] border border-[var(--border-soft)] bg-[rgba(255,252,248,0.96)] p-4 text-[var(--foreground)]">
          <div
            data-animate="mockup-pane"
            className="flex flex-col gap-4 rounded-[1.3rem] border border-[var(--border-soft)] bg-white/92 px-4 py-4 shadow-[0_14px_34px_rgba(34,34,34,0.05)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-accent)] text-sm font-semibold text-[var(--accent)]">
                  S
                </span>
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
                    Slipwise
                  </p>
                  <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                    Document workspace
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {workspaceTabs.map((tab, index) => (
                  <span
                    key={tab}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      index === 0
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border-soft)] bg-white text-[var(--foreground-soft)]"
                    }`}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[11rem_minmax(0,1fr)]">
              <aside
                data-animate="mockup-pane"
                className="rounded-[1.2rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(248,243,238,0.96),rgba(255,255,255,0.98))] p-3"
              >
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.26em] text-[var(--muted-foreground)]">
                  Workflow rail
                </p>
                <div className="mt-3 space-y-2.5">
                  {railItems.map((item) => (
                    <div
                      key={item.title}
                      data-animate="mockup-capability"
                      className="rounded-[0.95rem] border border-[var(--border-soft)] bg-white px-3 py-3"
                    >
                      <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </aside>

              <section
                data-animate="mockup-pane"
                className="rounded-[1.3rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(248,243,238,0.96),rgba(255,255,255,0.98))] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
                      Live preview
                    </p>
                    <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                      Salary slip · Corporate Clean
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-[0.68rem] text-[var(--muted-foreground)]">
                    Export ready
                  </span>
                </div>

                <div className="mt-4 rounded-[1.1rem] border border-[var(--border-soft)] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(34,34,34,0.05)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="h-2.5 w-24 rounded-full bg-[rgba(87,87,96,0.12)]" />
                      <div className="mt-3 h-4 w-40 rounded-full bg-[rgba(34,34,34,0.18)]" />
                    </div>
                    <div className="h-10 w-10 rounded-[0.9rem] border border-[var(--border-soft)] bg-[var(--surface-accent)]" />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-[0.95rem] border border-[var(--border-soft)] bg-[rgba(250,246,242,0.92)] px-3 py-3"
                      >
                        <div className="h-2 w-16 rounded-full bg-[rgba(87,87,96,0.12)]" />
                        <div className="mt-3 h-3 w-24 rounded-full bg-[rgba(34,34,34,0.16)]" />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <section className="grid gap-3 md:grid-cols-3">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  data-animate="mockup-stat"
                  className={`rounded-[1.05rem] border border-[var(--border-soft)] px-4 py-3 ${card.tone}`}
                >
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                    {card.label}
                  </p>
                  <p className="mt-2 text-[1.7rem] font-medium text-[var(--foreground)]">
                    {card.value}
                  </p>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
