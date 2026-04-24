"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import { PdfPagePreviewPanel } from "@/features/docs/pdf-studio/components/shared/pdf-page-preview-panel";
import { WatermarkPreviewOverlay } from "@/features/docs/pdf-studio/components/watermark/watermark-preview-overlay";
import { applyWatermarkToPdf } from "@/features/docs/pdf-studio/utils/pdf-watermark-writer";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import { WATERMARK_TEXT_PRESETS } from "@/features/docs/pdf-studio/constants";
import type { WatermarkPresetId, WatermarkSettings, WatermarkPosition } from "@/features/docs/pdf-studio/types";
import { cn } from "@/lib/utils";

const DEFAULT_PRESET = WATERMARK_TEXT_PRESETS.confidential;

function createPresetWatermark(presetId: WatermarkPresetId): WatermarkSettings {
  const preset = WATERMARK_TEXT_PRESETS[presetId];
  return {
    enabled: true,
    type: "text",
    text: {
      content: preset.text,
      color: preset.color,
      opacity: preset.opacity,
      fontSize: preset.fontSize,
    },
    image: {
      scale: 35,
      opacity: 25,
    },
    position: "center",
    rotation: preset.rotation,
    scope: "all",
  };
}

const POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: "top-left", label: "TL" },
  { value: "top-center", label: "TC" },
  { value: "top-right", label: "TR" },
  { value: "center-left", label: "CL" },
  { value: "center", label: "CC" },
  { value: "center-right", label: "CR" },
  { value: "bottom-left", label: "BL" },
  { value: "bottom-center", label: "BC" },
  { value: "bottom-right", label: "BR" },
];

