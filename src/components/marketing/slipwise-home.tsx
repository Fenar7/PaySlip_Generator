"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ModuleCard } from "@/components/foundation/module-card";
import { SlipwiseProductMockup } from "@/components/marketing/slipwise-product-mockup";
import { cn } from "@/lib/utils";
import { productModules } from "@/lib/modules";

type SlipwiseHomeProps = {
  className?: string;
};

const featurePillars = [
  {
    title: "Live preview, not blind edits",
    body: "Every change lands in a document preview immediately, so teams can review structure before export.",
  },
  {
    title: "Branded output without design tooling",
    body: "Logo, company identity, and accent color stay inside a workflow built for operations, HR, and finance.",
  },
  {
    title: "Exports that feel production ready",
    body: "Print, PDF, and PNG are part of the core workflow rather than an afterthought bolted onto a form.",
  },
];

const solutions = [
  {
    role: "HR / Admin",
    headline: "Salary slips that look ready to send.",
    body: "Group employee details, payroll blocks, notes, and disbursement information in one clean workflow.",
  },
  {
    role: "Operations",
    headline: "Vouchers with structure, not guesswork.",
    body: "Move from internal approvals to export-ready vouchers without formatting them manually each time.",
  },
  {
    role: "Finance / Accounts",
    headline: "Invoices that feel polished from the start.",
    body: "Keep branding, tax structure, line items, and payment summaries aligned in one product system.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Enter details once",
    body: "Slipwise keeps each document flow structured, so the form feels purposeful instead of crowded.",
  },
  {
    step: "02",
    title: "Review the document live",
    body: "Preview framing is part of the workflow, which makes visual QA and internal review faster.",
  },
  {
    step: "03",
    title: "Export with confidence",
    body: "Share through print, PDF, or PNG without rebuilding the document in another tool.",
  },
];

const faqs = [
  {
    q: "What can teams generate with Slipwise?",
    a: "Slipwise currently supports vouchers, salary slips, and invoices as three focused workflows inside one product.",
  },
  {
    q: "Does Slipwise need a database or account system?",
    a: "No. The product stays stateless in this phase and remains simple to deploy on Vercel.",
  },
  {
    q: "Can the output be branded?",
    a: "Yes. Logo upload and accent color controls are already part of the active document session.",
  },
  {
    q: "What export formats are available?",
    a: "Slipwise supports browser print, PDF export, and PNG export alongside the live preview surface.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-4xl leading-[1] text-[var(--foreground)] md:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-lg leading-8 text-[var(--muted-foreground)]">
        {description}
      </p>
    </div>
  );
}

