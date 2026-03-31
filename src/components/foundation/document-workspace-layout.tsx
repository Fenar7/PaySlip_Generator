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

export type WorkspaceExportDialog =
  | {
      state: "pending";
      format: "pdf" | "png";
      onClose: () => void;
    }
  | {
      state: "success";
      format: "pdf" | "png";
      onClose: () => void;
      onRetry: () => void;
      errorMessage?: never;
    }
  | {
      state: "error";
      format: "pdf" | "png";
      onClose: () => void;
      onRetry: () => void;
      errorMessage: string;
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
  exportDialog?: WorkspaceExportDialog;
};

type MobileTab = "build" | "preview" | "export";

const mobileTabs = [
  { id: "build", label: "Build" },
  { id: "preview", label: "Preview" },
  { id: "export", label: "Export" },
] as const;

function ExportInfoIcon({ kind }: { kind: "spark" | "download" | "shield" }) {
  const commonProps = {
    className: "h-4 w-4",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (kind === "spark") {
    return (
      <svg {...commonProps}>
        <path d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z" />
      </svg>
    );
  }

  if (kind === "download") {
    return (
      <svg {...commonProps}>
        <path d="M12 4v10" />
        <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
        <path d="M5 18h14" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 3 6 5.5v5.6c0 4 2.6 7.7 6 9.4 3.4-1.7 6-5.4 6-9.4V5.5L12 3Z" />
      <path d="m9.5 12 1.7 1.7 3.3-3.4" />
    </svg>
  );
}

function ExportFormatIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4" />
      <path d="M12 10v6" />
      <path d="m9.5 13.5 2.5 2.5 2.5-2.5" />
      <path d="M9 20h6" />
      <path d="M8 8h4" />
    </svg>
  );
}

