"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type SVGProps } from "react";
import { ModuleCard } from "@/components/foundation/module-card";
import { SlipwiseProductMockup } from "@/components/marketing/slipwise-product-mockup";
import { useHomepageAnimations } from "@/components/marketing/use-homepage-animations";
import { cn } from "@/lib/utils";
import { productModules } from "@/lib/modules";

type SlipwiseHomeProps = {
  className?: string;
};

type IconProps = SVGProps<SVGSVGElement>;

function EyeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

function SparkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
      <path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" />
    </svg>
  );
}

function ExportIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3v11" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 18v2h16v-2" />
    </svg>
  );
}

function ClockIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5v5l3 1.8" />
    </svg>
  );
}

function TeamIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19c0-3.1 2.7-5 6-5s6 1.9 6 5" />
      <path d="M15 18c.2-2 1.7-3.4 4-3.9 1.3-.3 2-.1 2.9.3" />
    </svg>
  );
}

function VoucherIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M5 6h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-4V8a2 2 0 0 1 2-2Z" />
      <path d="M9 10h6" />
      <path d="M9 14h4" />
    </svg>
  );
}

function InvoiceIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4" />
      <path d="M10 12h6" />
      <path d="M10 16h6" />
    </svg>
  );
}

function ChevronIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SalaryIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2.5" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
      <circle cx="17" cy="15.5" r="1.5" />
    </svg>
  );
}

const featurePillars = [
  {
    icon: EyeIcon,
    title: "Live preview",
    body: "Review the finished document as you work, so layout, totals, and branding are already right before export.",
  },
  {
    icon: SparkIcon,
    title: "Brand controls",
    body: "Keep logos, company details, and visual styling consistent across every document you send out.",
  },
  {
    icon: ExportIcon,
    title: "Export-ready output",
    body: "Move straight from final review to print, PDF, or PNG without rebuilding the document somewhere else.",
  },
];

const solutions = [
  {
    icon: SalaryIcon,
    role: "HR / Admin",
    headline: "Issue salary slips without reformatting payroll data.",
    body: "Prepare employee details, earnings, deductions, and disbursement details in one workspace that stays clear from first input to final export.",
  },
  {
    icon: VoucherIcon,
    role: "Operations",
    headline: "Prepare vouchers with the structure teams already expect.",
    body: "Create payment or receipt vouchers with clean narration, approval context, and export-ready formatting in one pass.",
  },
  {
    icon: InvoiceIcon,
    role: "Finance / Accounts",
    headline: "Send invoices that stay clear from line items to balance due.",
    body: "Keep client details, tax structure, payment summaries, and branding aligned without losing clarity in the final document.",
  },
];

const workflow = [
  {
    step: "01",
    icon: TeamIcon,
    title: "Enter the details",
    body: "Each workspace is structured around the fields teams actually need, so data entry stays straightforward.",
  },
  {
    step: "02",
    icon: EyeIcon,
    title: "Review it live",
    body: "The document updates instantly, which makes review faster and catches layout issues before they matter.",
  },
  {
    step: "03",
    icon: ExportIcon,
    title: "Export and share",
    body: "When the document looks right, export it in the format your team needs and send it on.",
  },
];

const faqs = [
  {
    q: "What can teams generate with Slipwise?",
    a: "Slipwise supports salary slips, invoices, and vouchers in one browser-based product.",
  },
  {
    q: "Does Slipwise need a database or account system?",
    a: "No. Slipwise stays stateless in this phase and remains simple to deploy on Vercel.",
  },
  {
    q: "Can the output be branded?",
    a: "Yes. Logo upload, company details, and accent color controls are part of the active document session.",
  },
  {
    q: "What export formats are available?",
    a: "Slipwise supports browser print, PDF export, and PNG export alongside the live preview.",
  },
];

const heroLines = [
  "Create salary slips,",
  "invoices, and vouchers",
  "without rebuilding them",
  "in spreadsheets.",
];

function getWorkspaceIcon(slug: string) {
  switch (slug) {
    case "voucher":
      return VoucherIcon;
    case "salary-slip":
      return SalaryIcon;
    case "invoice":
      return InvoiceIcon;
    default:
      return SparkIcon;
  }
}

