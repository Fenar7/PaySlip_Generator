"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { PdfPagePreviewPanel } from "@/features/docs/pdf-studio/components/shared/pdf-page-preview-panel";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import {
  formatBatesNumber,
  injectBatesNumbers,
} from "@/features/docs/pdf-studio/utils/header-footer-writer";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import type { PageNumberPosition } from "@/features/docs/pdf-studio/types";

export function BatesWorkspace() {
  const analytics = usePdfStudioAnalytics("bates");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState({
    prefix: "BATES-",
    suffix: "",
    startFrom: 1,
    padding: 6,
    position: "bottom-right" as PageNumberPosition,
    fontSize: 10,
    fontFamily: "helvetica" as const,
    color: "#000000",
    marginMm: 12,
  });
  const { file, pdfBytes, pages, loading, error, setError, onFileSelect } =
    useSinglePdfUpload("bates", analytics);

  const previewRange = useMemo(() => {
    if (pages.length === 0) {
      return null;
    }

    return {
      first: formatBatesNumber(1, settings),
      last: formatBatesNumber(pages.length, settings),
    };
  }, [pages.length, settings]);

  const handleGenerate = useCallback(async () => {
    if (!file || !pdfBytes) {
      return;
    }

    setGenerating(true);
    setError(null);
    analytics.trackStart({ pageCount: pages.length });

    try {
      const result = await injectBatesNumbers(pdfBytes, {
        ...settings,
        filename: file.name.replace(/\.pdf$/i, ""),
      });
      downloadPdfBytes(
        result,
        buildPdfStudioOutputName({
          toolId: "bates",
          baseName: `${file.name.replace(/\.pdf$/i, "")}-bates`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({ pageCount: pages.length });
    } catch {
      setError("Could not add Bates numbers to this PDF. Please try again.");
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setGenerating(false);
    }
  }, [analytics, file, pages.length, pdfBytes, setError, settings]);

  if (!file || pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
        <div className="pdf-studio-tool-header text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">Bates Numbering</h1>
          <p className="mt-2 text-sm text-[#666]">
            Apply deterministic sequential numbering with prefix, suffix, and zero-padding.
          </p>
        </div>
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <button
          className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ddd] bg-white px-6 py-16 text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-sm font-medium text-[#1a1a1a]">
            {loading ? "Loading PDF..." : "Upload a PDF"}
          </span>
          <span className="mt-1 text-xs text-[#666]">Single PDF • up to 200 pages</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="application/pdf"
          onChange={(event) => void onFileSelect(event.target.files?.[0] ?? null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[360px,1fr]">
      <div className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-5">
        <div className="pdf-studio-tool-header">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Bates Numbering</h1>
          <p className="mt-2 text-sm text-[#666]">
            Sequential numbering for review-ready PDFs. The preview range below matches export.
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Prefix
            <input
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={settings.prefix}
              onChange={(event) =>
                setSettings((current) => ({ ...current, prefix: event.target.value }))
              }
            />
          </label>
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Suffix
            <input
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={settings.suffix}
              onChange={(event) =>
                setSettings((current) => ({ ...current, suffix: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Start number
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={settings.startFrom}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  startFrom: Math.max(1, Number(event.target.value) || 1),
                }))
              }
            />
          </label>
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Zero padding
            <input
              type="number"
              min={3}
              max={10}
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={settings.padding}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  padding: Math.max(3, Number(event.target.value) || 6),
                }))
              }
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-[#1a1a1a]">
          Position
          <select
            className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
            value={settings.position}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                position: event.target.value as PageNumberPosition,
              }))
            }
          >
            <option value="top-left">Top left</option>
            <option value="top-right">Top right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-center">Bottom center</option>
            <option value="bottom-right">Bottom right</option>
          </select>
        </label>

        <div className="rounded-xl border border-[#eee] bg-[#fafafa] px-4 py-3 text-sm text-[#555]">
          <p className="font-medium text-[#1a1a1a]">Preview range</p>
          <p className="mt-1">
            {previewRange ? `${previewRange.first} → ${previewRange.last}` : "Upload a PDF to preview the sequence."}
          </p>
        </div>

        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Exporting..." : "Export Bates-numbered PDF"}
        </Button>
      </div>

      <PdfPagePreviewPanel
        pages={pages}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
