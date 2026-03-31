"use client";

import { useCallback, useState } from "react";
import { FormSection } from "@/components/forms/form-section";
import { ImageOrganizer } from "@/features/pdf-studio/components/image-organizer";
import { PageSettingsPanel } from "@/features/pdf-studio/components/page-settings-panel";
import { PdfPreview } from "@/features/pdf-studio/components/pdf-preview";
import {
  PDF_STUDIO_DEFAULT_SETTINGS,
  PDF_STUDIO_MAX_IMAGES,
  PDF_STUDIO_SUPPORTED_EXTENSIONS,
} from "@/features/pdf-studio/constants";
import type {
  ImageItem,
  PageSettings,
  PdfStudioActionState,
} from "@/features/pdf-studio/types";
import {
  generatePdfFromImages,
  downloadPdfBlob,
  type GenerationProgress,
} from "@/features/pdf-studio/utils/pdf-generator";
import { cn } from "@/lib/utils";
import Link from "next/link";

const workspaceSections = [
  { id: "pdf-studio-upload", label: "Upload" },
  { id: "pdf-studio-settings", label: "Settings" },
  { id: "pdf-studio-preview", label: "Preview" },
];

function GenerationDialog({
  state,
  progress,
  onClose,
  onRetry,
}: {
  state: PdfStudioActionState;
  progress: GenerationProgress | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  if (state.status === "idle") return null;

  const isPending = state.status === "generating";
  const isSuccess = state.status === "success";
  const isError = state.status === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
      <div className="absolute inset-0 bg-[rgba(34,34,34,0.24)]" onClick={isPending ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-studio-dialog-title"
        className="relative max-h-[calc(100vh-1.5rem)] w-full max-w-[34rem] overflow-y-auto overflow-x-hidden rounded-[1.6rem] border border-[rgba(255,255,255,0.7)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,241,235,0.98))] p-5 shadow-[0_28px_72px_rgba(34,34,34,0.12)] backdrop-blur-xl sm:rounded-[2.1rem] sm:p-7"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(232,64,30,0.10),transparent_62%)]" />

        {!isPending ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-soft)] bg-white/92 text-[var(--foreground-soft)] shadow-[0_10px_24px_rgba(34,34,34,0.05)] transition-colors hover:bg-[rgba(248,241,235,0.82)]"
            aria-label="Close"
          >
            ×
          </button>
        ) : null}

        <div className="relative flex items-center gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[rgba(232,64,30,0.14)] bg-[linear-gradient(180deg,rgba(232,64,30,0.10),rgba(255,255,255,0.94))] text-[var(--accent)] shadow-[0_16px_34px_rgba(232,64,30,0.10)]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 3h8l4 4v14H7z" />
              <path d="M15 3v4h4" />
              <path d="M12 10v6" />
              <path d="m9.5 13.5 2.5 2.5 2.5-2.5" />
            </svg>
          </div>
          <div className="inline-flex rounded-full border border-[var(--border-soft)] bg-white/90 px-3 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)] shadow-[0_10px_24px_rgba(34,34,34,0.04)]">
            PDF Studio
          </div>
        </div>

        <h3
          id="pdf-studio-dialog-title"
          className="mt-4 text-[1.9rem] leading-[0.96] tracking-[-0.055em] text-[var(--foreground)] sm:text-[2.2rem]"
        >
          {isPending
            ? "Generating your PDF"
            : isSuccess
              ? "Your PDF is ready"
              : "Generation failed"}
        </h3>

        <p className="mt-3 text-[0.95rem] leading-7 text-[var(--foreground-soft)]">
          {isPending
            ? "Converting your images into a single PDF document. This may take a moment for larger batches."
            : isSuccess
              ? "Your PDF has been downloaded. Start over to create a new document."
              : isError
                ? state.message
                : ""}
        </p>

        {isPending && progress ? (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-[0.8rem] text-[var(--foreground-soft)]">
              <span className="capitalize">{progress.stage}</span>
              <span>{progress.current} of {progress.total}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))] transition-all duration-300"
                style={{ width: `${progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-[1.2rem] border border-[rgba(232,64,30,0.10)] bg-[linear-gradient(180deg,rgba(248,241,235,0.96),rgba(255,255,255,0.98))] p-3.5 shadow-[0_14px_30px_rgba(34,34,34,0.05)]">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-block h-3 w-3 rounded-full shadow-[0_0_0_6px_rgba(232,64,30,0.08)]",
                isPending
                  ? "animate-pulse bg-[var(--accent)]"
                  : isSuccess
                    ? "bg-emerald-500"
                    : "bg-[var(--danger)]",
              )}
            />
            <p className="text-[0.92rem] font-medium leading-6 text-[var(--foreground)]">
              {isPending
                ? "Client-side conversion in progress..."
                : isSuccess
                  ? "PDF generated and downloaded successfully."
                  : "Slipwise could not generate the PDF."}
            </p>
          </div>
        </div>

        {!isPending ? (
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={isSuccess ? onClose : onRetry}
              className="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(34,34,34,0.10)] transition-all hover:brightness-105 sm:w-auto"
            >
              {isSuccess ? "Start over" : "Try again"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex w-full items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-5 py-3 text-sm font-medium text-[var(--foreground)] shadow-[0_10px_24px_rgba(34,34,34,0.04)] transition-colors hover:bg-[var(--surface-accent)] sm:w-auto"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PdfStudioWorkspace() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [settings, setSettings] = useState<PageSettings>(PDF_STUDIO_DEFAULT_SETTINGS);
  const [actionState, setActionState] = useState<PdfStudioActionState>({ status: "idle" });
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [mobileTab, setMobileTab] = useState<"upload" | "settings" | "preview">("upload");

  const handleImagesChange = useCallback((newImages: ImageItem[]) => {
    setImages(newImages);
    if (uploadError && newImages.length > 0) {
      setUploadError(undefined);
    }
  }, [uploadError]);

  const handleGenerate = useCallback(async () => {
    if (images.length === 0) {
      setUploadError("Add at least one image before generating the PDF.");
      return;
    }

    setActionState({ status: "generating" });
    setProgress({ current: 0, total: images.length, stage: "loading" });

    try {
      const pdfBytes = await generatePdfFromImages(images, settings, (p) => {
        setProgress(p);
      });

      downloadPdfBlob(pdfBytes, settings.filename);
      setActionState({ status: "success" });
    } catch (error) {
      setActionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to generate the PDF. Check the images and try again.",
      });
    }
  }, [images, settings]);

  const handleDialogClose = useCallback(() => {
    if (actionState.status === "success") {
      setImages([]);
      setSettings(PDF_STUDIO_DEFAULT_SETTINGS);
    }
    setActionState({ status: "idle" });
    setProgress(null);
  }, [actionState.status]);

  const handleRetry = useCallback(() => {
    void handleGenerate();
  }, [handleGenerate]);

  const isPending = actionState.status === "generating";

  const mobileTabs = [
    { id: "upload" as const, label: "Upload" },
    { id: "settings" as const, label: "Settings" },
    { id: "preview" as const, label: "Preview" },
  ];

  return (
    <main className="slipwise-shell-bg relative isolate overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(232,64,30,0.09),transparent_36%),radial-gradient(circle_at_82%_16%,rgba(87,87,96,0.05),transparent_28%)]" />
      <div className="absolute inset-y-0 left-0 -z-10 hidden w-[24rem] bg-[linear-gradient(180deg,rgba(245,239,233,0.72),rgba(245,239,233,0))] xl:block" />

      <div className="mx-auto flex w-full max-w-[108rem] flex-col gap-5 px-3 py-5 sm:px-4 lg:px-5 lg:py-7">
        <section className="rounded-[2.3rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,243,237,0.94))] p-5 shadow-[var(--shadow-card)] md:p-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
            <div className="max-w-4xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                PDF Studio
              </p>
              <h1 className="mt-3 max-w-3xl text-[2.3rem] leading-[0.98] tracking-[-0.05em] text-[var(--foreground)] md:text-[3rem]">
                Images to PDF
              </h1>
              <p className="mt-3 max-w-3xl text-[0.98rem] leading-7 text-[var(--foreground-soft)]">
                Upload up to {PDF_STUDIO_MAX_IMAGES} images, arrange them, configure page settings, and generate a clean downloadable PDF — entirely in your browser.
              </p>
              <div className="mt-5 hidden flex-wrap gap-2 xl:flex">
                <Link href="/" className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] shadow-[0_10px_24px_rgba(34,34,34,0.04)] transition-colors hover:bg-[rgba(248,241,235,0.72)]">
                  Back to home
                </Link>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={isPending || images.length === 0}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-2.5 text-sm font-medium text-white shadow-[0_16px_30px_rgba(232,64,30,0.18)] transition-all hover:brightness-105 disabled:cursor-wait disabled:opacity-65"
                >
                  {isPending ? "Generating PDF…" : "Generate PDF"}
                </button>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-[var(--border-soft)] bg-[rgba(255,255,255,0.86)] p-4 shadow-[0_14px_30px_rgba(34,34,34,0.05)]">
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: "Formats", value: PDF_STUDIO_SUPPORTED_EXTENSIONS.join(" · ") },
                  { label: "Max images", value: `${PDF_STUDIO_MAX_IMAGES}` },
                  { label: "Output", value: "PDF" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[1.05rem] border border-[var(--border-soft)] bg-white/92 px-3 py-3"
                  >
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                      {stat.label}
                    </p>
                    <p className="mt-2 truncate text-sm font-medium text-[var(--foreground)]">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 xl:flex">
                <Link href="/" className="inline-flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--foreground)] shadow-[0_10px_24px_rgba(34,34,34,0.04)] transition-colors hover:bg-[rgba(248,241,235,0.72)]">
                  Back to home
                </Link>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={isPending || images.length === 0}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-2.5 text-sm font-medium text-white shadow-[0_16px_30px_rgba(232,64,30,0.18)] transition-all hover:brightness-105 disabled:cursor-wait disabled:opacity-65"
                >
                  {isPending ? "Generating…" : "Generate PDF"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {uploadError ? (
          <div className="rounded-[1.4rem] border border-[rgba(220,38,38,0.16)] bg-[rgba(220,38,38,0.06)] px-5 py-4 text-sm text-[var(--danger)] shadow-[var(--shadow-soft)]">
            {uploadError}
          </div>
        ) : null}

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

        <div className="grid gap-5 xl:grid-cols-[14rem_1fr] xl:items-start">
          <aside className="hidden xl:block">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-[1.85rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,241,235,0.94))] p-5 shadow-[0_18px_34px_rgba(34,34,34,0.06)]">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
                  Workspace map
                </p>
                <p className="mt-3 text-lg font-medium leading-tight text-[var(--foreground)]">
                  Upload, arrange, and convert.
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground-soft)]">
                  Add images, set your page preferences, check the preview, then generate your PDF.
                </p>
              </div>

              <nav className="rounded-[1.85rem] border border-[var(--border-strong)] bg-white/95 p-3 shadow-[var(--shadow-soft)]">
                <div className="space-y-2">
                  {workspaceSections.map((section, index) => (
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
              id="pdf-studio-upload"
              className={cn(
                "scroll-mt-28 rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(250,247,242,0.96),rgba(255,255,255,0.98))] p-4 shadow-[var(--shadow-soft)] md:p-5",
                mobileTab !== "upload" && "xl:block hidden xl:block",
              )}
            >
              <FormSection
                eyebrow="Upload"
                title="Add your images"
                description={`Drag and drop or click to browse. JPG, PNG, WEBP supported. Maximum ${PDF_STUDIO_MAX_IMAGES} images per session.`}
              >
                <ImageOrganizer
                  images={images}
                  onChange={handleImagesChange}
                  error={uploadError}
                />
              </FormSection>
            </section>

            <section
              id="pdf-studio-settings"
              className={cn(
                "scroll-mt-28 rounded-[2rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(250,247,242,0.96),rgba(255,255,255,0.98))] p-4 shadow-[var(--shadow-soft)] md:p-5",
                mobileTab !== "settings" && "xl:block hidden xl:block",
              )}
            >
              <FormSection
                eyebrow="Settings"
                title="Page configuration"
                description="Choose page size, orientation, how images fill the page, and margin spacing."
              >
                <PageSettingsPanel settings={settings} onChange={setSettings} />
              </FormSection>
            </section>

            <section
              id="pdf-studio-preview"
              className={cn(
                "scroll-mt-28 rounded-none border-0 bg-transparent p-0 shadow-none sm:rounded-[2.1rem] sm:border sm:border-[rgba(34,34,34,0.08)] sm:bg-[linear-gradient(180deg,rgba(247,241,235,0.82),rgba(255,255,255,0.98))] sm:p-4 sm:shadow-[var(--shadow-card)] md:p-5",
                mobileTab !== "preview" && "xl:block hidden xl:block",
              )}
            >
              <div className="mb-4 hidden rounded-[1.65rem] border border-[rgba(34,34,34,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,241,235,0.96))] p-4 shadow-[0_18px_32px_rgba(34,34,34,0.05)] sm:block">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(248,113,113,0.85)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(251,191,36,0.85)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(74,222,128,0.85)]" />
                  <div className="ml-3 rounded-full border border-[var(--border-soft)] px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                    Live preview
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.32em] text-[var(--muted-foreground)]">
                      Preview
                    </p>
                    <h2 className="mt-2 text-[1.4rem] font-medium leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                      Document preview
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                      Client-side
                    </span>
                    <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
                      Live updates
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                  Preview updates as you change images or settings. The final PDF will match this layout.
                </p>
              </div>

              <PdfPreview images={images} settings={settings} />
            </section>

            <section className="xl:hidden rounded-[1.8rem] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,241,235,0.98))] p-4 shadow-[var(--shadow-soft)] sm:rounded-[2rem] sm:p-5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
                Export
              </p>
              <h2 className="mt-3 text-[1.45rem] leading-tight tracking-[-0.04em] text-[var(--foreground)]">
                Generate your PDF
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--foreground-soft)]">
                All processing happens in your browser. No uploads. No servers.
              </p>
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={isPending || images.length === 0}
                  className="inline-flex w-full items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-medium text-white shadow-[0_16px_30px_rgba(232,64,30,0.18)] transition-all hover:brightness-105 disabled:cursor-wait disabled:opacity-65"
                >
                  {isPending ? "Generating PDF…" : "Generate PDF"}
                </button>
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-5 py-3 text-sm font-medium text-[var(--foreground)] shadow-[0_10px_24px_rgba(34,34,34,0.04)] transition-colors hover:bg-[rgba(248,241,235,0.72)]"
                >
                  Back to home
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

      <GenerationDialog
        state={actionState}
        progress={progress}
        onClose={handleDialogClose}
        onRetry={handleRetry}
      />
    </main>
  );
}
