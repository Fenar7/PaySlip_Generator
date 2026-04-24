"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useActiveOrg } from "@/hooks/use-active-org";
import { usePlan } from "@/hooks/use-plan";
import { PDF_STUDIO_DEFAULT_SETTINGS } from "@/features/docs/pdf-studio/constants";
import { PdfStudioUpgradeNotice } from "@/features/docs/pdf-studio/components/pdf-studio-upgrade-notice";
import { OcrEnhancementPanel } from "@/features/docs/pdf-studio/components/ocr-enhancement-panel";
import { OcrProgressPanel } from "@/features/docs/pdf-studio/components/ocr-progress-panel";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import {
  PDF_STUDIO_STARTER_OCR_PAGE_LIMIT,
  getPdfStudioToolUpgradeCopy,
} from "@/features/docs/pdf-studio/lib/plan-gates";
import {
  buildPdfStudioOutputName,
  getPdfStudioSourceBaseName,
} from "@/features/docs/pdf-studio/lib/output";
import type {
  ImageItem,
  PdfStudioFileClass,
  PdfStudioOcrMode,
} from "@/features/docs/pdf-studio/types";
import { generatePdfFromImages } from "@/features/docs/pdf-studio/utils/pdf-generator";
import {
  cancelAllOcr,
  getOcrServiceStatus,
  processImageForOcrDetailed,
} from "@/features/docs/pdf-studio/utils/ocr-processor";
import {
  buildImageItemsFromScanPages,
  dataUrlToBlob,
  loadScanSourcePages,
} from "@/features/docs/pdf-studio/utils/scan-input";
import { downloadBlob, downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import {
  clearOcrWorkspaceSession,
  loadOcrWorkspaceSession,
  saveOcrWorkspaceSession,
} from "@/features/docs/pdf-studio/utils/session-storage";

type OcrScope = "all" | "remaining" | "failed";

type OcrSummary = {
  completeCount: number;
  failedCount: number;
  lowConfidenceCount: number;
  averageConfidence: number | null;
};

function buildCombinedText(images: ImageItem[]) {
  return images
    .filter((image) => image.ocrText)
    .map((image, index) => `Page ${index + 1}\n${image.ocrText}`)
    .join("\n\n---\n\n")
    .trim();
}

function isEligibleForOcr(image: ImageItem, scope: OcrScope): boolean {
  if (scope === "all") return true;
  if (scope === "remaining") return image.ocrStatus !== "complete";
  if (scope === "failed") {
    return image.ocrStatus === "error" || image.ocrStatus === "cancelled";
  }
  return true;
}

export function OcrWorkspace() {
  const analytics = usePdfStudioAnalytics("ocr");
  const { activeOrg, isLoading: isOrgLoading } = useActiveOrg();
  const { plan } = usePlan(activeOrg?.id);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileClass, setFileClass] = useState<PdfStudioFileClass | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [language, setLanguage] = useState("eng");
  const [mode, setMode] = useState<PdfStudioOcrMode>("accurate");
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [ocrScope, setOcrScope] = useState<OcrScope>("all");
  const [sessionStatus, setSessionStatus] = useState<string | undefined>(undefined);
  const [saveStatus, setSaveStatus] = useState<string | undefined>(undefined);
  const [hasHydratedSession, setHasHydratedSession] = useState(false);
  const cancelRequestedRef = useRef(false);

  const orgScope = activeOrg?.id || "anonymous";

  const summary = useMemo<OcrSummary>(() => {
    const complete = images.filter((image) => image.ocrStatus === "complete");
    const failed = images.filter((image) => image.ocrStatus === "error");
    const lowConfidence = complete.filter(
      (image) =>
        typeof image.ocrConfidence === "number" &&
        image.ocrConfidence < confidenceThreshold,
    );
    const totalConfidence = complete.reduce(
      (sum, image) => sum + (image.ocrConfidence ?? 0),
      0,
    );

    return {
      completeCount: complete.length,
      failedCount: failed.length,
      lowConfidenceCount: lowConfidence.length,
      averageConfidence:
        complete.length > 0 ? totalConfidence / complete.length : null,
    };
  }, [confidenceThreshold, images]);

  const resultCards = useMemo(
    () =>
      images
        .filter((image) => image.ocrStatus === "complete" && image.ocrText)
        .map((image) => ({
          imageId: image.id,
          imageName: image.name,
          text: image.ocrText ?? "",
          confidence: image.ocrConfidence ?? 0,
        })),
    [images],
  );

  const combinedText = useMemo(() => buildCombinedText(images), [images]);
  const baseName = useMemo(
    () =>
      getPdfStudioSourceBaseName(
        sourceFile?.name ?? "ocr-document",
        "ocr-document",
      ),
    [sourceFile],
  );
  const canExport = resultCards.length > 0;
  const largeFileRequiresPro =
    images.length > PDF_STUDIO_STARTER_OCR_PAGE_LIMIT &&
    (!plan || (plan.planId !== "pro" && plan.planId !== "enterprise"));

  // ── Session hydration ──────────────────────────────────────────────
  useEffect(() => {
    if (isOrgLoading) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const session = loadOcrWorkspaceSession(orgScope);

      if (session && session.images.length > 0) {
        setImages(session.images);
        if (session.language) setLanguage(session.language);
        if (session.mode) setMode(session.mode);
        if (typeof session.confidenceThreshold === "number") {
          setConfidenceThreshold(session.confidenceThreshold);
        }

        const completeCount =
          session.restoreCounts?.completeCount ??
          session.images.filter((img) => img.ocrStatus === "complete" && img.ocrText).length;
        const rerunRequiredCount = session.restoreCounts?.rerunRequiredCount ?? 0;

        if (completeCount > 0 && rerunRequiredCount > 0) {
          setSessionStatus(
            `${completeCount} page${completeCount !== 1 ? "s" : ""} ha${completeCount === 1 ? "s" : "ve"} restored OCR text. ${rerunRequiredCount} page${rerunRequiredCount !== 1 ? "s" : ""} need${rerunRequiredCount === 1 ? "s" : ""} the source file re-uploaded before OCR can run again.`,
          );
        } else if (completeCount > 0) {
          setSessionStatus(
            `OCR text restored for all ${completeCount} page${completeCount !== 1 ? "s" : ""}. Re-upload the source file to modify results.`,
          );
        } else if (rerunRequiredCount > 0) {
          setSessionStatus(
            `${rerunRequiredCount} page${rerunRequiredCount !== 1 ? "s" : ""} still need${rerunRequiredCount === 1 ? "s" : ""} OCR. Re-upload the source file to continue.`,
          );
        }
      }

      setHasHydratedSession(true);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [orgScope, isOrgLoading]);

  // ── Session auto-save ──────────────────────────────────────────────
  useEffect(() => {
    if (!hasHydratedSession) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const didSave = saveOcrWorkspaceSession(images, language, mode, confidenceThreshold, orgScope);
      setSaveStatus(didSave ? "Session saved automatically." : "Could not save this session locally.");
    }, 600);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasHydratedSession, images, language, mode, confidenceThreshold, orgScope]);

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) {
      return;
    }

    const result = await loadScanSourcePages(file, "ocr");
    if (!result.ok) {
      setError(result.error);
      analytics.trackFail({ stage: "upload", reason: result.reason });
      return;
    }

    cancelRequestedRef.current = false;
    setSourceFile(file);
    setFileClass(result.fileClass);
    setImages(buildImageItemsFromScanPages(result.pages));
    setError(null);
    clearOcrWorkspaceSession(orgScope);
    setSessionStatus(undefined);
    setSaveStatus(undefined);
    setStatusMessage(
      result.fileClass === "pdf"
        ? `Loaded ${result.pages.length} page${result.pages.length === 1 ? "" : "s"} for OCR.`
        : "Loaded image for OCR.",
    );
    analytics.trackUpload({
      fileCount: 1,
      totalBytes: file.size,
      pageCount: result.pages.length,
      inputKind: result.fileClass,
    });
  }

  async function handleRunOcr() {
    if (!sourceFile || images.length === 0) {
      setError("Upload a scanned PDF or image before starting OCR.");
      return;
    }
    if (largeFileRequiresPro) {
      setError(
        `This upload has ${images.length} pages. Starter covers OCR up to ${PDF_STUDIO_STARTER_OCR_PAGE_LIMIT} pages per run. Upgrade to Pro for larger scans.`,
      );
      return;
    }

    cancelRequestedRef.current = false;
    setRunning(true);
    setError(null);
    setStatusMessage("");

    // Determine which images to process based on scope
    const eligibleIds = new Set(
      images.filter((img) => isEligibleForOcr(img, ocrScope)).map((img) => img.id),
    );

    if (eligibleIds.size === 0) {
      setRunning(false);
      setStatusMessage("No pages match the selected OCR scope.");
      return;
    }

    // Only reset eligible images; preserve completed pages outside the scope
    setImages((current) =>
      current.map((image) =>
        eligibleIds.has(image.id)
          ? {
              ...image,
              ocrStatus: "pending",
              ocrText: undefined,
              ocrConfidence: undefined,
              ocrErrorMessage: undefined,
            }
          : image,
      ),
    );

    analytics.trackStart({
      action: "ocr",
      inputKind: fileClass,
      pageCount: images.length,
      eligibleCount: eligibleIds.size,
      scope: ocrScope,
      language,
      mode,
    });

    let completedCount = 0;
    let failedCount = 0;

    try {
      const snapshot = [...images];
      for (let index = 0; index < snapshot.length; index += 1) {
        if (cancelRequestedRef.current) {
          break;
        }

        const image = snapshot[index];
        if (!eligibleIds.has(image.id)) {
          continue;
        }

        setStatusMessage(`Running OCR on page ${index + 1} of ${snapshot.length}…`);
        setImages((current) =>
          current.map((item) =>
            item.id === image.id
              ? { ...item, ocrStatus: "processing", ocrErrorMessage: undefined }
              : item,
          ),
        );

        try {
          const blob = dataUrlToBlob(image.previewUrl);
          const result = await processImageForOcrDetailed(blob, {
            dedupeKey: image.id,
            language,
            mode,
          });
          completedCount += 1;
          setImages((current) =>
            current.map((item) =>
              item.id === image.id
                ? {
                    ...item,
                    ocrStatus: "complete",
                    ocrText: result.text,
                    ocrConfidence: result.confidence,
                  }
                : item,
            ),
          );
        } catch (ocrError) {
          failedCount += 1;
          const message =
            ocrError instanceof Error
              ? ocrError.message
              : "OCR failed for this page.";
          setImages((current) =>
            current.map((item) =>
              item.id === image.id
                ? {
                    ...item,
                    ocrStatus: cancelRequestedRef.current ? "cancelled" : "error",
                    ocrErrorMessage: message,
                  }
                : item,
            ),
          );
        }
      }

      if (cancelRequestedRef.current) {
        setStatusMessage("OCR cancelled. Completed pages remain available.");
        return;
      }

      if (completedCount === 0) {
        const reason =
          getOcrServiceStatus() === "unavailable"
            ? "ocr-unavailable"
            : "no-text-detected";
        setError(
          getOcrServiceStatus() === "unavailable"
            ? "OCR could not start in this browser session. Refresh and try again."
            : "OCR did not find usable text in this upload. Try a clearer scan or a different language.",
        );
        analytics.trackFail({ stage: "process", reason });
        return;
      }

      analytics.trackSuccess({
        action: "ocr",
        pageCount: snapshot.length,
        eligibleCount: eligibleIds.size,
        completeCount: completedCount,
        failedCount,
      });
      setStatusMessage(
        failedCount > 0
          ? `OCR finished with ${failedCount} page${failedCount === 1 ? "" : "s"} needing manual review.`
          : "OCR complete. Review the extracted text and export the result.",
      );
    } finally {
      setRunning(false);
    }
  }

  async function handleCancel() {
    cancelRequestedRef.current = true;
    await cancelAllOcr();
    setImages((current) =>
      current.map((image) =>
        image.ocrStatus === "pending" || image.ocrStatus === "processing"
          ? { ...image, ocrStatus: "cancelled" }
          : image,
      ),
    );
  }

  function handleRetry(imageId: string) {
    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    setImages((current) =>
      current.map((img) =>
        img.id === imageId
          ? {
              ...img,
              ocrStatus: "pending",
              ocrText: undefined,
              ocrConfidence: undefined,
              ocrErrorMessage: undefined,
            }
          : img,
      ),
    );

    void (async () => {
      try {
        const blob = dataUrlToBlob(image.previewUrl);
        const result = await processImageForOcrDetailed(blob, {
          dedupeKey: image.id,
          language,
          mode,
        });
        setImages((current) =>
          current.map((img) =>
            img.id === imageId
              ? {
                  ...img,
                  ocrStatus: "complete",
                  ocrText: result.text,
                  ocrConfidence: result.confidence,
                }
              : img,
          ),
        );
      } catch (ocrError) {
        const message =
          ocrError instanceof Error
            ? ocrError.message
            : "OCR failed for this page.";
        setImages((current) =>
          current.map((img) =>
            img.id === imageId
              ? { ...img, ocrStatus: "error", ocrErrorMessage: message }
              : img,
          ),
        );
      }
    })();
  }

  function handleRetryAll() {
    const retryable = images.filter(
      (img) =>
        (img.ocrStatus === "error" ||
          img.ocrStatus === "cancelled" ||
          (img.ocrStatus === "complete" &&
            typeof img.ocrConfidence === "number" &&
            img.ocrConfidence < confidenceThreshold)) &&
        img.previewUrl,
    );

    if (retryable.length === 0) return;

    setImages((current) =>
      current.map((img) =>
        retryable.some((r) => r.id === img.id)
          ? {
              ...img,
              ocrStatus: "pending",
              ocrText: undefined,
              ocrConfidence: undefined,
              ocrErrorMessage: undefined,
            }
          : img,
      ),
    );

    retryable.forEach((image) => {
      void (async () => {
        try {
          const blob = dataUrlToBlob(image.previewUrl);
          const result = await processImageForOcrDetailed(blob, {
            dedupeKey: image.id,
            language,
            mode,
          });
          setImages((current) =>
            current.map((img) =>
              img.id === image.id
                ? {
                    ...img,
                    ocrStatus: "complete",
                    ocrText: result.text,
                    ocrConfidence: result.confidence,
                  }
                : img,
            ),
          );
        } catch (ocrError) {
          const message =
            ocrError instanceof Error
              ? ocrError.message
              : "OCR failed for this page.";
          setImages((current) =>
            current.map((img) =>
              img.id === image.id
                ? { ...img, ocrStatus: "error", ocrErrorMessage: message }
                : img,
            ),
          );
        }
      })();
    });
  }

  async function handleDownloadText() {
    if (!combinedText) {
      return;
    }

    downloadBlob(
      new Blob([combinedText], { type: "text/plain;charset=utf-8" }),
      buildPdfStudioOutputName({
        toolId: "ocr",
        baseName,
        variant: "text",
        extension: "txt",
      }),
    );
  }

  async function handleDownloadSearchablePdf() {
    if (!canExport) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const pdfBytes = await generatePdfFromImages(
        images.map((image) => ({
          ...image,
          ocrStatus: undefined,
        })),
        {
          ...PDF_STUDIO_DEFAULT_SETTINGS,
          filename: buildPdfStudioOutputName({
            toolId: "ocr",
            baseName,
            variant: "searchable",
            extension: "pdf",
          }),
          enableOcr: true,
        },
      );
      downloadPdfBytes(
        pdfBytes,
        buildPdfStudioOutputName({
          toolId: "ocr",
          baseName,
          variant: "searchable",
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({
        action: "download-searchable-pdf",
        outputKind: "pdf",
      });
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not generate the searchable PDF.",
      );
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setIsExportingPdf(false);
    }
  }

  const lowConfidenceState =
    summary.lowConfidenceCount > 0
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-800";

  const pageLimitLabel =
    plan?.planId === "pro" || plan?.planId === "enterprise"
      ? "no page limit"
      : `up to ${PDF_STUDIO_STARTER_OCR_PAGE_LIMIT} pages`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      {largeFileRequiresPro ? (
        <PdfStudioUpgradeNotice
          toolId="ocr"
          surface={analytics.surface}
          requiredPlan="pro"
          title="Large OCR runs need Pro"
          description={getPdfStudioToolUpgradeCopy("ocr")}
          ctaLabel="Upgrade to Pro"
          ctaHref="/pricing"
        />
      ) : null}

      <div className="pdf-studio-tool-header">
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">
          OCR PDF &amp; Images
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#666]">
          Extract text from scans entirely in your browser. Review page-level
          confidence, copy or download the text, and export a searchable PDF
          copy with an invisible OCR text layer.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,24rem)]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
            <PdfUploadZone
              onFiles={(files) => void handleFiles(files)}
              toolId="ocr"
              label="Drop a scanned PDF or image here"
              sublabel={`PDF or image • 1 file • max 40MB • ${pageLimitLabel} on this lane`}
            />

            {sourceFile ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efefef] bg-[#fafafa] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#1a1a1a]">
                      {sourceFile.name}
                    </p>
                    <p className="text-xs text-[#666]">
                      {images.length} page{images.length === 1 ? "" : "s"} •{" "}
                      {fileClass === "pdf" ? "PDF source" : "image source"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-sm"
                      value={ocrScope}
                      onChange={(e) => setOcrScope(e.target.value as OcrScope)}
                      disabled={running}
                      aria-label="OCR run scope"
                    >
                      <option value="all">Run on all pages</option>
                      <option value="remaining">Run on remaining / failed</option>
                      <option value="failed">Run on failed only</option>
                    </select>
                    <Button
                      onClick={() => void handleRunOcr()}
                      disabled={running || largeFileRequiresPro}
                    >
                      {running ? "Running OCR…" : "Start OCR"}
                    </Button>
                  </div>
                </div>
                {ocrScope !== "all" && (
                  <p className="text-xs text-[#666]">
                    {ocrScope === "remaining"
                      ? "Already-completed pages will be skipped."
                      : "Only failed or cancelled pages will be processed."}
                  </p>
                )}
              </div>
            ) : null}

            {statusMessage ? (
              <p className="mt-4 text-sm text-[#666]">{statusMessage}</p>
            ) : null}
            {sessionStatus ? (
              <p className="mt-4 rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-sm text-[#666]">{sessionStatus}</p>
            ) : null}
            {saveStatus ? (
              <p className="mt-4 text-xs text-[#777]">{saveStatus}</p>
            ) : null}
            {!largeFileRequiresPro &&
            images.length > 0 &&
            images.length > PDF_STUDIO_STARTER_OCR_PAGE_LIMIT - 2 ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Starter covers OCR up to {PDF_STUDIO_STARTER_OCR_PAGE_LIMIT} pages per run. Larger scanned files move to the Pro lane.
              </div>
            ) : null}

            <div className="mt-4">
              <OcrProgressPanel
                images={images}
                isOcrUnavailable={getOcrServiceStatus() === "unavailable"}
                language={language}
                lowConfidenceThreshold={confidenceThreshold}
                onRetry={handleRetry}
                onRetryAll={handleRetryAll}
                onCancelOcr={() => void handleCancel()}
              />
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {canExport ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={`rounded-xl border px-4 py-3 text-left text-sm ${lowConfidenceState}`}
                >
                  <p className="font-semibold">
                    {summary.averageConfidence !== null
                      ? `${Math.round(summary.averageConfidence)}% avg confidence`
                      : "No confidence yet"}
                  </p>
                  <p className="mt-1 text-xs">
                    Threshold: {confidenceThreshold}% •{" "}
                    {summary.lowConfidenceCount} page
                    {summary.lowConfidenceCount === 1 ? "" : "s"} below threshold
                  </p>
                </button>
                <label className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#1a1a1a]">
                  <span className="block text-xs font-medium uppercase tracking-[0.15em] text-[#666]">
                    Review threshold
                  </span>
                  <select
                    className="mt-2 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm"
                    value={confidenceThreshold}
                    onChange={(event) =>
                      setConfidenceThreshold(Number(event.target.value))
                    }
                  >
                    <option value={60}>60%</option>
                    <option value={70}>70%</option>
                    <option value={80}>80%</option>
                    <option value={90}>90%</option>
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          {canExport ? (
            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#1a1a1a]">
                    Export OCR output
                  </h2>
                  <p className="text-sm text-[#666]">
                    {fileClass === "pdf"
                      ? "Searchable PDF export creates a rasterized copy from rendered pages so the OCR text layer stays valid and portable."
                      : "Searchable PDF export keeps the original image page and adds an invisible OCR text layer."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleDownloadText()}
                  >
                    Download TXT
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleDownloadSearchablePdf()}
                    disabled={isExportingPdf}
                  >
                    {isExportingPdf
                      ? "Generating PDF…"
                      : "Download rasterized searchable copy"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <OcrEnhancementPanel
            language={language}
            onLanguageChange={setLanguage}
            mode={mode}
            onModeChange={setMode}
            results={resultCards}
            isProcessing={running}
            exportFilename={buildPdfStudioOutputName({
              toolId: "ocr",
              baseName,
              variant: "text",
              extension: "txt",
            })}
          />

          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#1a1a1a]">
              What this export guarantees
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#666]">
              <li>OCR runs locally in your browser for this phase of PDF Studio.</li>
              <li>
                Confidence is page-level guidance, not a promise that every word
                is correct.
              </li>
              <li>
                Low-confidence pages should be reviewed before you reuse the
                extracted text.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
