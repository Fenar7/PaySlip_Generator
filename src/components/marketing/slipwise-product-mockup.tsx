"use client";

import { motion } from "motion/react";

const boardCards = [
  { label: "Salary slip", value: "₹45,500", tone: "bg-[rgba(103,203,255,0.12)]" },
  { label: "Invoice due", value: "₹39,100", tone: "bg-[rgba(45,107,255,0.12)]" },
  { label: "Voucher ready", value: "₹1,850", tone: "bg-[rgba(145,237,207,0.16)]" },
];

export function SlipwiseProductMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative mx-auto w-full max-w-[38rem]"
    >
      <div className="absolute -left-8 top-10 h-28 w-28 rounded-full bg-[rgba(103,203,255,0.14)] blur-3xl" />
      <div className="absolute -right-8 top-2 h-36 w-36 rounded-full bg-[rgba(45,107,255,0.14)] blur-3xl" />

      <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,247,255,0.96))] p-4 shadow-[var(--shadow-card)]">
        <div className="overflow-hidden rounded-[1.7rem] border border-[var(--border-soft)] bg-white p-4 text-[var(--foreground)]">
          <div className="flex items-center justify-between rounded-[1.2rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--foreground)] text-sm font-semibold text-white">
                S
              </span>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                  Slipwise
                </p>
                <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                  Multi-document workspace
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {["Salary slip", "Invoice", "Voucher"].map((item, index) => (
                <span
                  key={item}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    index === 0
                      ? "bg-[var(--foreground)] text-white"
                      : "border border-[var(--border-soft)] bg-white text-[var(--foreground-soft)]"
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
            <aside className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                Workflow stack
              </p>
              <div className="mt-4 space-y-3">
                {[
                  ["Branding", "Logo, accent, identity"],
                  ["Inputs", "Structured document fields"],
                  ["Preview", "Live A4 output"],
                  ["Export", "Print, PDF, PNG"],
                ].map(([title, body], index) => (
                  <div
                    key={title}
                    className={`rounded-[1.2rem] border px-4 py-3 ${
                      index === 2
                        ? "border-[rgba(45,107,255,0.2)] bg-[rgba(45,107,255,0.08)]"
                        : "border-[var(--border-soft)] bg-white"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
                    <p className="mt-1 text-xs leading-6 text-[var(--muted-foreground)]">{body}</p>
                  </div>
                ))}
              </div>
            </aside>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
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

                  <div className="mt-4 rounded-[1.25rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(242,247,255,0.98))] p-4 text-slate-900">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="h-2.5 w-24 rounded-full bg-slate-200" />
                        <div className="mt-3 h-4 w-40 rounded-full bg-slate-300" />
                      </div>
                      <div className="h-11 w-11 rounded-2xl border border-slate-200 bg-white" />
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3"
                        >
                          <div className="h-2 w-16 rounded-full bg-slate-200" />
                          <div className="mt-3 h-3 w-24 rounded-full bg-slate-300" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-[1rem] bg-slate-50 px-3 py-3">
                      <div className="flex items-center justify-between">
                        <span className="h-2.5 w-24 rounded-full bg-slate-200" />
                        <span className="h-3 w-16 rounded-full bg-sky-200" />
                      </div>
                      <div className="mt-3 space-y-2">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-xl bg-white px-3 py-2"
                          >
                            <span className="h-2 w-20 rounded-full bg-slate-200" />
                            <span className="h-2 w-10 rounded-full bg-slate-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="space-y-4">
                  <section className="rounded-[1.5rem] border border-[var(--border-soft)] bg-white p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                      Team snapshot
                    </p>
                    <div className="mt-4 space-y-3">
                      {boardCards.map((card) => (
                        <div
                          key={card.label}
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
                    </div>
                  </section>

                  <section className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--foreground)] p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-slate-300">
                      Product benefit
                    </p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      One product for structured inputs, instant preview, and professional export.
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      The same system supports vouchers, salary slips, and invoices without sending teams back to spreadsheets.
                    </p>
                  </section>
                </div>
              </div>

              <section className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    "Brand setup",
                    "Generator templates",
                    "Print, PDF, PNG",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className={`rounded-[1.1rem] border px-4 py-3 ${
                        index === 1
                          ? "border-[rgba(45,107,255,0.2)] bg-[rgba(45,107,255,0.08)]"
                          : "border-[var(--border-soft)] bg-white"
                      }`}
                    >
                      <p className="text-sm font-semibold text-[var(--foreground)]">{item}</p>
                      <p className="mt-1 text-xs leading-6 text-[var(--muted-foreground)]">
                        Product-grade workflow blocks that stay cohesive across the app.
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
