"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { productModules } from "@/lib/modules";

type SlipwiseHomeProps = {
  className?: string;
};

const featureCards = [
  {
    title: "Live preview first",
    body: "See every document update immediately in a clean A4 frame before exporting it.",
  },
  {
    title: "Brand-ready exports",
    body: "Keep company identity, logos, and accent color aligned across all three generators.",
  },
  {
    title: "Minimal friction",
    body: "No spreadsheet wrangling, no design tooling, no complex setup to create something professional.",
  },
  {
    title: "Serverless deployability",
    body: "The current architecture stays simple enough to ship on Vercel without extra infrastructure.",
  },
];

const useCases = [
  {
    title: "SMB Ops",
    body: "Create vouchers and admin-facing approvals without switching tools.",
  },
  {
    title: "HR / People Ops",
    body: "Produce salary slips with a clean employee, earnings, and disbursement flow.",
  },
  {
    title: "Finance / Accounts",
    body: "Prepare branded invoices with taxes, line items, and payment summaries already structured.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Enter details",
    body: "Fill in the fields for the document type you need. Slipwise keeps each module focused and readable.",
  },
  {
    step: "02",
    title: "Review instantly",
    body: "The preview updates as you work, so you can catch layout or content issues before exporting.",
  },
  {
    step: "03",
    title: "Export cleanly",
    body: "Download PDF, PNG, or open the print surface with professional output ready to share.",
  },
];

const faqs = [
  {
    q: "What does Slipwise generate?",
    a: "Slipwise supports vouchers, salary slips, and invoices in one browser-based product.",
  },
  {
    q: "Does Slipwise store my data?",
    a: "Not in this phase. The current product remains stateless and deployable without backend persistence.",
  },
  {
    q: "Can I brand the output?",
    a: "Yes. The product supports logo upload and accent color controls for the current document session.",
  },
  {
    q: "Is it suitable for production deployment?",
    a: "Yes. The product is designed to remain serverless-friendly and deploy cleanly on Vercel.",
  },
  {
    q: "What file outputs are available?",
    a: "Slipwise supports live preview, browser print, PDF export, and PNG export.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto text-center" : "text-left")}>
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-slate-500">
        {eyebrow}
      </p>
      <h2 className="mt-4 max-w-3xl font-[family-name:var(--font-sora)] text-3xl leading-tight text-slate-950 md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
        {description}
      </p>
    </div>
  );
}

