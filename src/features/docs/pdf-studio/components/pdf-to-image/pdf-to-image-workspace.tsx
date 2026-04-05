"use client";

import { useCallback, useRef, useState } from "react";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  renderPdfPagesToImages,
  type RenderOptions,
  type RenderedPage,
} from "@/features/docs/pdf-studio/utils/pdf-to-image";
import { buildZip, downloadBlob } from "@/features/docs/pdf-studio/utils/zip-builder";

// ── Component ──────────────────────────────────────────────────────────

export function PdfToImageWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [dpi, setDpi] = useState<72 | 150 | 300>(150);
  const [jpegQuality, setJpegQuality] = useState(85);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File upload ──────────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f || f.type !== "application/pdf") {
        setError("Please select a valid PDF file.");
        return;
      }

      setLoading(true);
      setError(null);
      setFile(f);
      setPages([]);

      try {
        // Validate page count
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const arrayBuffer = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
        }).promise;

        if (pdf.numPages > 20) {
          setError(`PDF has ${pdf.numPages} pages (max 20 for image conversion).`);
          setFile(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to read PDF: ${msg}`);
        setFile(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Render pages ─────────────────────────────────────────────────────

  const handleRender = useCallback(async () => {
    if (!file) return;

    setRendering(true);
    setError(null);
    setPages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const options: RenderOptions = {
        format,
        dpi,
        quality: format === "jpeg" ? jpegQuality / 100 : undefined,
      };

      const result = await renderPdfPagesToImages(bytes, options, (current, total) => {
        setProgress({ current, total });
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setPages(result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Rendering failed: ${msg}`);
    } finally {
      setRendering(false);
    }
  }, [file, format, dpi, jpegQuality]);

  // ── Download single page ─────────────────────────────────────────────

  const handleDownloadPage = useCallback(
    (page: RenderedPage) => {
      const ext = format === "png" ? "png" : "jpg";
      const baseName = file?.name.replace(/\.pdf$/i, "") ?? "page";
      const blob = page.blob;
      downloadBlob(blob, `${baseName}-page${page.pageIndex + 1}.${ext}`);
    },
    [file, format],
  );

  // ── Download all as ZIP ──────────────────────────────────────────────

  const handleDownloadAll = useCallback(async () => {
    if (pages.length === 0) return;
    const ext = format === "png" ? "png" : "jpg";
    const baseName = file?.name.replace(/\.pdf$/i, "") ?? "pages";

    const files: { name: string; data: Uint8Array }[] = [];
    for (const page of pages) {
      const buffer = await page.blob.arrayBuffer();
      files.push({
        name: `${baseName}-page${page.pageIndex + 1}.${ext}`,
        data: new Uint8Array(buffer),
      });
    }

    const zip = buildZip(files);
    downloadBlob(zip, `${baseName}-images.zip`);
  }, [pages, format, file]);

  // ── DPI options ──────────────────────────────────────────────────────

  const dpiOptions: { value: 72 | 150 | 300; label: string }[] = [
    { value: 72, label: "Screen (72)" },
    { value: 150, label: "Standard (150)" },
    { value: 300, label: "Print (300)" },
  ];

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">
          PDF to Image
        </h1>
        <p className="mt-2 text-sm text-[#666]">
          Convert PDF pages to high-quality PNG or JPEG images
        </p>
      </div>

      {/* Upload & Settings */}
      {!file ? (
        <div
          className={cn(
            "mx-auto flex max-w-xl cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e5] bg-white px-6 py-16 text-center transition-colors hover:border-[#999]",
            loading && "pointer-events-none opacity-60",
          )}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              fileInputRef.current?.click();
          }}
        >
          <svg
            className="mb-4 h-12 w-12 text-[#999]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm font-medium text-[#1a1a1a]">
            {loading ? "Reading PDF…" : "Upload a PDF to convert"}
          </p>
          <p className="mt-1 text-xs text-[#666]">Up to 20 pages</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <>
          {/* Settings bar */}
          <div className="mb-6 rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end gap-4 sm:gap-6">
              {/* File info */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <svg
                  className="h-5 w-5 shrink-0 text-[#666]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="truncate text-sm font-medium text-[#1a1a1a]">
                  {file.name}
                </span>
                <button
                  className="shrink-0 text-xs text-[#666] hover:text-red-600"
                  onClick={() => {
                    setFile(null);
                    setPages([]);
                    setError(null);
                  }}
                >
                  Change
                </button>
              </div>

              {/* Format */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1a1a1a]">
                  Format
                </label>
                <div className="flex rounded-xl bg-[#f5f5f5] p-1">
                  {(["png", "jpeg"] as const).map((f) => (
                    <button
                      key={f}
                      className={cn(
                        "rounded-lg px-4 py-1.5 text-xs font-medium uppercase transition-colors",
                        format === f
                          ? "bg-white text-[#1a1a1a] shadow-sm"
                          : "text-[#666] hover:text-[#1a1a1a]",
                      )}
                      onClick={() => setFormat(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* DPI */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#1a1a1a]">
                  Resolution
                </label>
                <div className="flex rounded-xl bg-[#f5f5f5] p-1">
                  {dpiOptions.map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        dpi === opt.value
                          ? "bg-white text-[#1a1a1a] shadow-sm"
                          : "text-[#666] hover:text-[#1a1a1a]",
                      )}
                      onClick={() => setDpi(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* JPEG quality */}
              {format === "jpeg" && (
                <div className="min-w-[140px]">
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#1a1a1a]">
                      Quality
                    </label>
                    <span className="text-xs text-[#666]">{jpegQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    value={jpegQuality}
                    onChange={(e) => setJpegQuality(Number(e.target.value))}
                    className="w-full accent-[#1a1a1a]"
                  />
                </div>
              )}

              {/* Convert button */}
              <Button
                onClick={handleRender}
                disabled={rendering}
                className="shrink-0"
              >
                {rendering
                  ? `Converting ${progress.current}/${progress.total}…`
                  : pages.length > 0
                    ? "Re-convert"
                    : "Convert"}
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Rendering progress */}
          {rendering && (
            <div className="mb-6 text-center">
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-[#e5e5e5]">
                <div
                  className="h-full rounded-full bg-[#1a1a1a] transition-all"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-[#666]">
                Rendering page {progress.current} of {progress.total}…
              </p>
            </div>
          )}

          {/* Results grid */}
          {pages.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1a1a1a]">
                    Converted Pages
                  </span>
                  <Badge>{pages.length}</Badge>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadAll}
                >
                  Download All as ZIP
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {pages.map((page) => (
                  <div
                    key={page.pageIndex}
                    className="group overflow-hidden rounded-xl border border-[#e5e5e5] bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-[#f5f5f5]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={page.dataUrl}
                        alt={`Page ${page.pageIndex + 1}`}
                        className="h-full w-full object-contain"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/10">
                        <Button
                          size="sm"
                          className="translate-y-2 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100"
                          onClick={() => handleDownloadPage(page)}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs font-medium text-[#1a1a1a]">
                        Page {page.pageIndex + 1}
                      </span>
                      <span className="text-[10px] text-[#666]">
                        {page.width}×{page.height}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Error when no file selected */}
      {!file && error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
