"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  FileText,
  ScrollText,
  Sparkles,
  Download,
  ShieldCheck,
  FileDown,
} from "lucide-react";

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
  documentEditorContent?: ReactNode;
};

type ViewMode = "form" | "document";
type MobileTab = "build" | "preview" | "export" | "document";

const formMobileTabs = [
  { id: "build", label: "Build" },
  { id: "preview", label: "Preview" },
  { id: "export", label: "Export" },
] as const satisfies { id: MobileTab; label: string }[];

const documentMobileTabs = [
  { id: "document", label: "Document" },
  { id: "export", label: "Export" },
] as const satisfies { id: MobileTab; label: string }[];

function actionClassName(variant: WorkspaceAction["variant"]) {
  switch (variant) {
    case "primary":
      return "border border-transparent bg-[var(--brand-cta)] text-white hover:bg-[#B91C1C]";
    case "secondary":
      return "border border-[var(--border-default)] bg-white text-[var(--text-primary)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-subtle)]";
    case "subtle":
    default:
      return "border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[#E8EBF0]";
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
  documentEditorContent,
}: DocumentWorkspaceLayoutProps) {
  const [mobileTab, setMobileTab] = useState<MobileTab>("build");
  const [isDesktopWorkspace, setIsDesktopWorkspace] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("form");

  const handleSetViewMode = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      setMobileTab(mode === "document" ? "document" : "build");
    },
    [],
  );

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

  const previewHeader = (
    <>
      <div className="mb-3 hidden rounded-xl border border-[var(--border-soft)] bg-white p-3 shadow-[var(--shadow-xs)] sm:block sm:mb-4 sm:p-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(248,113,113,0.85)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(251,191,36,0.85)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(74,222,128,0.85)]" />
          <div className="ml-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
            Synced preview
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[var(--text-muted)]">
              {previewEyebrow}
            </p>
            <h2 className="mt-2 text-[1.15rem] font-medium leading-tight tracking-[-0.04em] text-[var(--text-primary)] sm:text-[1.4rem]">
              {previewTitle}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              A4 canvas
            </span>
            <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Live updates
            </span>
          </div>
        </div>

        <p className="mt-2 text-sm leading-7 text-[var(--text-muted)] sm:mt-3">
          {previewDescription}
        </p>
      </div>
      {previewContent}
    </>
  );

  return (
    <main className="slipwise-shell-bg relative isolate overflow-hidden">
      <div className="mx-auto flex w-full max-w-[108rem] flex-col gap-5 px-3 py-5 sm:px-4 lg:px-5 lg:py-7">
        {/* Header */}
        <section className="rounded-2xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
            <div className="max-w-4xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--text-muted)]">
                {eyebrow}
              </p>
              <h1 className="mt-3 max-w-3xl text-[2.3rem] leading-[0.98] tracking-[-0.05em] text-[var(--text-primary)] md:text-[3rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-[0.98rem] leading-7 text-[var(--text-secondary)]">
                {description}
              </p>
              <div className="mt-5 hidden flex-wrap items-center gap-2 xl:flex">
                {actions.map((action) => renderAction(action, true))}
                {documentEditorContent ? (
                  <div className="ml-auto flex gap-1 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-1">
                    <button
                      type="button"
                      onClick={() => handleSetViewMode("form")}
                      title="Form view"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        viewMode === "form"
                          ? "bg-white text-[var(--text-primary)] shadow-[var(--shadow-xs)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                      )}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Form
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetViewMode("document")}
                      title="Document view"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        viewMode === "document"
                          ? "bg-white text-[var(--text-primary)] shadow-[var(--shadow-xs)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                      )}
                    >
                      <ScrollText className="h-3.5 w-3.5" />
                      Document
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-soft)] bg-white p-4 shadow-[var(--shadow-xs)]">
              <div className="grid grid-cols-3 gap-2.5">
                {quickStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-3"
                  >
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {isDesktopWorkspace ? (
                <div className="mt-4 flex flex-wrap gap-2 xl:hidden">
                  {actions.map((action) => renderAction(action, true))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-xl border border-[rgba(220,38,38,0.2)] bg-[var(--state-danger-soft)] px-5 py-4 text-sm text-[var(--state-danger)] shadow-[var(--shadow-xs)]">
            {errorMessage}
          </div>
        ) : null}

        {/* Mobile tabs */}
        {!isDesktopWorkspace ? (
          <div className="xl:hidden">
            <div className="sticky top-4 z-20 rounded-xl border border-[var(--border-default)] bg-white/95 p-1.5 shadow-[var(--shadow-xs)] backdrop-blur sm:p-2">
              {documentEditorContent ? (
                <div className="mb-1.5 flex gap-1 border-b border-[var(--border-soft)] pb-1.5 sm:mb-2 sm:pb-2">
                  <button
                    type="button"
                    onClick={() => handleSetViewMode("form")}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-[0.76rem] font-medium transition-colors",
                      viewMode === "form"
                        ? "bg-[var(--text-primary)] text-white"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]",
                    )}
                  >
                    Form
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetViewMode("document")}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-[0.76rem] font-medium transition-colors",
                      viewMode === "document"
                        ? "bg-[var(--text-primary)] text-white"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]",
                    )}
                  >
                    Document
                  </button>
                </div>
              ) : null}
              <div className="flex gap-1.5 sm:gap-2">
                {(viewMode === "document" && documentEditorContent ? documentMobileTabs : formMobileTabs).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMobileTab(tab.id)}
                    className={cn(
                      "min-w-0 flex-1 rounded-lg px-2.5 py-2.5 text-[0.82rem] font-medium transition-colors sm:px-4 sm:py-3 sm:text-sm",
                      mobileTab === tab.id
                        ? "bg-[var(--text-primary)] text-white"
                        : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Main workspace grid */}
        <div className="grid gap-5 xl:grid-cols-[14rem_1fr] xl:items-start">
          {/* Sidebar — desktop only */}
          <aside className="hidden xl:block">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-xl border border-[var(--border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
                  Workspace map
                </p>
                <p className="mt-3 text-lg font-medium leading-tight text-[var(--text-primary)]">
                  Build, review, and export from one focused canvas.
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Move through the form in order, then keep the preview beside you while refining the document.
                </p>
              </div>

              <nav className="rounded-xl border border-[var(--border-default)] bg-white p-3 shadow-[var(--shadow-xs)]">
                <div className="space-y-2">
                  {sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors",
                        index === 0
                          ? "border-[var(--border-soft)] bg-[var(--surface-subtle)]"
                          : "border-transparent hover:border-[var(--border-soft)] hover:bg-[var(--surface-subtle)]",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full border text-[0.72rem] font-semibold",
                          index === 0
                            ? "border-[var(--border-default)] bg-white text-[var(--text-primary)]"
                            : "border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]",
                        )}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          index === 0 ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
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

          {/* Content area — becomes 2-col on desktop in form view */}
          <div className="space-y-5 xl:grid xl:grid-cols-[1fr_30rem] xl:gap-5">
            {/* Builder section */}
            {viewMode === "form" ? (
              <section
                className={cn(
                  "rounded-2xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-card)] md:p-5",
                  !isDesktopWorkspace && mobileTab !== "build" && "hidden",
                  "xl:block",
                )}
              >
                <div className="rounded-xl border border-[var(--border-soft)] bg-white p-4 shadow-[var(--shadow-xs)]">
                  <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-4">
                    <div>
                      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[var(--text-muted)]">
                        {builderEyebrow}
                      </p>
                      <h2 className="mt-2 text-[1.35rem] font-medium leading-tight tracking-[-0.04em] text-[var(--text-primary)]">
                        {builderTitle}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                        {builderDescription}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:hidden">
                      {sections.map((section, index) => (
                        <a
                          key={section.id}
                          href={`#${section.id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-default)] hover:bg-white"
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
            ) : null}

            {/* Preview — single instance, responsive layout */}
            {viewMode === "form" ? (
              <div
                className={cn(
                  !isDesktopWorkspace && mobileTab !== "preview" && "hidden",
                  "xl:block",
                )}
              >
                <div className="xl:sticky xl:top-6">
                  <section
                    className={cn(
                      "rounded-none border-0 bg-transparent p-0 shadow-none",
                      "sm:rounded-2xl sm:border sm:border-[var(--border-default)] sm:bg-white sm:p-4 sm:shadow-[var(--shadow-card)] md:p-5",
                    )}
                  >
                    {previewHeader}
                  </section>
                </div>
              </div>
            ) : null}

            {/* Mobile export */}
            {!isDesktopWorkspace ? (
              <section
                className={cn(
                  "rounded-2xl border border-[var(--border-default)] bg-white p-4 shadow-[var(--shadow-card)] sm:p-5 xl:hidden",
                  mobileTab === "export" ? "block" : "hidden",
                )}
              >
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--text-muted)]">
                  Export
                </p>
                <h2 className="mt-3 text-[1.45rem] leading-tight tracking-[-0.04em] text-[var(--text-primary)]">
                  Print or download the current document
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                  Use the current form state to open the print surface or export PDF and PNG output.
                </p>

                <div className="mt-5 grid gap-3">
                  {actions.map((action) => renderAction(action))}
                </div>
              </section>
            ) : null}

            {/* Document editor */}
            {documentEditorContent && viewMode === "document" && (!isDesktopWorkspace ? mobileTab === "document" : true) ? (
              <section className="xl:col-span-2">
                {documentEditorContent}
              </section>
            ) : null}
          </div>
        </div>
      </div>

      {/* Export dialog */}
      {exportDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => exportDialog.onClose()}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-export-dialog-title"
            className="relative max-h-[calc(100vh-1.5rem)] w-full max-w-[34rem] overflow-y-auto overflow-x-hidden rounded-2xl border border-[var(--border-default)] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:max-h-[calc(100vh-3rem)] sm:p-6 md:p-7"
          >
            <button
              type="button"
              onClick={() => exportDialog.onClose()}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white text-[var(--text-secondary)] shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--surface-subtle)] sm:right-4 sm:top-4 sm:h-10 sm:w-10"
              aria-label="Close export dialog"
            >
              ×
            </button>

            <div className="relative flex items-center gap-3 sm:gap-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--brand-cta)] sm:h-14 sm:w-14">
                <FileDown className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>

              <div className="inline-flex rounded-full border border-[var(--border-soft)] bg-white/90 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)] shadow-[0_10px_24px_rgba(34,34,34,0.04)] sm:text-[0.68rem] sm:tracking-[0.26em]">
                Export {exportDialog.format.toUpperCase()}
              </div>
            </div>

            <h3
              id="workspace-export-dialog-title"
              className="mt-4 max-w-[20rem] text-[1.9rem] leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:mt-5 sm:max-w-[24rem] sm:text-[2.2rem] sm:leading-[0.94] sm:tracking-[-0.06em]"
            >
              {exportDialog.state === "pending"
                ? "Preparing your download"
                : exportDialog.state === "success"
                  ? "Your download should start shortly"
                  : "Export failed"}
            </h3>

            <p className="mt-3 max-w-[28rem] text-[0.95rem] leading-7 text-[var(--text-secondary)] sm:mt-4 sm:text-[1rem] sm:leading-8">
              {exportDialog.state === "pending"
                ? "Thanks for using Slipwise. We are preparing your file and will start the download as soon as it is ready."
                : exportDialog.state === "success"
                  ? "Thanks for using Slipwise. If your file does not begin downloading automatically, use the fallback action below."
                  : exportDialog.errorMessage}
            </p>

            <div className="mt-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3.5 sm:mt-6 sm:p-4">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex h-3 w-3 rounded-full",
                    exportDialog.state === "pending"
                      ? "animate-pulse bg-[var(--brand-cta)]"
                      : exportDialog.state === "success"
                        ? "bg-[var(--state-success)]"
                        : "bg-[var(--state-danger)]",
                  )}
                />
                <p className="text-[0.92rem] font-medium leading-6 text-[var(--text-primary)] sm:text-sm">
                  {exportDialog.state === "pending"
                    ? "Building the export file..."
                    : exportDialog.state === "success"
                      ? "Download handoff sent to your browser."
                      : "Slipwise could not generate the file."}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-white px-3.5 py-3.5 shadow-[var(--shadow-xs)] sm:gap-4 sm:px-4 sm:py-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--text-secondary)] sm:h-10 sm:w-10">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[0.92rem] font-semibold text-[var(--text-primary)] sm:text-sm">Quick handoff</p>
                  <p className="mt-1 text-[0.9rem] leading-6 text-[var(--text-muted)] sm:text-sm sm:leading-7">
                    Slipwise prepares the file and hands it off to your browser as soon as it is ready.
                  </p>
                </div>
              </div>

              <div className="hidden items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-white px-3.5 py-3.5 shadow-[var(--shadow-xs)] sm:flex sm:gap-4 sm:px-4 sm:py-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--text-secondary)] sm:h-10 sm:w-10">
                  <Download className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[0.92rem] font-semibold text-[var(--text-primary)] sm:text-sm">Direct download</p>
                  <p className="mt-1 text-[0.9rem] leading-6 text-[var(--text-muted)] sm:text-sm sm:leading-7">
                    Your PDF or PNG is generated directly from the current workspace state.
                  </p>
                </div>
              </div>

              <div className="hidden items-start gap-3 rounded-xl border border-[var(--border-soft)] bg-white px-3.5 py-3.5 shadow-[var(--shadow-xs)] sm:flex sm:gap-4 sm:px-4 sm:py-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--text-secondary)] sm:h-10 sm:w-10">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[0.92rem] font-semibold text-[var(--text-primary)] sm:text-sm">Safe fallback</p>
                  <p className="mt-1 text-[0.9rem] leading-6 text-[var(--text-muted)] sm:text-sm sm:leading-7">
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
                  className="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-[var(--brand-cta)] px-5 py-3 text-sm font-medium text-white transition-all hover:bg-[#B91C1C] sm:w-auto"
                >
                  {exportDialog.state === "success" ? "Try download again" : "Try export again"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-[var(--brand-cta)] px-5 py-3 text-sm font-medium text-white opacity-60 sm:w-auto"
                >
                  Preparing download
                </button>
              )}

              <button
                type="button"
                onClick={() => exportDialog.onClose()}
                className="inline-flex w-full items-center justify-center rounded-full border border-[var(--border-default)] bg-white px-5 py-3 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--surface-subtle)] sm:w-auto"
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
