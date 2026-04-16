"use client";

import { useCallback, useRef, useState } from "react";
import { PixelToolShell } from "@/features/pixel/components/pixel-tool-shell";
import { MultiFileUploadZone } from "@/features/pixel/components/multi-file-upload-zone";
import { Button } from "@/components/ui";
import { downloadBatchZip, type BatchZipItem } from "@/lib/pixel/batch-zip";
import { cn } from "@/lib/utils";

type OutputFormat = "image/jpeg" | "image/webp";

interface CompressedEntry {
  originalName: string;
  originalSize: number;
  compressedDataUrl: string;
  compressedSize: number;
  format: OutputFormat;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

export function CompressWorkspace() {
  const [entries, setEntries] = useState<CompressedEntry[]>([]);
  const [quality, setQuality] = useState(75);
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setProcessing(true);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const results: CompressedEntry[] = [];
      for (const file of files) {
        const bitmap = await createImageBitmap(file);
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0);
        const dataUrl = canvas.toDataURL(format, quality / 100);
        results.push({
          originalName: file.name,
          originalSize: file.size,
          compressedDataUrl: dataUrl,
          compressedSize: dataUrlBytes(dataUrl),
          format,
        });
      }
      setEntries(results);
      setProcessing(false);
    },
    [format, quality]
  );

  async function handleDownloadAll() {
    if (entries.length === 0) return;
    setDownloading(true);
    const ext = format === "image/jpeg" ? "jpg" : "webp";
    const items: BatchZipItem[] = entries.map((e) => ({
      filename: `${e.originalName.replace(/\.[^.]+$/, "")}_compressed.${ext}`,
      dataUrl: e.compressedDataUrl,
    }));
    await downloadBatchZip(items, "pixel-compressed");
    setDownloading(false);
  }

  function handleDownloadSingle(entry: CompressedEntry) {
    const ext = entry.format === "image/jpeg" ? "jpg" : "webp";
    const anchor = document.createElement("a");
    anchor.href = entry.compressedDataUrl;
    anchor.download = `${entry.originalName.replace(/\.[^.]+$/, "")}_compressed.${ext}`;
    anchor.click();
  }

  return (
    <PixelToolShell
      title="Image Compressor"
      description="Reduce image file size without noticeable quality loss. Supports batch compression with ZIP download."
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-6">
        {/* Settings */}
        <div className="flex flex-wrap items-end gap-6 rounded-xl border border-[#e5e5e5] bg-white p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#666]">Output Format</label>
            <div className="flex gap-2">
              {(["image/jpeg", "image/webp"] as OutputFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    format === f
                      ? "bg-[#1a1a1a] text-white"
                      : "bg-[#f5f5f5] text-[#444] hover:bg-[#e8e8e8]"
                  )}
                >
                  {f === "image/jpeg" ? "JPEG" : "WebP"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-1">
            <label className="flex items-center justify-between text-xs font-medium text-[#666]">
              <span>Quality</span>
              <span className="font-bold text-[#1a1a1a]">{quality}%</span>
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-[#1a1a1a]"
            />
            <div className="flex justify-between text-[10px] text-[#aaa]">
              <span>Smaller file</span>
              <span>Better quality</span>
            </div>
          </div>
        </div>

        <MultiFileUploadZone
          onFilesAccepted={handleFiles}
          accept="image/jpeg,image/png,image/webp"
          label="Drop images here or click to upload"
        />

        {processing && (
          <p className="text-center text-sm text-[#666]">Compressing…</p>
        )}

        {entries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1a1a1a]">
                {entries.length} image{entries.length !== 1 ? "s" : ""} processed
              </h3>
              {entries.length > 1 && (
                <Button
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={downloading}
                >
                  {downloading ? "Zipping…" : "Download All (ZIP)"}
                </Button>
              )}
            </div>

            <div className="divide-y divide-[#f0f0f0] rounded-xl border border-[#e5e5e5] bg-white">
              {entries.map((entry, i) => {
                const savings =
                  entry.originalSize > 0
                    ? Math.round(
                        ((entry.originalSize - entry.compressedSize) /
                          entry.originalSize) *
                          100
                      )
                    : 0;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#1a1a1a]">
                        {entry.originalName}
                      </p>
                      <p className="text-xs text-[#888]">
                        {formatBytes(entry.originalSize)} →{" "}
                        {formatBytes(entry.compressedSize)}
                        {savings > 0 && (
                          <span className="ml-1.5 font-medium text-emerald-600">
                            −{savings}%
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-4 shrink-0"
                      onClick={() => handleDownloadSingle(entry)}
                    >
                      Download
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PixelToolShell>
  );
}
