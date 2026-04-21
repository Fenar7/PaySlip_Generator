"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { PDF_STUDIO_DEFAULT_SETTINGS } from "@/features/docs/pdf-studio/constants";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import {
  buildPdfStudioOutputName,
  getPdfStudioSourceBaseName,
} from "@/features/docs/pdf-studio/lib/output";
import type { ImageItem, PdfStudioFileClass } from "@/features/docs/pdf-studio/types";
import { analyzeSkew, deskewCanvas } from "@/features/docs/pdf-studio/utils/deskew";
import { generatePdfFromImages } from "@/features/docs/pdf-studio/utils/pdf-generator";
import {
  buildImageItemsFromScanPages,
  loadScanSourcePages,
} from "@/features/docs/pdf-studio/utils/scan-input";
import {
  applyScanCleanup,
  loadImageUrlToCanvas,
  type ScanCleanupPreset,
} from "@/features/docs/pdf-studio/utils/scan-cleanup";
import { downloadBlob, downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

type DeskewPreviewState = {
  beforeUrl: string;
  afterUrl: string;
  detectedAngle: number;
  requiresManualReview: boolean;
  reviewReason: string | null;
};

async function renderDeskewPreview(
  imageUrl: string,
  cleanupPreset: ScanCleanupPreset,
  monoThreshold: number,
  manualAngle: number,
): Promise<DeskewPreviewState> {
  const sourceCanvas = await loadImageUrlToCanvas(imageUrl);
  const cleanedCanvas = applyScanCleanup(sourceCanvas, cleanupPreset, monoThreshold);
  const analysis = analyzeSkew(cleanedCanvas);
  const finalAngle = manualAngle !== 0 ? manualAngle : analysis.angle;
  const afterCanvas =
    finalAngle === 0 ? cleanedCanvas : deskewCanvas(cleanedCanvas, finalAngle);

  return {
    beforeUrl: cleanedCanvas.toDataURL("image/png"),
    afterUrl: afterCanvas.toDataURL("image/png"),
    detectedAngle: analysis.angle,
    requiresManualReview: manualAngle === 0 && analysis.requiresManualReview,
    reviewReason: manualAngle === 0 ? analysis.reason : null,
  };
}

async function processDeskewedPage(
  imageUrl: string,
  cleanupPreset: ScanCleanupPreset,
  monoThreshold: number,
  manualAngle: number,
) {
  const sourceCanvas = await loadImageUrlToCanvas(imageUrl);
  const cleanedCanvas = applyScanCleanup(sourceCanvas, cleanupPreset, monoThreshold);
  const analysis = analyzeSkew(cleanedCanvas);
  const finalAngle = manualAngle !== 0 ? manualAngle : analysis.angle;
  const outputCanvas =
    finalAngle === 0 ? cleanedCanvas : deskewCanvas(cleanedCanvas, finalAngle);

  const blob = await new Promise<Blob | null>((resolve) => {
    outputCanvas.toBlob((value) => resolve(value), "image/png");
  });

  if (!blob) {
    throw new Error("Could not encode the corrected page.");
  }

  return {
    dataUrl: outputCanvas.toDataURL("image/png"),
    blob,
    analysis,
  };
}

export function DeskewWorkspace() {
  const analytics = usePdfStudioAnalytics("deskew");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [fileClass, setFileClass] = useState<PdfStudioFileClass | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [cleanupPreset, setCleanupPreset] = useState<ScanCleanupPreset>("none");
  const [monoThreshold, setMonoThreshold] = useState(128);
  const [manualAngles, setManualAngles] = useState<Map<number, number>>(new Map());
  const [preview, setPreview] = useState<DeskewPreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  const activeManualAngle = manualAngles.get(activePageIndex) ?? 0;

  const activeImage = images[activePageIndex] ?? null;
  const baseName = useMemo(
    () =>
      getPdfStudioSourceBaseName(
        sourceFile?.name ?? "deskewed-document",
        "deskewed-document",
      ),
    [sourceFile],
  );

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;

    const result = await loadScanSourcePages(file, "deskew");
    if (!result.ok) {
      setError(result.error);
      analytics.trackFail({ stage: "upload", reason: result.reason });
      return;
    }

    setSourceFile(file);
    setFileClass(result.fileClass);
    setImages(buildImageItemsFromScanPages(result.pages));
    setActivePageIndex(0);
    setCleanupPreset("none");
    setMonoThreshold(128);
    setManualAngles(new Map());
    setPreview(null);
    setError(null);
    setStatusMessage(
      result.fileClass === "pdf"
        ? `Loaded ${result.pages.length} page${result.pages.length === 1 ? "" : "s"} for deskew review.`
        : "Loaded image for deskew review.",
    );
    analytics.trackUpload({
      fileCount: 1,
      totalBytes: file.size,
      pageCount: result.pages.length,
      inputKind: result.fileClass,
    });
  }

  async function handleRefreshPreview() {
    if (!activeImage) {
      setError("Upload a scanned PDF or image before previewing deskew.");
      return;
    }

    setProcessing(true);
    setError(null);
    setStatusMessage("Analyzing the selected page…");

    try {
      const nextPreview = await renderDeskewPreview(
        activeImage.previewUrl,
        cleanupPreset,
        monoThreshold,
        activeManualAngle,
      );
      setPreview(nextPreview);
      setStatusMessage(
        nextPreview.requiresManualReview
          ? "Auto-detection was weak on this page. Review the preview or set a manual angle."
          : "Preview updated.",
      );
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Could not generate the deskew preview.",
      );
      analytics.trackFail({ stage: "render", reason: "weak-detection" });
    } finally {
      setProcessing(false);
    }
  }

  async function handleExport() {
    if (!sourceFile || images.length === 0) {
      setError("Upload a scanned PDF or image before exporting.");
      return;
    }

    setProcessing(true);
    setError(null);
    setStatusMessage("Preparing corrected output…");
    analytics.trackStart({
      action: "deskew",
      inputKind: fileClass,
      pageCount: images.length,
      cleanupPreset,
      manualAngle: activeManualAngle,
    });

    try {
      const processedPages = [];
      let reviewCount = 0;

      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        const pageAngle = manualAngles.get(index) ?? 0;
        const processed = await processDeskewedPage(
          image.previewUrl,
          cleanupPreset,
          monoThreshold,
          pageAngle,
        );
        if (pageAngle === 0 && processed.analysis.requiresManualReview) {
          reviewCount += 1;
        }
        processedPages.push({
          ...image,
          previewUrl: processed.dataUrl,
          rotation: 0 as const,
        });
      }

      if (fileClass === "image" && processedPages.length === 1) {
        const blob = await fetch(processedPages[0].previewUrl).then((response) =>
          response.blob(),
        );
        downloadBlob(
          blob,
          buildPdfStudioOutputName({
            toolId: "deskew",
            baseName,
            extension: "png",
          }),
        );
      } else {
        const pdfBytes = await generatePdfFromImages(processedPages, {
          ...PDF_STUDIO_DEFAULT_SETTINGS,
          filename: buildPdfStudioOutputName({
            toolId: "deskew",
            baseName,
            extension: "pdf",
          }),
        });
        downloadPdfBytes(
          pdfBytes,
          buildPdfStudioOutputName({
            toolId: "deskew",
            baseName,
            extension: "pdf",
          }),
        );
      }

      analytics.trackSuccess({
        action: "deskew",
        pageCount: images.length,
        cleanupPreset,
        manualReviewCount: reviewCount,
      });
      setStatusMessage(
        reviewCount > 0
          ? `Exported with ${reviewCount} page${reviewCount === 1 ? "" : "s"} left unchanged because auto-detection was weak.`
          : "Deskew export complete.",
      );
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Could not generate the corrected export.",
      );
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="pdf-studio-tool-header">
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">
          Deskew Scan
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#666]">
          Straighten skewed scans conservatively. Preview before and after,
          choose a cleanup preset, and keep weak auto-detections unchanged unless
          you set a manual correction.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,24rem)]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
            <PdfUploadZone
              onFiles={(files) => void handleFiles(files)}
              toolId="deskew"
              label="Drop a scanned PDF or image here"
              sublabel="PDF or image • 1 file • max 40MB • up to 30 pages"
            />

            {sourceFile ? (
              <div className="mt-4 rounded-xl border border-[#efefef] bg-[#fafafa] px-4 py-3">
                <p className="text-sm font-medium text-[#1a1a1a]">
                  {sourceFile.name}
                </p>
                <p className="text-xs text-[#666]">
                  {images.length} page{images.length === 1 ? "" : "s"} •{" "}
                  {fileClass === "pdf" ? "PDF export returns a rasterized corrected copy." : "Image export returns a corrected PNG."}
                </p>
              </div>
            ) : null}

            {images.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => {
                      setActivePageIndex(index);
                      setPreview(null);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      index === activePageIndex
                        ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                        : "border-[#e5e5e5] bg-white text-[#444]"
                    }`}
                  >
                    Page {index + 1}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-3">
                <label className="block rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#1a1a1a]">
                  <span className="block text-xs font-medium uppercase tracking-[0.15em] text-[#666]">
                    Cleanup preset
                  </span>
                  <select
                    className="mt-2 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm"
                    value={cleanupPreset}
                    onChange={(event) =>
                      setCleanupPreset(event.target.value as ScanCleanupPreset)
                    }
                  >
                    <option value="none">None</option>
                    <option value="contrast">Contrast normalize</option>
                    <option value="monochrome">Monochrome prep</option>
                  </select>
                </label>

                {cleanupPreset === "monochrome" ? (
                  <label className="block rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#1a1a1a]">
                    <span className="block text-xs font-medium uppercase tracking-[0.15em] text-[#666]">
                      Monochrome threshold
                    </span>
                    <select
                      className="mt-2 w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm"
                      value={monoThreshold}
                      onChange={(event) => setMonoThreshold(Number(event.target.value))}
                    >
                      <option value={100}>Light text (100)</option>
                      <option value={128}>Balanced (128)</option>
                      <option value={160}>Dark text (160)</option>
                    </select>
                  </label>
                ) : null}
              </div>

              <label className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-sm text-[#1a1a1a]">
                <span className="block text-xs font-medium uppercase tracking-[0.15em] text-[#666]">
                  Manual angle — page {activePageIndex + 1}
                </span>
                <input
                  className="mt-3 w-full accent-[var(--accent)]"
                  type="range"
                  min={-10}
                  max={10}
                  step={0.5}
                  value={activeManualAngle}
                  onChange={(event) =>
                    setManualAngles((prev) => {
                      const next = new Map(prev);
                      next.set(activePageIndex, Number(event.target.value));
                      return next;
                    })
                  }
                />
                <span className="mt-1 block text-xs text-[#666]">
                  {activeManualAngle > 0 ? "+" : ""}
                  {activeManualAngle.toFixed(1)}°
                  {images.length > 1 ? ` · page ${activePageIndex + 1} only` : ""}
                </span>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleRefreshPreview()}
                disabled={!activeImage || processing}
              >
                {processing ? "Working…" : "Refresh preview"}
              </Button>
              <Button
                type="button"
                onClick={() => void handleExport()}
                disabled={!activeImage || processing}
              >
                {processing ? "Exporting…" : "Download corrected output"}
              </Button>
            </div>

            {statusMessage ? (
              <p className="mt-4 text-sm text-[#666]">{statusMessage}</p>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#1a1a1a]">
              Before / after preview
            </h2>
            {preview ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-[#666]">
                    Before
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.beforeUrl}
                    alt="Before deskew"
                    className="rounded-xl border border-[#e5e5e5] bg-[#fafafa]"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-[#666]">
                    After
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.afterUrl}
                    alt="After deskew"
                    className="rounded-xl border border-[#e5e5e5] bg-[#fafafa]"
                  />
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#666]">
                Load a file and refresh the preview to compare the selected page.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#1a1a1a]">
              Auto-detection guidance
            </h2>
            <p className="mt-3 text-sm text-[#666]">
              {preview
                ? preview.requiresManualReview
                  ? preview.reviewReason
                  : `Detected angle: ${preview.detectedAngle > 0 ? "+" : ""}${preview.detectedAngle.toFixed(1)}°.`
                : "Weak detections are left unchanged by default so readable pages do not get over-corrected."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