function SectionHeading({
  eyebrow,
  title,
  description,
  animate = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  animate?: boolean;
}) {
  return (
    <div className="max-w-3xl" data-animate={animate ? "section-heading" : undefined}>
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
  const rootRef = useRef<HTMLElement | null>(null);
  const workspacesRef = useRef<HTMLElement | null>(null);
  const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);

  useHomepageAnimations(rootRef);

  useEffect(() => {
    if (!isWorkspaceDialogOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWorkspaceDialogOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isWorkspaceDialogOpen]);

  const openWorkspaceDialog = () => {
    setIsWorkspaceDialogOpen(true);
  };

  const closeWorkspaceDialog = () => {
    setIsWorkspaceDialogOpen(false);
  };

  const scrollToWorkspaces = () => {
    workspacesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main ref={rootRef} className={cn("relative isolate overflow-hidden", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[48rem] bg-[radial-gradient(circle_at_top,rgba(232,64,30,0.10),transparent_34%)]" />
      <div data-animate="hero-glow-left" className="pointer-events-none absolute left-[-7rem] top-40 -z-10 h-56 w-56 rounded-full bg-[rgba(232,64,30,0.08)] blur-[90px]" />
      <div data-animate="hero-glow-right" className="pointer-events-none absolute right-[-5rem] top-28 -z-10 h-64 w-64 rounded-full bg-[rgba(34,34,34,0.05)] blur-[100px]" />

      <div className="mx-auto flex w-full max-w-[95rem] flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="sticky top-4 z-30 rounded-full border border-[var(--border-soft)] bg-[rgba(255,252,248,0.94)] px-4 py-3 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center md:gap-6">
            <Link href="/" className="flex items-center md:justify-self-start">
              <p className="text-[1.45rem] font-semibold tracking-[-0.08em] text-[var(--foreground)] md:text-[1.6rem]">
                Slipwise
              </p>
            </Link>

            <nav className="hidden items-center justify-self-center gap-2 text-sm text-[var(--foreground-soft)] md:flex">
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

            <div className="flex items-center gap-3 md:justify-self-end">
              <button
                type="button"
                onClick={scrollToWorkspaces}
                className="rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground-soft)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              >
                View workspaces
              </button>
              <button
                type="button"
                onClick={openWorkspaceDialog}
                className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent-strong)] hover:shadow-[var(--shadow-card)]"
              >
                Start free
              </button>
            </div>
          </div>
        </header>

        <section data-animate="hero" className="grid gap-10 pt-8 lg:min-h-[calc(100vh-8rem)] lg:grid-cols-[minmax(0,0.96fr)_minmax(32rem,0.94fr)] lg:items-center lg:pt-10">
          <div className="max-w-3xl self-center">
            <div data-animate="hero-eyebrow" className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[rgba(255,252,248,0.8)] px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--accent)] shadow-[var(--shadow-soft)] backdrop-blur">
              For HR, ops, and finance teams
            </div>

            <h1 className="mt-5 max-w-3xl text-[3rem] leading-[0.97] text-[var(--foreground)] md:text-[3.55rem] xl:text-[4rem]">
              {heroLines.map((line) => (
                <span key={line} className="block overflow-hidden pb-1">
                  <span data-animate="hero-line" className="block origin-left will-change-transform">
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <p data-animate="hero-copy" className="mt-5 max-w-xl text-[1.02rem] leading-8 text-[var(--muted-foreground)] md:text-[1.08rem]">
              Slipwise gives teams one clean workspace to prepare recurring business documents, review them live, and export polished output that is ready to send.
            </p>

            <div className="mt-7 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={openWorkspaceDialog}
                data-animate="hero-cta"
                className="rounded-full bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-lift)] transition-all duration-200 hover:bg-[var(--accent-strong)] hover:shadow-[0_24px_44px_rgba(34,34,34,0.16)]"
              >
                Open a workspace
              </button>
              <button
                type="button"
                onClick={scrollToWorkspaces}
                data-animate="hero-cta"
                className="rounded-full border border-[var(--border-strong)] bg-white/80 px-6 py-3.5 text-sm font-semibold text-[var(--foreground-soft)] shadow-[var(--shadow-soft)] backdrop-blur hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              >
                Explore workflows
              </button>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                { icon: EyeIcon, label: "Live preview across all three workflows" },
                { icon: ExportIcon, label: "PDF, PNG, and print built in" },
                { icon: SparkIcon, label: "Brand-ready output without design work" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                <div
                  key={item.label}
                  data-animate="hero-chip"
                  className="flex items-start gap-3 rounded-[1.15rem] border border-[var(--border-soft)] bg-[rgba(255,252,248,0.92)] px-4 py-3 text-sm leading-7 text-[var(--foreground-soft)] shadow-[var(--shadow-soft)]"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--accent)]">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span>{item.label}</span>
                </div>
                );
              })}
            </div>
          </div>

          <SlipwiseProductMockup />
        </section>

        <section
          id="features"
          data-animate="features-section"
          className="mt-6 grid gap-6 rounded-[2.7rem] border border-[var(--border-strong)] bg-[rgba(255,252,248,0.9)] p-6 shadow-[var(--shadow-card)] md:p-8 xl:grid-cols-[1.05fr_0.95fr]"
        >
          <div data-animate="feature-story" className="rounded-[2.2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,238,232,0.88))] p-7 shadow-[var(--shadow-soft)]">
            <SectionHeading
              eyebrow="Feature story"
              title="One product for the documents teams create every week."
              description="Slipwise brings recurring document work into one browser-based product, with structured inputs, live preview, and export-ready output from the start."
              animate
            />

            <div data-animate="feature-extra" className="mt-8 rounded-[1.5rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                Product focus
              </p>
              <div className="mt-4 space-y-4 text-base leading-8 text-[var(--foreground-soft)]">
                <p>Slipwise is built for teams that prepare the same operational documents every month, every cycle, and every week.</p>
                <p>It replaces spreadsheet cleanup and manual document formatting with a workflow that is easier to repeat and easier to trust.</p>
                <p>The product stays focused: structured inputs, a live document view, and exports that are ready to share.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {featurePillars.map((item, index) => (
              <article
                key={item.title}
                data-animate="feature-card"
                className={`rounded-[1.8rem] border p-6 shadow-[var(--shadow-soft)] ${
                  index === 0
                    ? "border-[rgba(232,64,30,0.16)] bg-[linear-gradient(180deg,rgba(232,64,30,0.08),rgba(255,255,255,0.96))]"
                    : "border-[var(--border-soft)] bg-white/90"
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
                  <item.icon className="h-5 w-5" />
                </span>
                <p className="text-xl font-medium text-[var(--foreground)]">
                  {item.title}
                </p>
                <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
                  {item.body}
                </p>
              </article>
            ))}

            <article
              data-animate="feature-card"
              className="rounded-[1.5rem] border border-[var(--border-soft)] bg-white p-6 shadow-[var(--shadow-soft)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
                <ClockIcon className="h-5 w-5" />
              </span>
              <p className="mt-4 text-xl font-medium text-[var(--foreground)]">
                Faster preparation
              </p>
              <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
                Prepare recurring documents with less formatting overhead and more confidence in the final output.
              </p>
            </article>
          </div>
        </section>

        <section
          id="solutions"
          data-animate="solutions-section"
          className="rounded-[2.7rem] border border-[var(--border-strong)] bg-[rgba(255,252,248,0.9)] p-6 shadow-[var(--shadow-card)] md:p-8"
        >
          <div data-animate="section-heading">
            <SectionHeading
              eyebrow="Solutions"
              title="Built for the people who actually prepare these documents every week."
              description="Slipwise is designed for payroll, admin, operations, and finance teams that need documents to be accurate, presentable, and quick to turn around."
            />
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {solutions.map((item) => (
              <article
                key={item.role}
                data-animate="solution-card"
                className="rounded-[1.8rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,240,233,0.92))] p-6 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--accent)] shadow-[var(--shadow-soft)]">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                    {item.role}
                  </p>
                </div>
                <h3 className="mt-4 text-2xl text-[var(--foreground)]">{item.headline}</h3>
                <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="workflow"
          data-animate="workflow-section"
          className="rounded-[2.7rem] border border-[var(--border-strong)] bg-[rgba(255,252,248,0.92)] p-6 shadow-[var(--shadow-card)] md:p-8"
        >
          <div data-animate="section-heading" className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,240,233,0.94))] p-6 shadow-[var(--shadow-soft)]">
            <SectionHeading
              eyebrow="Workflow"
              title="Three steps from structured input to clean export."
              description="The workflow stays simple from start to finish: enter the details, review the document, and export it without switching tools."
            />
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {workflow.map((item) => (
              <article
                key={item.step}
                data-animate="workflow-card"
                className="rounded-[1.8rem] border border-[var(--border-soft)] bg-white/92 p-6 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <span data-animate="workflow-step" className="text-[0.78rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                    {item.step}
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--accent)]">
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                </div>
                <h3 className="mt-4 text-2xl text-[var(--foreground)]">{item.title}</h3>
                <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="workspaces"
          ref={workspacesRef}
          data-animate="generators-section"
          className="rounded-[2.7rem] border border-[var(--border-strong)] bg-[rgba(255,252,248,0.9)] p-6 shadow-[var(--shadow-card)] md:p-8"
        >
          <div data-animate="section-heading">
            <SectionHeading
              eyebrow="Workspaces"
              title="Three focused workspaces, one consistent product."
              description="Choose the workflow you need and get the same structured editing, live preview, and polished export experience every time."
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            {productModules.map((module) => (
              <ModuleCard key={module.slug} module={module} />
            ))}
          </div>
        </section>

        <section
          id="faq"
          data-animate="faq-section"
          className="grid gap-6 rounded-[2.7rem] border border-[var(--border-strong)] bg-[rgba(255,252,248,0.9)] p-6 shadow-[var(--shadow-card)] md:p-8 lg:grid-cols-[0.8fr_1.2fr]"
        >
          <div data-animate="section-heading">
            <SectionHeading
              eyebrow="FAQ"
              title="The essentials, answered clearly."
              description="Everything important about the product should be easy to understand before someone commits to using it."
            />
          </div>

          <div className="grid gap-4">
            {faqs.map((item) => (
              <details
                key={item.q}
                data-animate="faq-card"
                className="group rounded-[1.6rem] border border-[var(--border-soft)] bg-white/94 p-5 shadow-[var(--shadow-soft)] open:bg-[var(--surface-soft)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-[var(--foreground)]">
                  <span>{item.q}</span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white text-[var(--muted-foreground)] transition-transform duration-200 group-open:rotate-180">
                    <ChevronIcon className="h-4.5 w-4.5" />
                  </span>
                </summary>
                <p className="mt-4 text-base leading-8 text-[var(--muted-foreground)]">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section data-animate="final-cta" className="rounded-[2.2rem] border border-[var(--border-strong)] bg-white px-6 py-10 shadow-[var(--shadow-card)] md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div data-animate="section-heading">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                Ready to ship
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl leading-[1] text-[var(--foreground)] md:text-5xl">
                A simpler way to prepare the documents your team sends every day.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Slipwise keeps the process clean from start to finish: enter the details, review the document, and export professional output when it is ready.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 lg:justify-end">
              <button
                type="button"
                onClick={openWorkspaceDialog}
                data-animate="final-cta-action"
                className="rounded-full bg-[var(--accent)] px-7 py-4 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent-strong)] hover:shadow-[var(--shadow-card)]"
              >
                Start free
              </button>
              <button
                type="button"
                onClick={scrollToWorkspaces}
                data-animate="final-cta-action"
                className="rounded-full border border-[var(--border-strong)] px-7 py-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
              >
                View workspaces
              </button>
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

      <div
        className={cn(
          "fixed inset-0 z-50 flex items-end justify-center bg-[rgba(34,34,34,0.24)] px-4 pb-4 pt-24 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:items-center md:px-6",
          isWorkspaceDialogOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeWorkspaceDialog}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-hidden={!isWorkspaceDialogOpen}
          aria-label="Choose a Slipwise workspace"
          className={cn(
            "w-full max-w-5xl transform-gpu rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,241,235,0.98))] p-5 shadow-[0_22px_52px_rgba(34,34,34,0.10)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform md:p-8",
            isWorkspaceDialogOpen ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.992] opacity-0",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                Choose a workspace
              </p>
              <h2 className="mt-3 text-3xl leading-[0.98] text-[var(--foreground)] md:text-[3.2rem]">
                Start in the flow your team actually needs.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-[var(--muted-foreground)] md:text-[1.02rem]">
                Pick the document workspace that fits the task in front of you. Each one keeps the same Slipwise editing flow, live preview, and export-ready output.
              </p>
            </div>

            <button
              type="button"
              onClick={closeWorkspaceDialog}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-white text-[var(--foreground-soft)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              aria-label="Close workspace picker"
            >
              <span aria-hidden="true" className="text-xl leading-none">
                ×
              </span>
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {productModules.map((module) => {
              const Icon = getWorkspaceIcon(module.slug);

              return (
                <Link
                  key={module.slug}
                  href={`/${module.slug}`}
                  className="group rounded-[1.7rem] border border-[var(--border-strong)] bg-white/94 p-5 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[var(--muted-foreground)]">
                      {module.eyebrow}
                    </p>
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--accent)] transition-colors group-hover:border-[var(--accent-soft)] group-hover:bg-white">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="mt-3 text-[1.45rem] leading-[1.08] tracking-[-0.04em] text-[var(--foreground)]">
                    {module.name}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                    {module.description}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
                    Open workspace
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
