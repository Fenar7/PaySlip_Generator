"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const workflowRows = [
  {
    label: "Salary slip",
    tone: "from-sky-500/10 via-white to-white",
    value: "Net salary",
    amount: "₹45,500.00",
  },
  {
    label: "Invoice",
    tone: "from-indigo-500/10 via-white to-white",
    value: "Balance due",
    amount: "₹39,100.00",
  },
  {
    label: "Voucher",
    tone: "from-emerald-500/10 via-white to-white",
    value: "Approved amount",
    amount: "₹1,850.00",
  },
];

const railItems = [
  {
    label: "Voucher workflow",
    hint: "Approval-ready and fast to export.",
  },
  {
    label: "Salary slip flow",
    hint: "Employee, payroll, and disbursement details in one view.",
  },
  {
    label: "Invoice flow",
    hint: "Line items, taxes, and payment summary organized cleanly.",
  },
];

export function SlipwiseProductMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="relative"
    >
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.25),transparent_45%),radial-gradient(circle_at_bottom,rgba(14,165,233,0.16),transparent_40%)] blur-3xl" />

      <div className="overflow-hidden rounded-[2.6rem] border border-slate-200/80 bg-white shadow-[0_44px_120px_rgba(15,23,42,0.16)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-400/90" />
              <span className="h-3 w-3 rounded-full bg-amber-400/90" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.36em] text-slate-500">
                Slipwise control room
              </p>
              <p className="mt-1 text-sm text-slate-600">
                One product for vouchers, salary slips, and invoices.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
            Live preview
          </span>
        </div>

        <div className="grid xl:grid-cols-[0.76fr_1.24fr]">
          <aside className="border-r border-slate-800/60 bg-[linear-gradient(180deg,#0f172a_0%,#111827_58%,#0b1220_100%)] px-5 py-6 text-white">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-sky-200/80">
              Current workspace
            </p>
            <div className="mt-4 space-y-3">
              {railItems.map((item, index) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-[1.35rem] border px-4 py-4 transition-transform duration-200",
                    index === 0
                      ? "border-sky-400/40 bg-white/10 shadow-[0_18px_30px_rgba(15,23,42,0.18)]"
                      : "border-white/10 bg-white/5",
                  )}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-300">
                    {item.hint}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(59,130,246,0.18),rgba(15,23,42,0.32))] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-sky-200/80">
                What the team gets
              </p>
              <p className="mt-3 text-lg font-semibold leading-7">
                A calmer workflow that still feels sharp and premium.
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Keep the preview, brand, and export story inside one polished product surface.
              </p>
            </div>
          </aside>

          <div className="bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] p-5 lg:p-6">
            <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-slate-500">
                      Workspace preview
                    </p>
                    <h3 className="mt-2 text-xl text-slate-950">
                      Ready to export without cleanup
                    </h3>
                  </div>
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                    A4 canvas
                  </span>
                </div>

                <div className="mt-5 rounded-[1.7rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-3 w-20 rounded-full bg-slate-900/10" />
                      <div className="mt-3 h-5 w-52 rounded-full bg-slate-900/18" />
                    </div>
                    <div className="h-11 w-11 rounded-full border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4"
                      >
                        <div className="h-2.5 w-20 rounded-full bg-slate-900/10" />
                        <div className="mt-3 h-3.5 w-28 rounded-full bg-slate-900/16" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-[1.7rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_22px_50px_rgba(15,23,42,0.2)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-sky-200">
                    Export confidence
                  </p>
                  <p className="mt-3 text-lg font-semibold leading-7">
                    Fast enough for admins. Polished enough for the business.
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Slipwise keeps preview, print, PDF, and PNG aligned without turning the workflow into design work.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-slate-500">
                        Snapshot
                      </p>
                      <p className="mt-2 text-lg text-slate-950">
                        One surface, three document types.
                      </p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                      Live
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {workflowRows.map((row, index) => (
                      <motion.div
                        key={row.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.06 }}
                        className={cn(
                          "rounded-[1.3rem] border border-slate-200 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.04)]",
                          `bg-gradient-to-br ${row.tone}`,
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                              {row.label}
                            </p>
                            <p className="mt-2 text-sm text-slate-600">{row.value}</p>
                          </div>
                          <p className="text-lg font-semibold text-slate-950">{row.amount}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Modules", "3 workflows"],
                    ["Exports", "Print, PDF, PNG"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                        {label}
                      </p>
                      <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_65%)] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-sky-700">
                    Slipwise signal
                  </p>
                  <p className="mt-3 text-base leading-7 text-slate-700">
                    The product should feel like a launchable SaaS UI, not a utility shell.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
