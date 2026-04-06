"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PixelToolShell } from "@/features/pixel/components/pixel-tool-shell";
import { ImageUploadZone } from "@/features/pixel/components/image-upload-zone";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp";
type ResizeMode = "dimensions" | "percentage" | "preset";

interface ResizePreset {
  label: string;
  width: number;
  height: number;
}

const PRESETS: ResizePreset[] = [
  { label: "Web Thumbnail (150×150)", width: 150, height: 150 },
  { label: "Web Banner (1200×630)", width: 1200, height: 630 },
  { label: "Icon (512×512)", width: 512, height: 512 },
  { label: "WhatsApp DP (500×500)", width: 500, height: 500 },
  { label: "HD (1920×1080)", width: 1920, height: 1080 },
];

interface FileEntry {
  file: File;
  img: HTMLImageElement;
  previewUrl: string;
}

export function ResizeWorkspace() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [mode, setMode] = useState<ResizeMode>("dimensions");
  const [targetW, setTargetW] = useState(800);
  const [targetH, setTargetH] = useState(600);
  const [lockAspect, setLockAspect] = useState(true);
  const [percentage, setPercentage] = useState(100);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(85);
  const [useTargetSize, setUseTargetSize] = useState(false);
  const [targetSizeKb, setTargetSizeKb] = useState(200);
  const [results, setResults] = useState<
    { blob: Blob; width: number; height: number }[]
  >([]);
  const [processing, setProcessing] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const handleImageLoaded = useCallback(
    (file: File, previewUrl: string, img: HTMLImageElement) => {
      setFiles((prev) =>
        prev.length >= 10 ? prev : [...prev, { file, img, previewUrl }],
      );
      setTargetW(img.naturalWidth);
      setTargetH(img.naturalHeight);
    },
    [],
  );

  const getTargetDims = useCallback(
    (origW: number, origH: number) => {
      switch (mode) {
        case "dimensions":
          return { w: targetW, h: targetH };
        case "percentage":
          return {
            w: Math.round((origW * percentage) / 100),
            h: Math.round((origH * percentage) / 100),
          };
        case "preset": {
          const p = PRESETS[selectedPreset];
          return { w: p.width, h: p.height };
        }
      }
    },
    [mode, targetW, targetH, percentage, selectedPreset],
  );

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    const newResults: { blob: Blob; width: number; height: number }[] = [];

    for (const entry of files) {
      const { w, h } = getTargetDims(
        entry.img.naturalWidth,
        entry.img.naturalHeight,
      );
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(entry.img, 0, 0, w, h);

      let blob: Blob;
      if (useTargetSize && format !== "image/png") {
        const { compressToTargetSize } = await import(
          "@/features/pixel/utils/file-size-compress"
        );
        blob = await compressToTargetSize(
          canvas,
          targetSizeKb,
          format as "image/jpeg" | "image/webp",
        );
      } else {
        blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob(
            (b) => resolve(b!),
            format,
            format === "image/png" ? undefined : quality / 100,
          );
        });
      }

      newResults.push({ blob, width: w, height: h });
      canvas.width = 0;
      canvas.height = 0;
    }

    setResults(newResults);
    setProcessing(false);
  }, [files, getTargetDims, format, quality, useTargetSize, targetSizeKb]);

  const handleDownload = useCallback(
    async (index: number) => {
      const r = results[index];
      if (!r) return;
      const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
      const url = URL.createObjectURL(r.blob);
      blobUrlsRef.current.push(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resized-${index + 1}.${ext}`;
      a.click();
    },
    [results, format],
  );

  const handleDownloadAll = useCallback(async () => {
    if (results.length <= 1) {
      if (results.length === 1) handleDownload(0);
      return;
    }

    const { zipSync } = await import("fflate");
    const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
    const zipData: Record<string, Uint8Array> = {};

    for (let i = 0; i < results.length; i++) {
      const buf = await results[i].blob.arrayBuffer();
      zipData[`resized-${i + 1}.${ext}`] = new Uint8Array(buf);
    }

    // fflate zipSync expects a specific format
    const zipped = zipSync(zipData);
    const blob = new Blob([new Uint8Array(zipped.buffer, zipped.byteOffset, zipped.byteLength).slice()], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    blobUrlsRef.current.push(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resized-images.zip";
    a.click();
  }, [results, format, handleDownload]);

  const handleWidthChange = useCallback(
    (w: number) => {
      setTargetW(w);
      if (lockAspect && files[0]) {
        const ratio = files[0].img.naturalHeight / files[0].img.naturalWidth;
        setTargetH(Math.round(w * ratio));
      }
    },
    [lockAspect, files],
  );

  const handleHeightChange = useCallback(
    (h: number) => {
      setTargetH(h);
      if (lockAspect && files[0]) {
        const ratio = files[0].img.naturalWidth / files[0].img.naturalHeight;
        setTargetW(Math.round(h * ratio));
      }
    },
    [lockAspect, files],
  );

  return (
    <PixelToolShell
      title="📐 Resize & Compress"
      description="Resize to exact dimensions or target file size"
    >
      <div className="space-y-6">
        <ImageUploadZone onImageLoaded={handleImageLoaded} />

        {files.length > 0 && (
          <>
            {files.length > 1 && (
              <p className="text-xs text-[#666]">
                {files.length} images loaded (max 10)
              </p>
            )}

            {/* Resize Mode */}
            <div className="space-y-3 rounded-xl border border-[#e5e5e5] bg-white p-4">
              <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
                Resize Mode
              </label>
              <div className="flex gap-2 flex-wrap">
                {(
                  [
                    ["dimensions", "By Dimensions"],
                    ["percentage", "By Percentage"],
                    ["preset", "By Preset"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMode(val)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm transition-colors border",
                      mode === val
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "border-[#e5e5e5] text-[#666] hover:bg-[#f5f5f5]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === "dimensions" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input
                        label="Width (px)"
                        type="number"
                        min={1}
                        max={10000}
                        value={targetW}
                        onChange={(e) =>
                          handleWidthChange(Number(e.target.value))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLockAspect(!lockAspect)}
                      className="mt-6 text-lg"
                      title={
                        lockAspect ? "Unlock aspect ratio" : "Lock aspect ratio"
                      }
                    >
                      {lockAspect ? "🔗" : "🔓"}
                    </button>
                    <div className="flex-1">
                      <Input
                        label="Height (px)"
                        type="number"
                        min={1}
                        max={10000}
                        value={targetH}
                        onChange={(e) =>
                          handleHeightChange(Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {mode === "percentage" && (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={200}
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                  <span className="text-sm text-[#666] w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              )}

              {mode === "preset" && (
                <div className="space-y-1">
                  {PRESETS.map((p, i) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setSelectedPreset(i)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                        selectedPreset === i
                          ? "bg-red-50 text-[var(--accent)] font-medium"
                          : "hover:bg-[#f5f5f5] text-[#666]",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Compression */}
            <div className="space-y-3 rounded-xl border border-[#e5e5e5] bg-white p-4">
              <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
                Output
              </label>
              <div className="flex gap-2">
                {(
                  [
                    ["image/jpeg", "JPEG"],
                    ["image/png", "PNG"],
                    ["image/webp", "WebP"],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormat(val)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm transition-colors border",
                      format === val
                        ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                        : "border-[#e5e5e5] text-[#666] hover:bg-[#f5f5f5]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {format !== "image/png" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-[#666] w-16">Quality</label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                    />
                    <span className="text-xs text-[#999] w-9 text-right">
                      {quality}%
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useTargetSize}
                      onChange={(e) => setUseTargetSize(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span className="text-xs text-[#666]">
                      Target file size
                    </span>
                  </label>

                  {useTargetSize && (
                    <Input
                      label="Target size (KB)"
                      type="number"
                      min={10}
                      max={10000}
                      value={targetSizeKb}
                      onChange={(e) => setTargetSizeKb(Number(e.target.value))}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Process */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleProcess} disabled={processing}>
                {processing ? "Processing…" : "Resize & Compress"}
              </Button>
              {files.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                    setFiles([]);
                    setResults([]);
                  }}
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-3 rounded-xl border border-[#e5e5e5] bg-white p-4">
                <div className="flex items-center justify-between">
                  <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
                    Results
                  </label>
                  {results.length > 1 && (
                    <Button variant="secondary" size="sm" onClick={handleDownloadAll}>
                      Download All (ZIP)
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[#e5e5e5] p-3 text-center space-y-2"
                    >
                      <p className="text-sm font-medium text-[#1a1a1a]">
                        Image {i + 1}
                      </p>
                      <p className="text-xs text-[#666]">
                        {r.width}×{r.height}px •{" "}
                        {(r.blob.size / 1024).toFixed(0)}KB
                      </p>
                      <div className="text-xs text-[#999]">
                        Original: {files[i]?.img.naturalWidth}×
                        {files[i]?.img.naturalHeight}px •{" "}
                        {((files[i]?.file.size ?? 0) / 1024).toFixed(0)}KB
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(i)}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PixelToolShell>
  );
}
