"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type WorkspaceAction = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant: "primary" | "secondary" | "subtle";
};

export type WorkspaceSectionMeta = {
  id: string;
  label: string;
};

type DocumentWorkspaceLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions: WorkspaceAction[];
  errorMessage?: string;
  builderEyebrow: string;
  builderTitle: string;
  builderDescription: string;
  sections: WorkspaceSectionMeta[];
  previewEyebrow: string;
  previewTitle: string;
  previewDescription: string;
  builderContent: ReactNode;
  previewContent: ReactNode;
};

type MobileTab = "build" | "preview" | "export";

const mobileTabs = [
  { id: "build", label: "Build" },
  { id: "preview", label: "Preview" },
  { id: "export", label: "Export" },
] as const;

function actionClassName(variant: WorkspaceAction["variant"]) {
  switch (variant) {
    case "primary":
      return "border border-transparent bg-[linear-gradient(135deg,#111827,#020617)] text-[var(--background)] shadow-[0_18px_36px_rgba(15,23,42,0.18)] hover:brightness-105";
    case "secondary":
      return "border border-[var(--border-strong)] bg-white text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:bg-[var(--surface-accent)]";
    case "subtle":
    default:
      return "border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--foreground-soft)] shadow-[0_10px_24px_rgba(15,23,42,0.03)] hover:bg-[var(--surface-accent)]";
  }
}

