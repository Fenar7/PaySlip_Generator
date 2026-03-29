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

function actionClassName(variant: WorkspaceAction["variant"]) {
  switch (variant) {
    case "primary":
      return "border border-transparent bg-[linear-gradient(135deg,var(--foreground),#1f2937)] text-[var(--background)] shadow-[0_18px_36px_rgba(15,23,42,0.16)] hover:bg-[var(--foreground-soft)]";
    case "secondary":
      return "border border-[var(--border-strong)] bg-white text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.04)] hover:bg-[var(--surface-accent)]";
    case "subtle":
    default:
      return "border border-transparent bg-[var(--surface-accent)] text-[var(--foreground-soft)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:bg-[var(--surface-accent-strong)]";
  }
}

function renderAction(action: WorkspaceAction, compact = false) {
  const className = cn(
    "inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-65",
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

  const mobileTabs = useMemo(
    () =>
      [
        { id: "build", label: "Build" },
        { id: "preview", label: "Preview" },
        { id: "export", label: "Export" },
      ] as const,
    [],
  );

  return (
    <main className="slipwise-shell-bg relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,rgba(45,107,255,0.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(103,203,255,0.12),transparent_24%)]" />
      <div className="mx-auto flex w-full max-w-[95rem] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-[2.2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(246,249,255,0.98))] p-5 shadow-[var(--shadow-card)] backdrop-blur-sm md:p-6 xl:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                {eyebrow}
              </p>
              <h1 className="mt-3 max-w-2xl text-[2.45rem] leading-[0.96] tracking-[-0.05em] text-[var(--foreground)] md:text-[3.2rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-[1rem] leading-8 text-[var(--muted-foreground)]">
                {description}
              </p>
            </div>

            {isDesktopWorkspace ? (
            <div className="flex flex-wrap gap-3">
              {actions.map((action) => renderAction(action, true))}
            </div>
            ) : null}
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

        <div className="grid gap-6 xl:grid-cols-[minmax(24.5rem,29rem)_minmax(0,1fr)] xl:items-start">
          <section
            className={cn(
              "rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(248,251,255,0.96),rgba(242,247,255,0.98))] p-4 shadow-[var(--shadow-soft)] md:p-5",
              !isDesktopWorkspace && mobileTab !== "build" && "hidden",
            )}
          >
            <div className="border-b border-[var(--border-soft)] pb-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                {builderEyebrow}
              </p>
              <h2 className="mt-3 text-[1.45rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                {builderTitle}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                {builderDescription}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)] shadow-[0_8px_18px_rgba(15,23,42,0.03)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                  >
                    {section.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-5">{builderContent}</div>
          </section>

          <section
            className={cn(
              "rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(240,246,255,0.98))] p-4 shadow-[var(--shadow-card)] md:p-5 xl:sticky xl:top-6",
              !isDesktopWorkspace && mobileTab !== "preview" && "hidden",
            )}
          >
            <div className="mb-4 rounded-[1.35rem] border border-[var(--border-soft)] bg-white/78 px-4 py-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                {previewEyebrow}
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-[1.35rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                  {previewTitle}
                </h2>
                <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-accent)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                  Live
                </span>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                {previewDescription}
              </p>
            </div>

            {previewContent}
          </section>

          {!isDesktopWorkspace ? (
          <section
            className={cn(
              "rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,248,253,0.98))] p-5 shadow-[var(--shadow-soft)] xl:hidden",
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