export function SlipwiseHome({ className }: SlipwiseHomeProps) {
  return (
    <main className={cn("relative isolate overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[48rem] bg-[radial-gradient(circle_at_top,rgba(45,107,255,0.18),transparent_34%)]" />
      <div className="pointer-events-none absolute left-[-9rem] top-36 -z-10 h-72 w-72 rounded-full bg-[rgba(103,203,255,0.18)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-24 -z-10 h-80 w-80 rounded-full bg-[rgba(45,107,255,0.18)] blur-3xl" />

      <div className="mx-auto flex w-full max-w-[95rem] flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="sticky top-4 z-30 rounded-full border border-[var(--border-soft)] bg-white/78 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--foreground)] text-sm font-semibold text-white shadow-[var(--shadow-soft)]">
                S
              </span>
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                  Slipwise
                </p>
                <p className="mt-1 text-sm text-[var(--foreground-soft)]">
                  Business documents without spreadsheet chaos.
                </p>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 text-sm text-[var(--foreground-soft)] md:flex">
              {[
                ["Features", "#features"],
                ["Solutions", "#solutions"],
                ["Workflow", "#workflow"],
                ["FAQ", "#faq"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="rounded-full px-4 py-2 hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                >
                  {label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link
                href="/voucher"
                className="rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground-soft)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              >
                View generators
              </Link>
              <Link
                href="/voucher"
                className="rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
              >
                Start free
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-12 pt-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(36rem,0.98fr)] lg:items-center lg:pt-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-white/75 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[var(--accent-strong)] shadow-[var(--shadow-soft)] backdrop-blur">
              Atmospheric SaaS workflow for business documents
            </div>

            <h1 className="mt-7 max-w-5xl text-6xl leading-[0.9] text-[var(--foreground)] md:text-7xl xl:text-[5.8rem]">
              A production-ready way to create vouchers, salary slips, and invoices that feel like a premium SaaS product.
            </h1>

            <p className="mt-7 max-w-3xl text-xl leading-9 text-[var(--muted-foreground)]">
              Slipwise turns repetitive business documents into a cleaner software workflow. Teams enter structured details, review the document live, and export polished output without rebuilding it in spreadsheets or design tools.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/voucher"
                className="rounded-full bg-[var(--foreground)] px-7 py-4 text-sm font-semibold text-white shadow-[var(--shadow-lift)] hover:-translate-y-0.5"
              >
                Start free
              </Link>
              <a
                href="#features"
                className="rounded-full border border-[var(--border-strong)] bg-white/80 px-7 py-4 text-sm font-semibold text-[var(--foreground-soft)] shadow-[var(--shadow-soft)] backdrop-blur hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              >
                Explore the workflow
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                "Voucher, salary slip, and invoice flows",
                "Browser print, PDF, and PNG export",
                "Stateless and deployable on Vercel",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.4rem] border border-[var(--border-soft)] bg-white/70 px-4 py-4 text-sm leading-7 text-[var(--foreground-soft)] shadow-[var(--shadow-soft)] backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <SlipwiseProductMockup />
        </section>

        <section
          id="features"
          className="mt-6 grid gap-6 rounded-[2.7rem] border border-[var(--border-strong)] bg-white/70 p-6 shadow-[var(--shadow-card)] backdrop-blur md:p-8 xl:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(236,244,255,0.84))] p-7 shadow-[var(--shadow-soft)]">
            <SectionHeading
              eyebrow="Feature story"
              title="Slipwise brings the whole document workflow into one stronger product surface."
              description="The redesign has to sell a serious SaaS experience, not a neat utility. That means larger sections, stronger hierarchy, richer visual composition, and clearer product proof at every fold."
            />

            <div className="mt-8 rounded-[1.8rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                Why this direction
              </p>
              <div className="mt-4 space-y-4 text-base leading-8 text-[var(--foreground-soft)]">
                <p>Slipwise should feel like software that a team can trust before the first export.</p>
                <p>The public site and the application shell have to look like one brand, not separate layers built at different quality bars.</p>
                <p>This phase is about product confidence: bigger visual moves, clearer composition, and a stronger sense of software depth.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {featurePillars.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`rounded-[1.8rem] border p-6 shadow-[var(--shadow-soft)] ${
                  index === 0
                    ? "border-[rgba(45,107,255,0.18)] bg-[linear-gradient(180deg,rgba(45,107,255,0.10),rgba(255,255,255,0.96))]"
                    : "border-[var(--border-soft)] bg-white/90"
                }`}
              >
                <p className="text-xl font-semibold text-[var(--foreground)]">
                  {item.title}
                </p>
                <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
                  {item.body}
                </p>
              </motion.article>
            ))}

            <motion.article
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.3, delay: 0.18 }}
              className="rounded-[1.8rem] bg-[linear-gradient(180deg,rgba(8,15,28,0.97),rgba(12,21,40,0.97))] p-6 text-white shadow-[var(--shadow-lift)]"
            >
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-sky-100/80">
                Product payoff
              </p>
              <p className="mt-4 text-2xl font-semibold">
                Fast enough for admins. Polished enough for the business.
              </p>
              <p className="mt-4 text-base leading-8 text-slate-300">
                That is the standard for every section in the new homepage and every shared shell surface inside the app.
              </p>
            </motion.article>
          </div>
        </section>

        <section
          id="solutions"
          className="grid gap-6 rounded-[2.7rem] border border-[var(--border-strong)] bg-white/72 p-6 shadow-[var(--shadow-card)] backdrop-blur md:p-8 lg:grid-cols-3"
        >
          <div className="lg:col-span-3">
            <SectionHeading
              eyebrow="Solutions"
              title="Built for the people who actually prepare these documents every week."
              description="The strongest story for Slipwise is not abstract productivity. It is focused workflow quality for the teams doing real payroll, admin, and billing work."
            />
          </div>

          {solutions.map((item, index) => (
            <motion.article
              key={item.role}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.3, delay: index * 0.06 }}
              className="rounded-[1.8rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,246,255,0.9))] p-6 shadow-[var(--shadow-soft)]"
            >
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[var(--accent-strong)]">
                {item.role}
              </p>
              <h3 className="mt-4 text-2xl text-[var(--foreground)]">{item.headline}</h3>
              <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
                {item.body}
              </p>
            </motion.article>
          ))}
        </section>

        <section
          id="workflow"
          className="grid gap-6 rounded-[2.7rem] border border-[var(--border-strong)] bg-white/75 p-6 shadow-[var(--shadow-card)] backdrop-blur md:p-8 xl:grid-cols-[0.8fr_1.2fr]"
        >
          <div className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,245,255,0.92))] p-6 shadow-[var(--shadow-soft)]">
            <SectionHeading
              eyebrow="Workflow"
              title="Three steps from structured input to clean export."
              description="The product story should be immediate. Users enter data, review the live document, and export without leaving the workflow."
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {workflow.map((item, index) => (
              <motion.article
                key={item.step}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.3, delay: index * 0.06 }}
                className="rounded-[1.8rem] border border-[var(--border-soft)] bg-white/92 p-6 shadow-[var(--shadow-soft)]"
              >
                <p className="text-[0.78rem] font-semibold uppercase tracking-[0.34em] text-[var(--accent-strong)]">
                  {item.step}
                </p>
                <h3 className="mt-4 text-2xl text-[var(--foreground)]">{item.title}</h3>
                <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
                  {item.body}
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="rounded-[2.7rem] border border-[var(--border-strong)] bg-white/72 p-6 shadow-[var(--shadow-card)] backdrop-blur md:p-8">
          <SectionHeading
            eyebrow="Generators"
            title="Three real document modules, presented as one product."
            description="The marketing page and the app shell should both reinforce the same story: Slipwise is one software product with three focused workflows inside it."
          />

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            {productModules.map((module, index) => (
              <ModuleCard key={module.slug} module={module} index={index} />
            ))}
          </div>
        </section>

        <section
          id="faq"
          className="grid gap-6 rounded-[2.7rem] border border-[var(--border-strong)] bg-white/72 p-6 shadow-[var(--shadow-card)] backdrop-blur md:p-8 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <SectionHeading
            eyebrow="FAQ"
            title="The questions buyers and testers ask before they trust the product."
            description="Slipwise should answer the important product questions without making people dig through the app."
          />

          <div className="grid gap-4">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="rounded-[1.6rem] border border-[var(--border-soft)] bg-white/94 p-5 shadow-[var(--shadow-soft)] open:bg-[var(--surface-soft)]"
              >
                <summary className="cursor-pointer list-none text-lg font-semibold text-[var(--foreground)]">
                  {item.q}
                </summary>
                <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-[2.9rem] bg-[linear-gradient(180deg,rgba(8,15,28,0.98),rgba(12,21,40,0.98))] px-6 py-10 text-white shadow-[var(--shadow-lift)] md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-sky-100/75">
                Ready to ship
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl leading-[1] text-white md:text-5xl">
                Slipwise should look like software teams can trust on day one.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Phase 1 is not about adding more scope. It is about upgrading the visual quality, product confidence, and shared shell so the existing workflows feel genuinely launchable.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 lg:justify-end">
              <Link
                href="/voucher"
                className="rounded-full bg-white px-7 py-4 text-sm font-semibold text-slate-950 shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
              >
                Start free
              </Link>
              <a
                href="#features"
                className="rounded-full border border-white/15 px-7 py-4 text-sm font-semibold text-white hover:bg-white/10"
              >
                Review the workflow
              </a>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-6 border-t border-[var(--border-soft)] py-6 text-sm text-[var(--muted-foreground)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-semibold text-[var(--foreground)]">Slipwise</p>
            <p className="mt-2 max-w-xl leading-7">
              Browser-based document workflows for salary slips, invoices, and vouchers, designed to feel clear in the app and polished in export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {[
              ["Features", "#features"],
              ["Solutions", "#solutions"],
              ["Workflow", "#workflow"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="rounded-full px-3 py-2 hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
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
