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
    title: "Live preview",
    body: "See the document update as you work, so teams can review structure before export.",
  },
  {
    title: "Brand-ready output",
    body: "Keep logo, company identity, and accent color aligned without leaving the workflow.",
  },
  {
    title: "Clean export flow",
    body: "Print, PDF, and PNG stay inside one product built specifically for business documents.",
  },
];

const solutions = [
  {
    role: "HR / Admin",
    headline: "Salary slips that look ready to share.",
    body: "Prepare employee, payroll, notes, and disbursement details in one clean workspace.",
  },
  {
    role: "Operations",
    headline: "Vouchers with structure built in.",
    body: "Move from internal approvals to export-ready vouchers without reformatting the document each time.",
  },
  {
    role: "Finance / Accounts",
    headline: "Invoices that stay clean under pressure.",
    body: "Keep branding, tax structure, line items, and payment summaries aligned in one product flow.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Enter details once",
    body: "Each generator keeps its fields structured, so the form feels clear instead of crowded.",
  },
  {
    step: "02",
    title: "Review the document live",
    body: "The preview updates as you work, which makes internal review and visual QA faster.",
  },
  {
    step: "03",
    title: "Export with confidence",
    body: "Use print, PDF, or PNG without rebuilding the document in another tool.",
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
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-white/75 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)] shadow-[var(--shadow-soft)] backdrop-blur">
              Business documents for modern teams
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl leading-[0.92] text-[var(--foreground)] md:text-6xl xl:text-[4.8rem]">
              Create salary slips, invoices, and vouchers without the spreadsheet mess.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)] md:text-[1.15rem]">
              Slipwise gives HR, admin, and finance teams a clean workspace to prepare branded business documents, review them live, and export polished output in minutes.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/voucher"
                className="rounded-full bg-[var(--foreground)] px-7 py-4 text-sm font-semibold text-white shadow-[var(--shadow-lift)] hover:-translate-y-0.5"
              >
                Open product
              </Link>
              <a
                href="#generators"
                className="rounded-full border border-[var(--border-strong)] bg-white/80 px-7 py-4 text-sm font-semibold text-[var(--foreground-soft)] shadow-[var(--shadow-soft)] backdrop-blur hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              >
                View generators
              </a>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                "Live preview built in",
                "PDF, PNG, and print export",
                "Brand-ready documents",
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
              title="One product for the documents teams create every week."
              description="Slipwise keeps vouchers, salary slips, and invoices inside a clean browser workflow with live preview and polished export."
            />

            <div className="mt-8 rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                Product focus
              </p>
              <div className="mt-4 space-y-4 text-base leading-8 text-[var(--foreground-soft)]">
                <p>Slipwise is designed for teams that need business documents to look right without extra formatting work.</p>
                <p>The homepage should explain that value quickly, then move people straight into the product.</p>
                <p>The design goal is minimal SaaS: clear, modern, and product-first.</p>
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
              className="rounded-[1.5rem] border border-[var(--border-soft)] bg-white p-6 shadow-[var(--shadow-soft)]"
            >
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[var(--muted-foreground)]">
                Core benefit
              </p>
              <p className="mt-4 text-2xl font-semibold text-[var(--foreground)]">
                Fast enough for admins. Clean enough for the business.
              </p>
              <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
                The visual system should support the workflow, not overpower it.
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

        <section className="rounded-[2.2rem] border border-[var(--border-strong)] bg-white px-6 py-10 shadow-[var(--shadow-card)] md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                Ready to ship
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl leading-[1] text-[var(--foreground)] md:text-5xl">
                A cleaner product surface for teams that need business documents done right.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Slipwise keeps the workflow simple: enter the details, review the document, and export with confidence.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 lg:justify-end">
              <Link
                href="/voucher"
                className="rounded-full bg-[var(--foreground)] px-7 py-4 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:-translate-y-0.5"
              >
                Start free
              </Link>
              <a
                href="#features"
                className="rounded-full border border-[var(--border-strong)] px-7 py-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
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
