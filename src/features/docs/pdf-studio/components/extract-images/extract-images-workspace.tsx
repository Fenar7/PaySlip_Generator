"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import {
  extractImagesFromPdf,
  type ExtractedPdfImage,
} from "@/features/docs/pdf-studio/utils/pdf-image-extractor";
import { downloadBatchZip, type BatchZipItem } from "@/lib/pixel/batch-zip";
import { cn } from "@/lib/utils";

export function ExtractImagesWorkspace() {
  const analytics = usePdfStudioAnalytics("extract-images");
  const [images, setImages] = useState<ExtractedPdfImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleFile = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setImages([]);
    setError(null);
    setLoading(true);
    setProgress({ current: 0, total: 0 });
    analytics.trackUpload({
      fileCount: 1,
      totalBytes: file.size,
    });
    analytics.trackStart({
      action: "extract-images",
    });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await extractImagesFromPdf(bytes, (current, total) =>
      setProgress({ current, total })
    );

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      analytics.trackFail({ stage: "upload", reason: "processing-failed" });
      return;
    }

    if (result.images.length === 0) {
      setError("No embedded raster images found in this PDF.");
      analytics.trackFail({
        stage: "process",
        reason: "no-embedded-images",
      });
      return;
    }

    setImages(result.images);
    analytics.trackSuccess({
      action: "extract-images",
      imageCount: result.images.length,
    });
  }, [analytics]);

  function downloadSingle(img: ExtractedPdfImage) {
    const anchor = document.createElement("a");
    anchor.href = img.dataUrl;
    anchor.download = buildPdfStudioOutputName({
      toolId: "extract-images",
      baseName: `page${img.pageIndex + 1}-image${img.imageIndex + 1}`,
      extension: "png",
    });
    anchor.click();
    analytics.trackSuccess({
      action: "download-single",
      imageCount: 1,
    });
  }

  async function downloadAll() {
    if (images.length === 0) return;
    setDownloading(true);
    const items: BatchZipItem[] = images.map((img) => ({
      filename: buildPdfStudioOutputName({
        toolId: "extract-images",
        baseName: `page${img.pageIndex + 1}-image${img.imageIndex + 1}`,
        extension: "png",
      }),
      dataUrl: img.dataUrl,
    }));
    await downloadBatchZip(
      items,
      buildPdfStudioOutputName({
        toolId: "extract-images",
        baseName: "extracted-images",
        extension: "zip",
      }).replace(/\.zip$/u, ""),
    );
    setDownloading(false);
    analytics.trackSuccess({
      action: "download-all",
      imageCount: images.length,
      output: "zip",
    });
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="pdf-studio-tool-header">
        <Link
          href="/app/docs/pdf-studio"
          className="inline-flex items-center gap-1.5 text-sm text-[#666] hover:text-[#1a1a1a] transition-colors"
        >
          ← PDF Studio
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1a1a1a]">
          Extract Images from PDF
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          Pull all embedded raster images out of a PDF. Download individually or as a ZIP archive.
        </p>
      </div>

      <PdfUploadZone onFiles={handleFile} toolId="extract-images" />

      {loading && (
        <div className="space-y-2 text-center">
          <p className="text-sm text-[#666]">
            Scanning page {progress.current} of {progress.total}…
          </p>
          <div className="mx-auto h-1.5 w-64 overflow-hidden rounded-full bg-[#e5e5e5]">
            <div
              className="h-full rounded-full bg-[#1a1a1a] transition-all duration-300"
              style={{
                width: progress.total
                  ? `${(progress.current / progress.total) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#1a1a1a]">
              {images.length} image{images.length !== 1 ? "s" : ""} found
            </p>
            <Button size="sm" onClick={downloadAll} disabled={downloading}>
              {downloading ? "Zipping…" : "Download All (ZIP)"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img, i) => (
              <div
                key={i}
                className={cn(
                  "group overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-sm",
                  "hover:shadow-md transition-shadow"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.dataUrl}
                  alt={`Page ${img.pageIndex + 1} image ${img.imageIndex + 1}`}
                  className="h-32 w-full object-contain bg-[#fafafa]"
                />
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-[#444]">
                    Page {img.pageIndex + 1} · #{img.imageIndex + 1}
                  </p>
                  <p className="text-[10px] text-[#888]">
                    {img.width}×{img.height}
                  </p>
                  <Badge variant="default" className="mt-1 text-[10px]">
                    PNG
                  </Badge>
                </div>
                <div className="border-t border-[#f0f0f0] p-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full text-xs"
                    onClick={() => downloadSingle(img)}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