function renderAction(action: WorkspaceAction, compact = false) {
  const className = cn(
    "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all disabled:cursor-wait disabled:opacity-65",
    compact ? "px-4 py-2.5" : "px-5 py-3",
    actionClassName(action.variant),
  );

  if (action.href) {
    return (
      <Link key={action.id} href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button
      key={action.id}
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={className}
    >
      {action.label}
    </button>
  );
}

export function DocumentWorkspaceLayout({
  eyebrow,
  title,
  description,
  actions,
  errorMessage,
  builderEyebrow,
  builderTitle,
  builderDescription,
  sections,
  previewEyebrow,
  previewTitle,
  previewDescription,
  builderContent,
  previewContent,
}: DocumentWorkspaceLayoutProps) {
  const [mobileTab, setMobileTab] = useState<MobileTab>("build");
  const [isDesktopWorkspace, setIsDesktopWorkspace] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const syncMatches = () => setIsDesktopWorkspace(mediaQuery.matches);

    syncMatches();
    mediaQuery.addEventListener("change", syncMatches);

    return () => mediaQuery.removeEventListener("change", syncMatches);
  }, []);

  const quickStats = useMemo(
    () => [
      { label: "Sections", value: String(sections.length).padStart(2, "0") },
      { label: "Preview", value: "Live A4" },
      { label: "Exports", value: "PDF · PNG" },
    ],
    [sections.length],
  );

  return (
    <main className="slipwise-shell-bg relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(45,107,255,0.16),transparent_36%),radial-gradient(circle_at_84%_12%,rgba(103,203,255,0.12),transparent_28%)]" />
      <div className="absolute inset-y-0 left-0 -z-10 hidden w-[26rem] bg-[linear-gradient(180deg,rgba(236,244,255,0.78),rgba(236,244,255,0))] xl:block" />

      <div className="mx-auto flex w-full max-w-[108rem] flex-col gap-5 px-3 py-5 sm:px-4 lg:px-5 lg:py-7">
        <section className="rounded-[2rem] border border-[var(--border-strong)] bg-[rgba(255,255,255,0.94)] p-5 shadow-[var(--shadow-card)] backdrop-blur-sm md:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem] xl:items-center">
            <div className="max-w-4xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                {eyebrow}
              </p>
              <h1 className="mt-3 max-w-3xl text-[2.3rem] leading-[0.98] tracking-[-0.05em] text-[var(--foreground)] md:text-[3rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-[0.98rem] leading-7 text-[var(--muted-foreground)]">
                {description}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(244,248,255,0.92),rgba(255,255,255,0.96))] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <div className="grid grid-cols-3 gap-2">
                {quickStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[1rem] border border-[var(--border-soft)] bg-white/88 px-3 py-3"
                  >
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {isDesktopWorkspace ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {actions.map((action) => renderAction(action, true))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-[1.4rem] border border-[rgba(220,38,38,0.16)] bg-[rgba(220,38,38,0.06)] px-5 py-4 text-sm text-[var(--danger)] shadow-[var(--shadow-soft)]">
            {errorMessage}
          </div>
        ) : null}

        {!isDesktopWorkspace ? (
          <div className="xl:hidden">
            <div className="sticky top-4 z-20 rounded-[1.35rem] border border-[var(--border-strong)] bg-white/92 p-2 shadow-[var(--shadow-soft)] backdrop-blur">
              <div className="grid grid-cols-3 gap-2">
                {mobileTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTab(tab.id)}
                    className={cn(
                      "rounded-[1rem] px-4 py-3 text-sm font-medium transition-colors",
                      mobileTab === tab.id
                        ? "bg-[var(--foreground)] text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)]"
                        : "bg-[var(--surface-soft)] text-[var(--foreground-soft)]",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[14rem_minmax(24rem,30rem)_minmax(0,1fr)] xl:items-start">
          <aside className="hidden xl:block">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-[1.75rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.94))] p-5 text-white shadow-[0_22px_40px_rgba(15,23,42,0.24)]">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.3em] text-white/55">
                  Workspace map
                </p>
                <p className="mt-3 text-lg font-semibold leading-tight">
                  Build, review, and export from one focused canvas.
                </p>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  Move through the form in order, then keep the preview beside you while refining the document.
                </p>
              </div>

              <nav className="rounded-[1.75rem] border border-[var(--border-strong)] bg-white/94 p-3 shadow-[var(--shadow-soft)]">
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex items-center gap-3 rounded-[1rem] border border-transparent px-3 py-3 transition-colors hover:border-[var(--border-soft)] hover:bg-[var(--surface-soft)]"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-accent)] text-[0.72rem] font-semibold text-[var(--foreground)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-medium text-[var(--foreground-soft)]">
                        {section.label}
                      </span>
                    </a>
                  ))}
                </div>
              </nav>
            </div>
          </aside>

          <section
            className={cn(
              "rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(247,250,255,0.96),rgba(255,255,255,0.98))] p-4 shadow-[var(--shadow-soft)] md:p-5",
              !isDesktopWorkspace && mobileTab !== "build" && "hidden",
            )}
          >
            <div className="rounded-[1.5rem] border border-[var(--border-soft)] bg-white/92 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-4">
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[var(--muted-foreground)]">
                    {builderEyebrow}
                  </p>
                  <h2 className="mt-2 text-[1.35rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                    {builderTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                    {builderDescription}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 xl:hidden">
                  {sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground-soft)] transition-colors hover:border-[var(--accent)] hover:bg-white"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[0.62rem]">
                        {index + 1}
                      </span>
                      {section.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-5">{builderContent}</div>
          </section>

          <section
            className={cn(
              "rounded-[2rem] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(18,24,38,0.03),rgba(255,255,255,0.98))] p-4 shadow-[var(--shadow-card)] md:p-5 xl:sticky xl:top-6",
              !isDesktopWorkspace && mobileTab !== "preview" && "hidden",
            )}
          >
            <div className="mb-4 rounded-[1.5rem] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,248,255,0.96))] p-4 shadow-[0_18px_32px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[rgba(248,113,113,0.85)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[rgba(251,191,36,0.85)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[rgba(74,222,128,0.85)]" />
                <div className="ml-3 rounded-full border border-[var(--border-soft)] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                  Synced preview
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[var(--muted-foreground)]">
                    {previewEyebrow}
                  </p>
                  <h2 className="mt-2 text-[1.4rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                    {previewTitle}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    A4 canvas
                  </span>
                  <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
                    Live updates
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                {previewDescription}
              </p>
            </div>

            {previewContent}
          </section>

          {!isDesktopWorkspace ? (
            <section
              className={cn(
                "rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.98))] p-5 shadow-[var(--shadow-soft)] xl:hidden",
                mobileTab === "export" ? "block" : "hidden",
              )}
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                Export
              </p>
              <h2 className="mt-3 text-[1.45rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                Print or download the current document
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                Use the current form state to open the print surface or export PDF and PNG output.
              </p>

              <div className="mt-5 grid gap-3">
                {actions.map((action) => renderAction(action))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
