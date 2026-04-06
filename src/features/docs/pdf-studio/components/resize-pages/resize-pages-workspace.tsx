"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import { readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import type { PdfPageItem } from "@/features/docs/pdf-studio/utils/pdf-reader";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import { PDFDocument } from "pdf-lib";
import { cn } from "@/lib/utils";

type FitMode = "contain" | "cover" | "stretch";

interface SizePreset {
  label: string;
  widthMm: number;
  heightMm: number;
}

const SIZE_PRESETS: { key: string; preset: SizePreset }[] = [
  { key: "a4-portrait", preset: { label: "A4 Portrait", widthMm: 210, heightMm: 297 } },
  { key: "a4-landscape", preset: { label: "A4 Landscape", widthMm: 297, heightMm: 210 } },
  { key: "letter-portrait", preset: { label: "US Letter Portrait", widthMm: 215.9, heightMm: 279.4 } },
  { key: "letter-landscape", preset: { label: "US Letter Landscape", widthMm: 279.4, heightMm: 215.9 } },
  { key: "custom", preset: { label: "Custom", widthMm: 210, heightMm: 297 } },
];

const mmToPt = (mm: number) => mm * (72 / 25.4);

export function ResizePagesWorkspace() {
  const [pages, setPages] = useState<PdfPageItem[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPreset, setSelectedPreset] = useState("a4-portrait");
  const [customWidthMm, setCustomWidthMm] = useState(210);
  const [customHeightMm, setCustomHeightMm] = useState(297);
  const [fitMode, setFitMode] = useState<FitMode>("contain");

  const targetSize = useMemo(() => {
    if (selectedPreset === "custom") {
      return { widthMm: customWidthMm, heightMm: customHeightMm };
    }
    const found = SIZE_PRESETS.find((p) => p.key === selectedPreset);
    return found
      ? { widthMm: found.preset.widthMm, heightMm: found.preset.heightMm }
      : { widthMm: 210, heightMm: 297 };
  }, [selectedPreset, customWidthMm, customHeightMm]);

  const handleFile = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await readPdfPages(file, 200);

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setPdfBytes(bytes);
      setPdfName(file.name.replace(/\.pdf$/i, ""));
      setPages(result.data);
    } catch {
      setError("Failed to read PDF");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!pdfBytes) return;
    setProcessing(true);
    setError(null);

    try {
      const srcDoc = await PDFDocument.load(pdfBytes);
      const newDoc = await PDFDocument.create();
      const targetWidthPt = mmToPt(targetSize.widthMm);
      const targetHeightPt = mmToPt(targetSize.heightMm);

      for (let i = 0; i < srcDoc.getPageCount(); i++) {
        const newPage = newDoc.addPage([targetWidthPt, targetHeightPt]);
        const srcPage = srcDoc.getPage(i);
        const { width: srcW, height: srcH } = srcPage.getSize();

        const [embeddedPage] = await newDoc.embedPdf(srcDoc, [i]);

        let drawW: number;
        let drawH: number;

        if (fitMode === "stretch") {
          drawW = targetWidthPt;
          drawH = targetHeightPt;
        } else if (fitMode === "cover") {
          const scale = Math.max(
            targetWidthPt / srcW,
            targetHeightPt / srcH
          );
          drawW = srcW * scale;
          drawH = srcH * scale;
        } else {
          // contain
          const scale = Math.min(
            targetWidthPt / srcW,
            targetHeightPt / srcH
          );
          drawW = srcW * scale;
          drawH = srcH * scale;
        }

        const x = (targetWidthPt - drawW) / 2;
        const y = (targetHeightPt - drawH) / 2;

        newPage.drawPage(embeddedPage, {
          x,
          y,
          width: drawW,
          height: drawH,
        });
      }

      const resultBytes = await newDoc.save();
      downloadPdfBytes(resultBytes, `${pdfName}-resized.pdf`);
    } catch {
      setError("Failed to resize PDF");
    } finally {
      setProcessing(false);
    }
  }, [pdfBytes, targetSize, fitMode, pdfName]);

  const handleClear = useCallback(() => {
    setPages([]);
    setPdfBytes(null);
    setPdfName("");
    setError(null);
  }, []);

  const fitModes: { key: FitMode; label: string; desc: string }[] = [
    { key: "contain", label: "Contain", desc: "Fit within page" },
    { key: "cover", label: "Cover", desc: "Fill page" },
    { key: "stretch", label: "Stretch", desc: "Fill exactly" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/app/docs/pdf-studio"
          className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          ← Back to PDF Studio
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Resize Pages
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Change the page dimensions of your PDF. Choose a preset or enter
          custom dimensions.
        </p>
      </div>

      {!pdfBytes && (
        <PdfUploadZone
          onFiles={handleFile}
          label="Drop your PDF here"
          disabled={loading}
          error={error}
        />
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Reading PDF pages…
        </div>
      )}

      {pdfBytes && pages.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {pdfName}.pdf — {pages.length} page
                {pages.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-[var(--muted-foreground)] underline transition-colors hover:text-red-600"
              >
                Change file
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Settings */}
            <div className="space-y-5">
              {/* Size preset */}
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)]">
                  Target Size
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {SIZE_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setSelectedPreset(p.key)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        selectedPreset === p.key
                          ? "border-[var(--accent)] bg-red-50/40 text-[var(--foreground)]"
                          : "border-[var(--border-strong)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                      )}
                    >
                      {p.preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPreset === "custom" && (
                <div className="flex gap-3">
                  <Input
                    type="number"
                    min={50}
                    max={1000}
                    value={customWidthMm}
                    onChange={(e) =>
                      setCustomWidthMm(
                        Math.max(50, parseInt(e.target.value, 10) || 50)
                      )
                    }
                    label="Width (mm)"
                  />
                  <Input
                    type="number"
                    min={50}
                    max={1000}
                    value={customHeightMm}
                    onChange={(e) =>
                      setCustomHeightMm(
                        Math.max(50, parseInt(e.target.value, 10) || 50)
                      )
                    }
                    label="Height (mm)"
                  />
                </div>
              )}

              {/* Fit mode */}
              <div>
                <label className="text-xs font-semibold text-[var(--foreground)]">
                  Fit Mode
                </label>
                <div className="mt-2 flex rounded-xl border border-[var(--border-strong)] bg-[var(--surface-soft)] p-1">
                  {fitModes.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setFitMode(m.key)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        fitMode === m.key
                          ? "bg-white text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      )}
                      title={m.desc}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Target: {targetSize.widthMm} × {targetSize.heightMm} mm (
                  {mmToPt(targetSize.widthMm).toFixed(0)} ×{" "}
                  {mmToPt(targetSize.heightMm).toFixed(0)} pt)
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}

              <Button
                onClick={handleDownload}
                disabled={processing}
                size="md"
                className="w-full"
              >
                {processing ? "Resizing…" : "Resize & Download"}
              </Button>
            </div>

            {/* Preview */}
            <div>
              <label className="text-xs font-semibold text-[var(--foreground)]">
                First Page Preview
              </label>
              {pages[0] && (
                <div className="mt-2 flex items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                  <div
                    className="relative overflow-hidden border border-[var(--border-soft)] bg-white shadow-sm"
                    style={{
                      width: `${Math.min(280, targetSize.widthMm * 0.8)}px`,
                      aspectRatio: `${targetSize.widthMm} / ${targetSize.heightMm}`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pages[0].previewUrl}
                      alt="First page preview"
                      className={cn(
                        "absolute",
                        fitMode === "contain" &&
                          "left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain",
                        fitMode === "cover" &&
                          "left-1/2 top-1/2 min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover",
                        fitMode === "stretch" && "h-full w-full object-fill"
                      )}
                    />
                  </div>
                </div>
              )}
              <p className="mt-2 text-center text-xs text-[var(--muted-foreground)]">
                Original: {pages[0]?.widthPt.toFixed(0)} ×{" "}
                {pages[0]?.heightPt.toFixed(0)} pt
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
