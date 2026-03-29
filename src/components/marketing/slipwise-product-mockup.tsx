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
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="relative mx-auto w-full max-w-[42rem]"
    >
      <div className="absolute -left-10 top-14 h-40 w-40 rounded-full bg-[rgba(103,203,255,0.22)] blur-3xl" />
      <div className="absolute -right-10 top-0 h-48 w-48 rounded-full bg-[rgba(45,107,255,0.24)] blur-3xl" />
      <div className="absolute bottom-8 right-10 h-28 w-28 rounded-full bg-[rgba(145,237,207,0.24)] blur-3xl" />

      <div className="relative overflow-hidden rounded-[2.7rem] border border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(238,244,255,0.72))] p-4 shadow-[var(--shadow-lift)] backdrop-blur-xl">
        <div className="overflow-hidden rounded-[2.2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(8,15,28,0.98),rgba(12,21,40,0.98))] p-4 text-white">
          <div className="flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-sm font-semibold">
                S
              </span>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-sky-100/90">
                  Slipwise
                </p>
                <p className="mt-1 text-sm text-slate-300">
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
                      ? "bg-white text-slate-950"
                      : "border border-white/12 bg-white/6 text-slate-200"
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
            <aside className="rounded-[1.8rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-sky-100/75">
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
                        ? "border-sky-300/30 bg-sky-300/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-xs leading-6 text-slate-300">{body}</p>
                  </div>
                ))}
              </div>
            </aside>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-[1.8rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-sky-100/75">
                        Live preview
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        Salary slip · Corporate Clean
                      </p>
                    </div>
                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-slate-200">
                      Export ready
                    </span>
                  </div>

                  <div className="mt-4 rounded-[1.4rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,244,255,0.98))] p-4 text-slate-900">
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
                  <section className="rounded-[1.8rem] border border-white/10 bg-white/6 p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-sky-100/75">
                      Team snapshot
                    </p>
                    <div className="mt-4 space-y-3">
                      {boardCards.map((card) => (
                        <div
                          key={card.label}
                          className={`rounded-[1rem] border border-white/10 px-4 py-3 ${card.tone}`}
                        >
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-200">
                            {card.label}
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-white">
                            {card.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[1.8rem] border border-sky-300/20 bg-[linear-gradient(180deg,rgba(45,107,255,0.22),rgba(103,203,255,0.14))] p-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-sky-50/90">
                      Slipwise benefit
                    </p>
                    <p className="mt-3 text-lg font-semibold text-white">
                      One product for structured inputs, instant preview, and professional export.
                    </p>
                    <p className="mt-2 text-sm leading-7 text-sky-50/80">
                      The same system supports vouchers, salary slips, and invoices without sending teams back to spreadsheets.
                    </p>
                  </section>
                </div>
              </div>

              <section className="rounded-[1.8rem] border border-white/10 bg-white/6 p-4">
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
                          ? "border-sky-300/30 bg-sky-300/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <p className="text-sm font-semibold text-white">{item}</p>
                      <p className="mt-1 text-xs leading-6 text-slate-300">
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