export function WatermarkWorkspace() {
  const analytics = usePdfStudioAnalytics("watermark");
  const upload = useSinglePdfUpload("watermark", analytics);
  const [watermark, setWatermark] = useState<WatermarkSettings>(
    createPresetWatermark(DEFAULT_PRESET.id),
  );
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [currentPage, setCurrentPage] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  const presetButtons = useMemo(() => Object.values(WATERMARK_TEXT_PRESETS), []);

  const handleApply = useCallback(async () => {
    if (!upload.file || !upload.pdfBytes) {
      upload.setError("Upload a PDF before adding a watermark.");
      return;
    }

    setStatus("processing");
    upload.setError(null);
    analytics.trackStart({ watermarkType: watermark.type });

    try {
      const nextBytes = await applyWatermarkToPdf(upload.pdfBytes, watermark);
      downloadPdfBytes(
        nextBytes,
        buildPdfStudioOutputName({
          toolId: "watermark",
          baseName: upload.file.name.replace(/\.pdf$/i, ""),
          extension: "pdf",
        }),
      );
      setStatus("done");
      analytics.trackSuccess({ watermarkType: watermark.type });
    } catch {
      upload.setError("Watermarking failed. Try a simpler PDF or switch to a text watermark.");
      setStatus("error");
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    }
  }, [analytics, upload, watermark]);

  const handleReset = useCallback(() => {
    setWatermark(createPresetWatermark(DEFAULT_PRESET.id));
    setStatus("idle");
    upload.setError(null);
  }, [upload]);

  const updateWatermark = useCallback(
    (patch: Partial<WatermarkSettings> | ((prev: WatermarkSettings) => WatermarkSettings)) => {
      setWatermark((prev) => {
        const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        // Auto-enable when user changes meaningful settings
        if (!next.enabled && next.type !== "none") {
          return { ...next, enabled: true };
        }
        return next;
      });
      if (status === "done" || status === "error") {
        setStatus("idle");
      }
    },
    [status],
  );

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const imageFile = event.target.files?.[0];
      if (!imageFile) return;

      const previewUrl = URL.createObjectURL(imageFile);
      updateWatermark((current) => ({
        ...current,
        type: "image",
        enabled: true,
        image: {
          file: imageFile,
          previewUrl,
          scale: current.image?.scale ?? 35,
          opacity: current.image?.opacity ?? 25,
        },
      }));
      event.target.value = "";
    },
    [updateWatermark],
  );

  const handleRemoveImage = useCallback(() => {
    updateWatermark((current) => ({
      ...current,
      type: "text",
      image: { scale: 35, opacity: 25 },
    }));
  }, [updateWatermark]);

  // Measure preview container for watermark overlay sizing
  const handlePreviewRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    previewContainerRef.current = node;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setPreviewSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
  }, []);

  const previewOverlay = useMemo(() => {
    if (!upload.pages.length || previewSize.width === 0) return null;
    return (
      <WatermarkPreviewOverlay
        watermark={watermark}
        containerWidth={previewSize.width}
        containerHeight={previewSize.height}
      />
    );
  }, [upload.pages.length, previewSize.width, previewSize.height, watermark]);

  const canApply = upload.file && upload.pdfBytes && status !== "processing";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">Add Watermark</h1>
        <p className="mt-2 text-sm text-[#666]">
          Add text or image watermarks to an existing PDF with preset labels like Draft,
          Confidential, Paid, and Copy.
        </p>
      </div>

      {!upload.file ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e5] bg-white px-6 py-14 text-center transition-colors hover:border-[#999]">
          <span className="text-sm font-medium text-[#1a1a1a]">Upload a PDF to watermark</span>
          <span className="mt-1 text-xs text-[#666]">One PDF per run, up to 200 pages</span>
          <input
            className="hidden"
            type="file"
            accept="application/pdf"
            onChange={(event) => void upload.onFileSelect(event.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Controls Panel */}
          <div className="space-y-5 rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-[#f5f5f5] px-4 py-3 text-sm text-[#1a1a1a]">
              <span className="font-medium">{upload.file.name}</span>
              <span className="ml-2 text-[#666]">{upload.pages.length} pages</span>
            </div>

            {/* Presets */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#666]">
                Presets
              </p>
              <div className="flex flex-wrap gap-2">
                {presetButtons.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="rounded-full border border-[#d4d4d4] px-3 py-1.5 text-xs font-medium text-[#1a1a1a] transition-colors hover:bg-[#f9f9f9]"
                    onClick={() => setWatermark(createPresetWatermark(preset.id))}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode & Scope */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-[#1a1a1a]">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                  Mode
                </span>
                <select
                  className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm"
                  value={watermark.type}
                  onChange={(event) =>
                    updateWatermark({
                      type: event.target.value as WatermarkSettings["type"],
                    })
                  }
                >
                  <option value="text">Text watermark</option>
                  <option value="image">Image watermark</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-[#1a1a1a]">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                  Scope
                </span>
                <select
                  className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm"
                  value={watermark.scope}
                  onChange={(event) =>
                    updateWatermark({
                      scope: event.target.value as WatermarkSettings["scope"],
                    })
                  }
                >
                  <option value="all">All pages</option>
                  <option value="first">First page only</option>
                </select>
              </label>
            </div>

            {/* Position Grid */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#666]">
                Position
              </p>
              <div className="grid grid-cols-3 gap-2 max-w-[200px]">
                {POSITIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateWatermark({ position: value })}
                    className={cn(
                      "aspect-square rounded-lg border px-2 py-1 text-xs font-medium transition-colors",
                      watermark.position === value
                        ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                        : "border-[#e5e5e5] bg-white text-[#666] hover:border-[#999]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Controls */}
            {watermark.type === "text" && (
              <div className="space-y-4">
                <label className="space-y-1 text-sm text-[#1a1a1a]">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                    Watermark text
                  </span>
                  <input
                    className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm"
                    value={watermark.text?.content ?? ""}
                    maxLength={120}
                    onChange={(event) =>
                      updateWatermark((current) => ({
                        ...current,
                        text: {
                          content: event.target.value,
                          color: current.text?.color ?? DEFAULT_PRESET.color,
                          opacity: current.text?.opacity ?? DEFAULT_PRESET.opacity,
                          fontSize: current.text?.fontSize ?? DEFAULT_PRESET.fontSize,
                        },
                      }))
                    }
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-[#1a1a1a]">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                      Font size
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        className="w-full"
                        type="range"
                        min={12}
                        max={72}
                        value={watermark.text?.fontSize ?? DEFAULT_PRESET.fontSize}
                        onChange={(event) =>
                          updateWatermark((current) => ({
                            ...current,
                            text: {
                              content: current.text?.content ?? DEFAULT_PRESET.text,
                              color: current.text?.color ?? DEFAULT_PRESET.color,
                              opacity: current.text?.opacity ?? DEFAULT_PRESET.opacity,
                              fontSize: Number(event.target.value),
                            },
                          }))
                        }
                      />
                      <span className="w-8 text-right text-xs text-[#666]">
                        {watermark.text?.fontSize ?? DEFAULT_PRESET.fontSize}px
                      </span>
                    </div>
                  </label>

                  <label className="space-y-1 text-sm text-[#1a1a1a]">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                      Opacity
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        className="w-full"
                        type="range"
                        min={5}
                        max={100}
                        value={watermark.text?.opacity ?? DEFAULT_PRESET.opacity}
                        onChange={(event) =>
                          updateWatermark((current) => ({
                            ...current,
                            text: {
                              content: current.text?.content ?? DEFAULT_PRESET.text,
                              color: current.text?.color ?? DEFAULT_PRESET.color,
                              opacity: Number(event.target.value),
                              fontSize: current.text?.fontSize ?? DEFAULT_PRESET.fontSize,
                            },
                          }))
                        }
                      />
                      <span className="w-8 text-right text-xs text-[#666]">
                        {watermark.text?.opacity ?? DEFAULT_PRESET.opacity}%
                      </span>
                    </div>
                  </label>
                </div>

                <label className="space-y-1 text-sm text-[#1a1a1a]">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                    Color
                  </span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={watermark.text?.color ?? DEFAULT_PRESET.color}
                      onChange={(event) =>
                        updateWatermark((current) => ({
                          ...current,
                          text: {
                            content: current.text?.content ?? DEFAULT_PRESET.text,
                            color: event.target.value,
                            opacity: current.text?.opacity ?? DEFAULT_PRESET.opacity,
                            fontSize: current.text?.fontSize ?? DEFAULT_PRESET.fontSize,
                          },
                        }))
                      }
                      className="h-10 w-14 cursor-pointer rounded-lg border border-[#e5e5e5] bg-white p-1"
                    />
                    <span className="text-xs text-[#666]">
                      {(watermark.text?.color ?? DEFAULT_PRESET.color).toUpperCase()}
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Image Controls */}
            {watermark.type === "image" && (
              <div className="space-y-4">
                <input
                  ref={imageInputRef}
                  className="hidden"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                />

                {!watermark.image?.previewUrl ? (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e5e5e5] bg-white px-4 py-6 text-center transition-colors hover:border-[#999]"
                  >
                    <span className="text-sm font-medium text-[#1a1a1a]">Upload watermark image</span>
                    <span className="mt-1 text-xs text-[#666]">PNG, JPG, or WebP</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3 py-2">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={watermark.image.previewUrl}
                        alt="Watermark preview"
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                      <span className="text-sm text-[#1a1a1a]">Watermark image</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs text-[#666] hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm text-[#1a1a1a]">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                      Scale
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        className="w-full"
                        type="range"
                        min={10}
                        max={100}
                        value={watermark.image?.scale ?? 35}
                        onChange={(event) =>
                          updateWatermark((current) => ({
                            ...current,
                            image: {
                              file: current.image?.file,
                              previewUrl: current.image?.previewUrl,
                              scale: Number(event.target.value),
                              opacity: current.image?.opacity ?? 25,
                            },
                          }))
                        }
                      />
                      <span className="w-8 text-right text-xs text-[#666]">
                        {watermark.image?.scale ?? 35}%
                      </span>
                    </div>
                  </label>

                  <label className="space-y-1 text-sm text-[#1a1a1a]">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                      Opacity
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        className="w-full"
                        type="range"
                        min={5}
                        max={100}
                        value={watermark.image?.opacity ?? 25}
                        onChange={(event) =>
                          updateWatermark((current) => ({
                            ...current,
                            image: {
                              file: current.image?.file,
                              previewUrl: current.image?.previewUrl,
                              scale: current.image?.scale ?? 35,
                              opacity: Number(event.target.value),
                            },
                          }))
                        }
                      />
                      <span className="w-8 text-right text-xs text-[#666]">
                        {watermark.image?.opacity ?? 25}%
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Rotation */}
            <label className="space-y-1 text-sm text-[#1a1a1a]">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                Rotation
              </span>
              <div className="flex items-center gap-2">
                <input
                  className="w-full"
                  type="range"
                  min={0}
                  max={360}
                  value={watermark.rotation}
                  onChange={(event) =>
                    updateWatermark({ rotation: Number(event.target.value) })
                  }
                />
                <span className="w-10 text-right text-xs text-[#666]">{watermark.rotation}°</span>
              </div>
            </label>

            {/* Status Messages */}
            {upload.error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {upload.error}
              </div>
            )}

            {status === "done" && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Watermark applied and downloaded successfully.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => void handleApply()}
                disabled={!canApply}
              >
                {status === "processing" ? "Applying watermark…" : "Watermark & download"}
              </Button>
              <Button variant="secondary" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div ref={handlePreviewRef} className="space-y-4">
            {upload.pages.length > 0 && (
              <PdfPagePreviewPanel
                pages={upload.pages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                overlay={previewOverlay}
              />
            )}

            <aside className="space-y-3 rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[#1a1a1a]">What to expect</h2>
              <p className="text-sm text-[#666]">
                Watermarks are burned into the output PDF. The preview updates instantly as you
                change settings so you can position and style the watermark before exporting.
              </p>
              <p className="text-sm text-[#666]">
                Text and image watermarks stay editable only if you keep the original source PDF
                separately.
              </p>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