export function SlipwiseHome({ className }: SlipwiseHomeProps) {
  return (
    <main
      className={cn(
        "min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_32%),linear-gradient(180deg,#ffffff_0%,#f8fbff_48%,#f7f9fc_100%)] font-[family-name:var(--font-manrope)] text-slate-900",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_38%)]" />
      <div className="absolute inset-x-0 top-[32rem] -z-10 h-64 bg-[radial-gradient(circle_at_25%_25%,rgba(14,165,233,0.08),transparent_36%)]" />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-slate-200 bg-white/80 px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.15)]">
              S
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-500">
                Slipwise
              </p>
              <p className="text-sm text-slate-700">Business documents without the spreadsheet chaos.</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            {[
              ["Product", "#features"],
              ["Use cases", "#use-cases"],
              ["Workflow", "#workflow"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="rounded-full px-4 py-2 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/voucher"
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
            >
              View generators
            </Link>
            <Link
              href="/voucher"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)] transition-transform hover:-translate-y-0.5"
            >
              Start free
            </Link>
          </div>
        </header>

        <section className="grid gap-12 lg:grid-cols-[minmax(0,1.12fr)_minmax(26rem,0.88fr)] lg:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
              SaaS document generation for SMB teams
            </div>
            <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-sora)] text-5xl leading-[0.95] tracking-[-0.05em] text-slate-950 md:text-7xl">
              A production-ready way to create vouchers, salary slips, and invoices that look polished from the first scroll.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
              Slipwise turns everyday admin documents into a clean SaaS workflow: enter details, preview instantly, and export professional output without opening a design tool or fixing spreadsheet formatting.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/voucher"
                className="rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.16)] transition-transform hover:-translate-y-0.5"
              >
                Start with vouchers
              </Link>
              <a
                href="#features"
                className="rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
              >
                See product features
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                "Voucher, salary slip, and invoice flows",
                "PDF, PNG, and print export readiness",
                "Serverless deployment on Vercel",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600 shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative"
          >
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.20),transparent_50%)] blur-2xl" />
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_36px_90px_rgba(15,23,42,0.09)]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
                    Product preview
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    A clean SaaS workspace for business documents.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                  Live preview
                </span>
              </div>

              <div className="mt-5 grid gap-4">
                {[
                  {
                    title: "Salary slip",
                    value: "Net salary",
                    amount: "₹45,500.00",
                    tone: "from-sky-500/12 via-white to-white",
                  },
                  {
                    title: "Invoice",
                    value: "Balance due",
                    amount: "₹39,100.00",
                    tone: "from-indigo-500/12 via-white to-white",
                  },
                  {
                    title: "Voucher",
                    value: "Approved amount",
                    amount: "₹1,850.00",
                    tone: "from-emerald-500/12 via-white to-white",
                  },
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.07 }}
                    className={cn(
                      "rounded-[1.5rem] border border-slate-200 bg-gradient-to-br p-4 shadow-[0_16px_30px_rgba(15,23,42,0.05)]",
                      item.tone,
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                          {item.title}
                        </p>
                        <p className="mt-2 text-sm text-slate-600">{item.value}</p>
                      </div>
                      <p className="text-lg font-semibold text-slate-950">{item.amount}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-sky-200">
                  Slipwise benefit
                </p>
                <p className="mt-3 text-xl font-semibold">
                  Fast enough for admins. Polished enough for the business.
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Keep every document consistent across preview, print, PDF, and PNG without changing your workflow.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] md:p-8">
          <SectionHeading
            eyebrow="Feature story"
            title="Slipwise brings the whole document workflow into one clean product system."
            description="The homepage should sell the same thing the app delivers: a clear, premium, browser-based way to create business documents without the mess of manual formatting."
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.35 }}
              className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
                Why it feels different
              </p>
              <div className="mt-5 space-y-4 text-slate-700">
                <p>Slipwise is meant to feel like a real SaaS product, not a shell or an internal tool.</p>
                <p>It presents the three document flows as part of one coherent system, with a brand-first public site and a calmer app experience.</p>
                <p>It is designed to be simple enough for daily use while staying polished enough for a serious demo or production rollout.</p>
              </div>
            </motion.div>

            <div className="grid gap-5 sm:grid-cols-2">
              {featureCards.map((card, index) => (
                <motion.article
                  key={card.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]"
                >
                  <p className="text-sm font-semibold text-slate-950">{card.title}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="use-cases" className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] md:p-8">
          <SectionHeading
            eyebrow="Use cases"
            title="Built for the people who actually prepare documents every week."
            description="The product should clearly speak to the users who need speed, consistency, and export quality in a small business setting."
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {useCases.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                  {item.title}
                </p>
                <p className="mt-4 text-base leading-8 text-slate-700">{item.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="workflow" className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] md:p-8">
          <SectionHeading
            eyebrow="How it works"
            title="Three steps from raw data to professional output."
            description="Slipwise should make the workflow obvious enough that a first-time visitor immediately understands how the product behaves."
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {workflow.map((step, index) => (
              <motion.article
                key={step.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="rounded-[1.6rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.04)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-700">
                  {step.step}
                </p>
                <h3 className="mt-4 font-[family-name:var(--font-sora)] text-2xl text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] md:p-8">
          <SectionHeading
            eyebrow="Generators"
            title="Three focused workspaces, one polished product."
            description="Keep the modules distinct so users can move directly into the workflow they need without losing the consistency of the Slipwise brand."
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {productModules.map((module, index) => (
              <motion.article
                key={module.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="group flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                      {module.eyebrow}
                    </p>
                    <h3 className="mt-3 font-[family-name:var(--font-sora)] text-2xl text-slate-950">
                      {module.name}
                    </h3>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                    SaaS ready
                  </span>
                </div>

                <p className="mt-4 text-sm leading-7 text-slate-600">{module.description}</p>

                <ul className="mt-6 space-y-3 text-sm text-slate-700">
                  {module.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-3">
                      <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-sky-500" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/${module.slug}`}
                  className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                >
                  Open {module.name}
                  <span aria-hidden="true">→</span>
                </Link>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="faq" className="rounded-[2.25rem] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] md:p-8">
          <SectionHeading
            eyebrow="FAQ"
            title="Questions a buyer or tester would ask before trusting the product."
            description="The homepage should answer the most important product questions without forcing a user to dig through the app."
          />

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group rounded-[1.4rem] border border-slate-200 bg-slate-50 p-5 open:bg-white"
              >
                <summary className="cursor-pointer list-none text-base font-semibold text-slate-950">
                  {item.q}
                </summary>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-[2.25rem] border border-slate-200 bg-slate-950 px-6 py-10 text-white shadow-[0_30px_90px_rgba(15,23,42,0.16)] md:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-sky-200">
                Ready to ship
              </p>
              <h2 className="mt-4 max-w-3xl font-[family-name:var(--font-sora)] text-3xl leading-tight md:text-5xl">
                Slipwise should look like a product teams can trust on day one.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                The goal of this rebrand is not to add scope. It is to present the existing product with the clarity, confidence, and polish expected from a real SaaS launch.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/voucher"
                className="rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"
              >
                Start free
              </Link>
              <a
                href="#features"
                className="rounded-full border border-white/15 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Review features
              </a>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-6 border-t border-slate-200 py-6 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold text-slate-950">Slipwise</p>
            <p className="mt-2 max-w-xl leading-7">
              Minimal SaaS document generation for teams that need professional vouchers, salary slips, and invoices without the spreadsheet overhead.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {[
              ["Product", "#features"],
              ["Use cases", "#use-cases"],
              ["Workflow", "#workflow"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="rounded-full px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                {label}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
