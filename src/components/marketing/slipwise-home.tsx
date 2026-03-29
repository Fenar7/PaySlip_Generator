"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { SlipwiseProductMockup } from "@/components/marketing/slipwise-product-mockup";
import { cn } from "@/lib/utils";

type SlipwiseHomeProps = {
  className?: string;
};

const featureCards = [
  {
    title: "Live preview that feels immediate",
    body: "See every edit settle into a clean canvas before you export. The layout stays readable, premium, and easy to trust.",
  },
  {
    title: "Brand-ready documents",
    body: "Logos, accent color, and company identity stay visually aligned across vouchers, salary slips, and invoices.",
  },
  {
    title: "One product, three workflows",
    body: "Slipwise keeps the three document types inside one coherent SaaS experience instead of forcing a scattered toolchain.",
  },
  {
    title: "Deployable without platform overhead",
    body: "The app remains serverless-friendly and easy to host on Vercel without introducing new infrastructure.",
  },
];

const useCases = [
  {
    eyebrow: "HR / People Ops",
    title: "Salary slips that feel organized and credible.",
    body: "Use a calmer workflow for employee details, pay breakdowns, and disbursement output that looks ready for internal circulation.",
  },
  {
    eyebrow: "Operations",
    title: "Vouchers that read like a real approval surface.",
    body: "Generate payment and receipt vouchers with a presentation quality that feels closer to software than a form.",
  },
  {
    eyebrow: "Finance / Accounts",
    title: "Invoices with strong structure and export confidence.",
    body: "Keep line items, taxes, totals, and payment summary information visually organized for faster review.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Enter details",
    body: "Fill in the module you need. Slipwise keeps each generator focused, legible, and easy to scan.",
  },
  {
    step: "02",
    title: "Review instantly",
    body: "The preview updates in place so layout or content problems are visible before you export anything.",
  },
  {
    step: "03",
    title: "Export professionally",
    body: "Download a polished PDF, create a PNG, or open the print surface with confidence.",
  },
];

const faqItems = [
  {
    q: "What does Slipwise generate?",
    a: "Slipwise generates vouchers, salary slips, and invoices in one browser-based product.",
  },
  {
    q: "Does Slipwise store my data?",
    a: "Not in this phase. The product remains stateless and deployable without backend persistence.",
  },
  {
    q: "Can I apply branding?",
    a: "Yes. The product supports logo upload and accent color controls in the current session.",
  },
  {
    q: "What outputs are available?",
    a: "Slipwise supports live preview, browser print, PDF export, and PNG export.",
  },
];

const showcaseModules = [
  {
    eyebrow: "Operations",
    title: "Voucher workflow",
    description: "Clean approval-ready payment and receipt flows with a calmer document experience.",
    highlights: ["Payment and receipt modes", "Structured narration", "Print, PDF, and PNG export"],
    accent: "from-sky-500/12 via-white to-white",
    href: "/voucher",
  },
  {
    eyebrow: "HR / Admin",
    title: "Salary slip system",
    description: "Employee, payroll, bank, and disbursement details arranged with a premium visual rhythm.",
    highlights: ["Payroll detail sections", "Live totals and preview", "Optional notes and signature blocks"],
    accent: "from-indigo-500/12 via-white to-white",
    href: "/salary-slip",
  },
  {
    eyebrow: "Finance",
    title: "Invoice studio",
    description: "Line items, taxes, client metadata, and payment summary content organized for fast review.",
    highlights: ["Line items and tax structure", "Client identity blocks", "Balance due and payment summary"],
    accent: "from-emerald-500/12 via-white to-white",
    href: "/invoice",
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
      <h2 className="mt-4 max-w-4xl font-[family-name:var(--font-sora)] text-4xl leading-tight tracking-[-0.05em] text-slate-950 md:text-6xl">
        {title}
      </h2>
      <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
        {description}
      </p>
    </div>
  );
}