function actionClassName(variant: WorkspaceAction["variant"]) {
  switch (variant) {
    case "primary":
      return "border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-[0_16px_30px_rgba(232,64,30,0.18)] hover:brightness-105";
    case "secondary":
      return "border border-[var(--border-strong)] bg-white text-[var(--foreground)] shadow-[0_10px_24px_rgba(34,34,34,0.04)] hover:bg-[rgba(248,241,235,0.72)]";
    case "subtle":
    default:
      return "border border-[var(--border-soft)] bg-[rgba(248,241,235,0.88)] text-[var(--foreground-soft)] shadow-[0_10px_24px_rgba(34,34,34,0.03)] hover:bg-[rgba(246,238,231,0.98)]";
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
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        action.onClick?.();
      }}
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
  exportDialog,
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
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(232,64,30,0.09),transparent_36%),radial-gradient(circle_at_82%_16%,rgba(87,87,96,0.05),transparent_28%)]" />
      <div className="absolute inset-y-0 left-0 -z-10 hidden w-[24rem] bg-[linear-gradient(180deg,rgba(245,239,233,0.72),rgba(245,239,233,0))] xl:block" />

      <div className="mx-auto flex w-full max-w-[108rem] flex-col gap-5 px-3 py-5 sm:px-4 lg:px-5 lg:py-7">
        <section className="rounded-[2.3rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,243,237,0.94))] p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
            <div className="max-w-4xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                {eyebrow}
              </p>
              <h1 className="mt-3 max-w-3xl text-[2.3rem] leading-[0.98] tracking-[-0.05em] text-[var(--foreground)] md:text-[3rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-[0.98rem] leading-7 text-[var(--foreground-soft)]">
                {description}
              </p>
              <div className="mt-5 hidden flex-wrap gap-2 xl:flex">
                {actions.map((action) => renderAction(action, true))}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.86)] p-4 shadow-[0_14px_30px_rgba(34,34,34,0.05)]">
              <div className="grid grid-cols-3 gap-2.5">
                {quickStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[1.05rem] border border-[var(--border-soft)] bg-white/92 px-3 py-3"
                  >
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
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
            <div className="sticky top-4 z-20 rounded-[1.4rem] border border-[var(--border-strong)] bg-[rgba(255,255,255,0.94)] p-1.5 shadow-[var(--shadow-soft)] backdrop-blur sm:rounded-[1.5rem] sm:p-2">
              <div className="flex gap-1.5 sm:gap-2">
                {mobileTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTab(tab.id)}
                    className={cn(
                      "min-w-0 flex-1 rounded-[1rem] px-2.5 py-2.5 text-[0.82rem] font-medium transition-colors sm:rounded-[1.05rem] sm:px-4 sm:py-3 sm:text-sm",
                      mobileTab === tab.id
                        ? "bg-[var(--accent)] text-white shadow-[0_14px_28px_rgba(232,64,30,0.2)]"
                        : "bg-[rgba(248,241,235,0.72)] text-[var(--foreground-soft)]",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[14rem_1fr] xl:items-start">
          <aside className="hidden xl:block">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-[1.85rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,241,235,0.94))] p-5 shadow-[0_18px_34px_rgba(34,34,34,0.06)]">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                  Workspace map
                </p>
                <p className="mt-3 text-lg font-medium leading-tight text-[var(--foreground)]">
                  Build, review, and export from one focused canvas.
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground-soft)]">
                  Move through the form in order, then keep the preview beside you while refining the document.
                </p>
              </div>

              <nav className="rounded-[1.85rem] border border-[var(--border-strong)] bg-white/95 p-3 shadow-[var(--shadow-soft)]">
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-[1.1rem] border px-3 py-3 transition-colors",
                        index === 0
                          ? "border-[rgba(232,64,30,0.14)] bg-[rgba(248,241,235,0.82)]"
                          : "border-transparent hover:border-[var(--border-soft)] hover:bg-[rgba(248,241,235,0.72)]",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full border text-[0.72rem] font-semibold",
                          index === 0
                            ? "border-[rgba(232,64,30,0.16)] bg-white text-[var(--accent)]"
                            : "border-[var(--border-soft)] bg-[rgba(248,241,235,0.82)] text-[var(--foreground)]",
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          index === 0 ? "text-[var(--foreground)]" : "text-[var(--foreground-soft)]",
                        )}
                      >
                        {section.label}
                      </span>
                    </a>
                  ))}
                </div>
              </nav>
            </div>
          </aside>

          <div className="space-y-5">
          <section
            className={cn(
              "rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(250,247,242,0.96),rgba(255,255,255,0.98))] p-4 shadow-[var(--shadow-soft)] md:p-5",
              !isDesktopWorkspace && mobileTab !== "build" && "hidden",
            )}
          >
            <div className="rounded-[1.65rem] border border-[var(--border-soft)] bg-white/94 p-4 shadow-[0_12px_28px_rgba(34,34,34,0.04)]">
              <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-4">
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[var(--muted-foreground)]">
                    {builderEyebrow}
                  </p>
                  <h2 className="mt-2 text-[1.35rem] font-medium leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                    {builderTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[var(--foreground-soft)]">
                    {builderDescription}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 xl:hidden">
                  {sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[rgba(248,241,235,0.72)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--foreground-soft)] transition-colors hover:border-[var(--accent)] hover:bg-white"
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
              "rounded-none border-0 bg-transparent p-0 shadow-none sm:rounded-[2.1rem] sm:border sm:border-[rgba(34,34,34,0.08)] sm:bg-[linear-gradient(180deg,rgba(247,241,235,0.82),rgba(255,255,255,0.98))] sm:p-4 sm:shadow-[var(--shadow-card)] md:p-5",
              !isDesktopWorkspace && mobileTab !== "preview" && "hidden",
            )}
          >
            <div className="mb-3 hidden rounded-[1.3rem] border border-[rgba(34,34,34,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,241,235,0.96))] p-3 shadow-[0_12px_24px_rgba(34,34,34,0.05)] sm:block sm:mb-4 sm:rounded-[1.65rem] sm:p-4 sm:shadow-[0_18px_32px_rgba(34,34,34,0.05)]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[rgba(248,113,113,0.85)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[rgba(251,191,36,0.85)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[rgba(74,222,128,0.85)]" />
                <div className="ml-3 rounded-full border border-[var(--border-soft)] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                  Synced preview
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[var(--muted-foreground)]">
                    {previewEyebrow}
                  </p>
                  <h2 className="mt-2 text-[1.15rem] font-medium leading-tight tracking-[-0.04em] text-[var(--foreground)] sm:text-[1.4rem]">
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

              <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)] sm:mt-3">
                {previewDescription}
              </p>
            </div>

            {previewContent}
          </section>

          {!isDesktopWorkspace ? (
          <section
            className={cn(
              "rounded-[1.8rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,241,235,0.98))] p-4 shadow-[var(--shadow-soft)] sm:rounded-[2rem] sm:p-5 xl:hidden",
              mobileTab === "export" ? "block" : "hidden",
            )}
          >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                Export
              </p>
              <h2 className="mt-3 text-[1.45rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                Print or download the current document
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--foreground-soft)]">
                Use the current form state to open the print surface or export PDF and PNG output.
              </p>

              <div className="mt-5 grid gap-3">
                {actions.map((action) => renderAction(action))}
              </div>
            </section>
          ) : null}
          </div>
        </div>
      </div>

      {exportDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6"
        >
          <div
            className="absolute inset-0 bg-[rgba(34,34,34,0.24)]"
            onClick={() => exportDialog.onClose()}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-export-dialog-title"
            className="relative max-h-[calc(100vh-1.5rem)] w-full max-w-[34rem] overflow-y-auto overflow-x-hidden rounded-[1.6rem] border border-[rgba(255,255,255,0.7)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,241,235,0.98))] p-4 shadow-[0_28px_72px_rgba(34,34,34,0.12)] backdrop-blur-xl sm:max-h-[calc(100vh-3rem)] sm:rounded-[2.15rem] sm:p-6 md:p-7"
          >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(232,64,30,0.10),transparent_62%)] sm:h-40" />
            <button
              type="button"
              onClick={() => exportDialog.onClose()}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white/92 text-[var(--foreground-soft)] shadow-[0_10px_24px_rgba(34,34,34,0.05)] transition-colors hover:bg-[rgba(248,241,235,0.82)] sm:right-4 sm:top-4 sm:h-10 sm:w-10"
              aria-label="Close export dialog"
            >
              ×
            </button>

            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[rgba(232,64,30,0.14)] bg-[linear-gradient(180deg,rgba(232,64,30,0.10),rgba(255,255,255,0.94))] text-[var(--accent)] shadow-[0_16px_34px_rgba(232,64,30,0.10)] sm:h-14 sm:w-14 sm:rounded-[1.2rem]">
                <ExportFormatIcon />
              </div>

              <div className="inline-flex rounded-full border border-[var(--border-soft)] bg-white/90 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)] shadow-[0_10px_24px_rgba(34,34,34,0.04)] sm:text-[0.68rem] sm:tracking-[0.26em]">
                Export {exportDialog.format.toUpperCase()}
              </div>
            </div>

            <h3
              id="workspace-export-dialog-title"
              className="mt-4 max-w-[20rem] text-[1.9rem] leading-[0.96] tracking-[-0.055em] text-[var(--foreground)] sm:mt-5 sm:max-w-[24rem] sm:text-[2.2rem] sm:leading-[0.94] sm:tracking-[-0.06em]"
            >
              {exportDialog.state === "pending"
                ? "Preparing your download"
                : exportDialog.state === "success"
                  ? "Your download should start shortly"
                  : "Export failed"}
            </h3>

            <p className="mt-3 max-w-[28rem] text-[0.95rem] leading-7 text-[var(--foreground-soft)] sm:mt-4 sm:text-[1rem] sm:leading-8">
              {exportDialog.state === "pending"
                ? "Thanks for using Slipwise. We are preparing your file and will start the download as soon as it is ready."
                : exportDialog.state === "success"
                  ? "Thanks for using Slipwise. If your file does not begin downloading automatically, use the fallback action below."
                  : exportDialog.errorMessage}
            </p>

            <div className="mt-5 rounded-[1.2rem] border border-[rgba(232,64,30,0.10)] bg-[linear-gradient(180deg,rgba(248,241,235,0.96),rgba(255,255,255,0.98))] p-3.5 shadow-[0_14px_30px_rgba(34,34,34,0.05)] sm:mt-6 sm:rounded-[1.4rem] sm:p-4">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex h-3 w-3 rounded-full shadow-[0_0_0_6px_rgba(232,64,30,0.08)]",
                    exportDialog.state === "pending"
                      ? "animate-pulse bg-[var(--accent)]"
                      : exportDialog.state === "success"
                        ? "bg-emerald-500"
                        : "bg-[var(--danger)]",
                  )}
                />
                <p className="text-[0.92rem] font-medium leading-6 text-[var(--foreground)] sm:text-sm">
                  {exportDialog.state === "pending"
                    ? "Building the export file..."
                    : exportDialog.state === "success"
                      ? "Download handoff sent to your browser."
                      : "Slipwise could not generate the file."}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
              <div className="flex items-start gap-3 rounded-[1rem] border border-[var(--border-soft)] bg-white/94 px-3.5 py-3.5 shadow-[0_10px_24px_rgba(34,34,34,0.04)] sm:gap-4 sm:rounded-[1.2rem] sm:px-4 sm:py-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--accent)] sm:h-10 sm:w-10">
                  <ExportInfoIcon kind="spark" />
                </span>
                <div>
                  <p className="text-[0.92rem] font-semibold text-[var(--foreground)] sm:text-sm">Quick handoff</p>
                  <p className="mt-1 text-[0.9rem] leading-6 text-[var(--muted-foreground)] sm:text-sm sm:leading-7">
                    Slipwise prepares the file and hands it off to your browser as soon as it is ready.
                  </p>
                </div>
              </div>

              <div className="hidden items-start gap-3 rounded-[1rem] border border-[var(--border-soft)] bg-white/94 px-3.5 py-3.5 shadow-[0_10px_24px_rgba(34,34,34,0.04)] sm:flex sm:gap-4 sm:rounded-[1.2rem] sm:px-4 sm:py-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--accent)] sm:h-10 sm:w-10">
                  <ExportInfoIcon kind="download" />
                </span>
                <div>
                  <p className="text-[0.92rem] font-semibold text-[var(--foreground)] sm:text-sm">Direct download</p>
                  <p className="mt-1 text-[0.9rem] leading-6 text-[var(--muted-foreground)] sm:text-sm sm:leading-7">
                    Your PDF or PNG is generated directly from the current workspace state.
                  </p>
                </div>
              </div>

              <div className="hidden items-start gap-3 rounded-[1rem] border border-[var(--border-soft)] bg-white/94 px-3.5 py-3.5 shadow-[0_10px_24px_rgba(34,34,34,0.04)] sm:flex sm:gap-4 sm:rounded-[1.2rem] sm:px-4 sm:py-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--accent)] sm:h-10 sm:w-10">
                  <ExportInfoIcon kind="shield" />
                </span>
                <div>
                  <p className="text-[0.92rem] font-semibold text-[var(--foreground)] sm:text-sm">Safe fallback</p>
                  <p className="mt-1 text-[0.9rem] leading-6 text-[var(--muted-foreground)] sm:text-sm sm:leading-7">
                    If the browser delays the file, you can restart the same download right here.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:flex-wrap sm:gap-3">
              {exportDialog.state !== "pending" ? (
                <button
                  type="button"
                  onClick={exportDialog.onRetry}
                  className="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(34,34,34,0.10)] transition-all hover:brightness-105 sm:w-auto"
                >
                  {exportDialog.state === "success" ? "Try download again" : "Try export again"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-medium text-white opacity-90 sm:w-auto"
                >
                  Preparing download
                </button>
              )}

              <button
                type="button"
                onClick={() => exportDialog.onClose()}
                className="inline-flex w-full items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-5 py-3 text-sm font-medium text-[var(--foreground)] shadow-[0_10px_24px_rgba(34,34,34,0.04)] transition-colors hover:bg-[var(--surface-accent)] sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
