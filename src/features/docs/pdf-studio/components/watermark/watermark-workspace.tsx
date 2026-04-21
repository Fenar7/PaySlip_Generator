"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import { applyWatermarkToPdf } from "@/features/docs/pdf-studio/utils/pdf-watermark-writer";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import { WATERMARK_TEXT_PRESETS } from "@/features/docs/pdf-studio/constants";
import type { WatermarkPresetId, WatermarkSettings } from "@/features/docs/pdf-studio/types";

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

export function WatermarkWorkspace() {
  const analytics = usePdfStudioAnalytics("watermark");
  const upload = useSinglePdfUpload("watermark", analytics);
  const [watermark, setWatermark] = useState<WatermarkSettings>(
    createPresetWatermark(DEFAULT_PRESET.id),
  );
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const presetButtons = useMemo(
    () => Object.values(WATERMARK_TEXT_PRESETS),
    [],
  );

  async function handleApply() {
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
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">Add Watermark</h1>
        <p className="mt-2 text-sm text-[#666]">
          Add text or image watermarks to an existing PDF with preset labels like Draft, Confidential, Paid, and Copy.
        </p>
      </div>

      {!upload.file ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e5] bg-white px-6 py-14 text-center">
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
            <div className="rounded-xl bg-[#f5f5f5] px-4 py-3 text-sm text-[#1a1a1a]">
              <span className="font-medium">{upload.file.name}</span>
              <span className="ml-2 text-[#666]">{upload.pages.length} pages</span>
            </div>

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

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-[#1a1a1a]">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                  Mode
                </span>
                <select
                  className="w-full rounded-xl border border-[#e5e5e5] px-3 py-2"
                  value={watermark.type}
                  onChange={(event) =>
                    setWatermark((current) => ({
                      ...current,
                      enabled: true,
                      type: event.target.value as WatermarkSettings["type"],
                    }))
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
                  className="w-full rounded-xl border border-[#e5e5e5] px-3 py-2"
                  value={watermark.scope}
                  onChange={(event) =>
                    setWatermark((current) => ({
                      ...current,
                      scope: event.target.value as WatermarkSettings["scope"],
                    }))
                  }
                >
                  <option value="all">All pages</option>
                  <option value="first">First page only</option>
                </select>
              </label>
            </div>

            {watermark.type === "text" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-[#1a1a1a] sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                    Watermark text
                  </span>
                  <input
                    className="w-full rounded-xl border border-[#e5e5e5] px-3 py-2"
                    value={watermark.text?.content ?? ""}
                    onChange={(event) =>
                      setWatermark((current) => ({
                        ...current,
                        text: {
                          content: event.target.value.slice(0, 120),
                          color: current.text?.color ?? DEFAULT_PRESET.color,
                          opacity: current.text?.opacity ?? DEFAULT_PRESET.opacity,
                          fontSize: current.text?.fontSize ?? DEFAULT_PRESET.fontSize,
                        },
                      }))
                    }
                  />
                </label>
                <label className="space-y-1 text-sm text-[#1a1a1a]">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                    Opacity
                  </span>
                  <input
                    className="w-full"
                    type="range"
                    min={5}
                    max={50}
                    value={watermark.text?.opacity ?? DEFAULT_PRESET.opacity}
                    onChange={(event) =>
                      setWatermark((current) => ({
                        ...current,
                        text: {
                          content: current.text?.content ?? DEFAULT_PRESET.text,
                          color: current.text?.color ?? DEFAULT_PRESET.color,
                          fontSize: current.text?.fontSize ?? DEFAULT_PRESET.fontSize,
                          opacity: Number(event.target.value),
                        },
                      }))
                    }
                  />
                </label>
                <label className="space-y-1 text-sm text-[#1a1a1a]">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#666]">
                    Rotation
                  </span>
                  <input
                    className="w-full"
                    type="range"
                    min={0}
                    max={359}
                    value={watermark.rotation}
                    onChange={(event) =>
                      setWatermark((current) => ({
                        ...current,
                        rotation: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  ref={imageInputRef}
                  className="hidden"
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => {
                    const imageFile = event.target.files?.[0];
                    if (!imageFile) {
                      return;
                    }
                    const previewUrl = URL.createObjectURL(imageFile);
                    setWatermark((current) => ({
                      ...current,
                      image: {
                        file: imageFile,
                        previewUrl,
                        scale: current.image?.scale ?? 35,
                        opacity: current.image?.opacity ?? 25,
                      },
                    }));
                  }}
                />
                <Button type="button" variant="secondary" onClick={() => imageInputRef.current?.click()}>
                  Upload watermark image
                </Button>
                <p className="text-xs text-[#666]">
                  PNG and JPG watermark images stay embedded in the exported PDF. Large source images may be scaled down.
                </p>
              </div>
            )}

            {upload.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {upload.error}
              </div>
            ) : null}

            <Button onClick={() => void handleApply()} disabled={status === "processing"}>
              {status === "processing" ? "Applying watermark…" : "Watermark & download"}
            </Button>
          </div>

          <aside className="space-y-3 rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#1a1a1a]">What to expect</h2>
            <p className="text-sm text-[#666]">
              Watermarks are burned into the output PDF. Text and image watermarks stay editable only if you keep the original source PDF separately.
            </p>
            <p className="text-sm text-[#666]">
              Use in browser for stateless stamping. Choose the workspace when you need presets, copy changes, and a private upload flow.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