function GeneratorCard({
  eyebrow,
  title,
  description,
  highlights,
  accent,
  href,
  index,
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  accent: string;
  href: string;
  index: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]"
    >
      <div className={cn("rounded-[1.4rem] border border-slate-200 bg-gradient-to-br p-4", accent)}>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-slate-500">
          {eyebrow}
        </p>
        <h3 className="mt-3 font-[family-name:var(--font-sora)] text-2xl tracking-[-0.04em] text-slate-950">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      </div>

      <ul className="mt-6 space-y-3 text-sm text-slate-700">
        {highlights.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-sky-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
      >
        Open generator
        <span aria-hidden="true">→</span>
      </Link>
    </motion.article>
  );
}

export function SlipwiseHome({ className }: SlipwiseHomeProps) {
  return (
    <main
      className={cn(
        "relative isolate min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f7faff_42%,#f3f7fd_100%)] text-slate-900",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_42%)]" />
      <div className="pointer-events-none absolute left-[12%] top-[22rem] -z-10 h-80 w-80 rounded-full bg-sky-300/18 blur-3xl" />
      <div className="pointer-events-none absolute right-[8%] top-[48rem] -z-10 h-72 w-72 rounded-full bg-indigo-300/16 blur-3xl" />

      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-20 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-4 rounded-full border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-950 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)]">
              S
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-500">
                Slipwise
              </p>
              <p className="text-sm text-slate-700">
                Business documents without the spreadsheet chaos.
              </p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-700">
            {[
              ["Product", "#product"],
              ["Features", "#features"],
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
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition-transform hover:-translate-y-0.5"
            >
              Start free
            </Link>
          </div>
        </header>

        <section
          id="product"
          className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.03fr)_minmax(36rem,0.97fr)] lg:gap-14"
        >
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-700">
              Atmospheric SaaS for document operations
            </div>
            <h1 className="mt-7 max-w-5xl font-[family-name:var(--font-sora)] text-[clamp(3.7rem,7vw,7.7rem)] leading-[0.92] tracking-[-0.07em] text-slate-950">
              A production-ready way to create vouchers, salary slips, and invoices
              <span className="text-slate-700"> that feel like a premium SaaS product.</span>
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
              Slipwise turns everyday admin documents into a polished browser workflow:
              enter details, preview the result, and export professional output without
              opening a design tool or cleaning up spreadsheet formatting.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/voucher"
                className="rounded-full bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition-transform hover:-translate-y-0.5"
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
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
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
          className="rounded-[2.6rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.06)] md:p-8 lg:p-10"
        >
          <SectionHeading
            eyebrow="Feature story"
            title="Slipwise brings the document workflow into one clean product system."
            description="The homepage should sell the same thing the app delivers: a clear, premium browser-based way to create business documents without the mess of manual formatting."
          />

          <div className="mt-10 grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4 }}
              className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#111827_65%,#0b1220_100%)] p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]"
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-sky-200/80">
                Why it feels different
              </p>
              <h3 className="mt-4 max-w-2xl font-[family-name:var(--font-sora)] text-3xl leading-tight tracking-[-0.05em] md:text-5xl">
                Slipwise is designed to look like a product teams can trust on day one.
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                It presents the three document flows as part of one coherent system,
                with a brand-first public site, a stronger visual identity, and a calmer
                app experience underneath.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Large-scale product mockup",
                  "White-theme with deep contrast",
                  "Premium spacing and hierarchy",
                  "Cleaner app and homepage cohesion",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-7 text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="grid gap-5 sm:grid-cols-2">
              {featureCards.map((card, index) => (
                <motion.article
                  key={card.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.36, delay: index * 0.05 }}
                  className="rounded-[1.65rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
                >
                  <div className="h-11 w-11 rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),rgba(255,255,255,1))]" />
                  <p className="mt-5 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                    {card.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="use-cases"
          className="rounded-[2.6rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.06)] md:p-8 lg:p-10"
        >
          <SectionHeading
            eyebrow="Use cases"
            title="Built for the people who actually prepare documents every week."
            description="The product should clearly speak to the users who need speed, consistency, and export quality in a small business setting."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {useCases.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.36, delay: index * 0.06 }}
                className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-sky-700">
                  {item.eyebrow}
                </p>
                <h3 className="mt-4 max-w-sm font-[family-name:var(--font-sora)] text-2xl leading-tight tracking-[-0.04em] text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.body}</p>
                <div className="mt-6 h-px bg-slate-200" />
                <p className="mt-5 text-sm font-medium text-slate-700">
                  Designed to feel calm, direct, and easy to trust.
                </p>
              </motion.article>
            ))}
          </div>
        </section>

        <section
          id="workflow"
          className="rounded-[2.6rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.06)] md:p-8 lg:p-10"
        >
          <SectionHeading
            eyebrow="Workflow"
            title="Three steps from raw data to professional output."
            description="Slipwise should make the flow obvious enough that a first-time visitor immediately understands how the product behaves."
          />

          <div className="mt-10 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-5 lg:grid-cols-3">
              {workflow.map((step, index) => (
                <motion.article
                  key={step.step}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.36, delay: index * 0.06 }}
                  className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-sky-700">
                    {step.step}
                  </p>
                  <h3 className="mt-4 font-[family-name:var(--font-sora)] text-2xl tracking-[-0.04em] text-slate-950">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.body}</p>
                </motion.article>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4 }}
              className="rounded-[2.1rem] border border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#111827_58%,#0b1220_100%)] p-6 text-white shadow-[0_26px_60px_rgba(15,23,42,0.18)]"
            >
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-sky-200/80">
                What the user sees
              </p>
              <div className="mt-5 space-y-4">
                {[
                  "A clean form panel for the selected document type.",
                  "An immediately updated preview surface with export context.",
                  "A composed document experience that feels ready for business use.",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-[1.3rem] border border-white/10 bg-white/8 px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-white">0{index + 1}</p>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section
          aria-label="Generator showcase"
          className="rounded-[2.6rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.06)] md:p-8 lg:p-10"
        >
          <SectionHeading
            eyebrow="Generators"
            title="Three focused workspaces, one polished product."
            description="Keep the modules distinct so users can move directly into the workflow they need without losing the consistency of the Slipwise brand."
          />

          <div className="mt-10 grid gap-5 xl:grid-cols-3">
            {showcaseModules.map((module, index) => (
              <GeneratorCard key={module.title} index={index} {...module} />
            ))}
          </div>
        </section>

        <section
          id="faq"
          className="rounded-[2.6rem] border border-slate-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.06)] md:p-8 lg:p-10"
        >
          <SectionHeading
            eyebrow="FAQ"
            title="Questions a buyer or tester would ask before trusting the product."
            description="The homepage should answer the most important product questions without forcing a user to dig through the app."
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <details
                key={item.q}
                className="group rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 open:bg-white open:shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
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

        <section className="overflow-hidden rounded-[2.6rem] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#111827_52%,#0b1220_100%)] px-6 py-10 text-white shadow-[0_32px_90px_rgba(15,23,42,0.2)] md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-sky-200/80">
                Ready to ship
              </p>
              <h2 className="mt-4 max-w-4xl font-[family-name:var(--font-sora)] text-4xl leading-tight tracking-[-0.05em] md:text-6xl">
                Slipwise should look like a product teams can trust on day one.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                The goal of this branch is not to add scope. It is to present the
                existing product with the clarity, confidence, and polish expected
                from a real SaaS launch.
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
              Atmospheric SaaS document generation for teams that need professional
              vouchers, salary slips, and invoices without the spreadsheet overhead.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {[
              ["Product", "#product"],
              ["Features", "#features"],
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
