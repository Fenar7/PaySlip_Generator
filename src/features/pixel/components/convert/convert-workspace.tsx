"use client";

import { useCallback, useState } from "react";
import { PixelToolShell } from "@/features/pixel/components/pixel-tool-shell";
import { MultiFileUploadZone } from "@/features/pixel/components/multi-file-upload-zone";
import { Button } from "@/components/ui";
import { downloadBatchZip, type BatchZipItem } from "@/lib/pixel/batch-zip";
import { cn } from "@/lib/utils";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

interface ConvertedEntry {
  originalName: string;
  dataUrl: string;
  outputFormat: OutputFormat;
}

const FORMAT_OPTIONS: { label: string; value: OutputFormat; ext: string }[] = [
  { label: "JPEG", value: "image/jpeg", ext: "jpg" },
  { label: "PNG", value: "image/png", ext: "png" },
  { label: "WebP", value: "image/webp", ext: "webp" },
];

export function ConvertWorkspace() {
  const [entries, setEntries] = useState<ConvertedEntry[]>([]);
  const [targetFormat, setTargetFormat] = useState<OutputFormat>("image/png");
  const [quality, setQuality] = useState(92);
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setProcessing(true);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const results: ConvertedEntry[] = [];
      for (const file of files) {
        const bitmap = await createImageBitmap(file);
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // For PNG/WebP, fill transparent background to white when converting from JPEG
        if (targetFormat !== "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(bitmap, 0, 0);
        const dataUrl = canvas.toDataURL(targetFormat, quality / 100);
        results.push({ originalName: file.name, dataUrl, outputFormat: targetFormat });
      }

      setEntries(results);
      setProcessing(false);
    },
    [targetFormat, quality]
  );

  async function handleDownloadAll() {
    if (entries.length === 0) return;
    setDownloading(true);
    const ext =
      FORMAT_OPTIONS.find((f) => f.value === targetFormat)?.ext ?? "png";
    const items: BatchZipItem[] = entries.map((e) => ({
      filename: `${e.originalName.replace(/\.[^.]+$/, "")}.${ext}`,
      dataUrl: e.dataUrl,
    }));
    await downloadBatchZip(items, "pixel-converted");
    setDownloading(false);
  }

  function handleDownloadSingle(entry: ConvertedEntry) {
    const ext =
      FORMAT_OPTIONS.find((f) => f.value === entry.outputFormat)?.ext ?? "png";
    const anchor = document.createElement("a");
    anchor.href = entry.dataUrl;
    anchor.download = `${entry.originalName.replace(/\.[^.]+$/, "")}.${ext}`;
    anchor.click();
  }

  return (
    <PixelToolShell
      title="Image Converter"
      description="Convert between JPEG, PNG, and WebP formats. Batch convert and download as ZIP."
    >
      <div className="space-y-6">
        {/* Settings */}
        <div className="flex flex-wrap items-end gap-6 rounded-xl border border-[#e5e5e5] bg-white p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#666]">Convert to</label>
            <div className="flex gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTargetFormat(opt.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    targetFormat === opt.value
                      ? "bg-[#1a1a1a] text-white"
                      : "bg-[#f5f5f5] text-[#444] hover:bg-[#e8e8e8]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {targetFormat !== "image/png" && (
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
            </div>
          )}
        </div>

        <MultiFileUploadZone
          onFilesAccepted={handleFiles}
          accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
          label="Drop images here or click to upload"
        />

        {processing && (
          <p className="text-center text-sm text-[#666]">Converting…</p>
        )}

        {entries.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1a1a1a]">
                {entries.length} image{entries.length !== 1 ? "s" : ""} converted
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
                const ext =
                  FORMAT_OPTIONS.find((f) => f.value === entry.outputFormat)?.ext ??
                  "png";
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <p className="min-w-0 flex-1 truncate font-medium text-[#1a1a1a]">
                      {entry.originalName} → .{ext}
                    </p>
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
