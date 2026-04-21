"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { PdfPagePreviewPanel } from "@/features/docs/pdf-studio/components/shared/pdf-page-preview-panel";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import {
  formatPageNumberLabel,
  injectPageNumbers,
} from "@/features/docs/pdf-studio/utils/header-footer-writer";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import type {
  PageNumberFormat,
  PageNumberPosition,
  PdfStampScope,
} from "@/features/docs/pdf-studio/types";

const DEFAULTS = {
  format: "page-number-of-total" as PageNumberFormat,
  position: "bottom-center" as PageNumberPosition,
  startFrom: 1,
  skipFirstPage: false,
  scope: "all" as PdfStampScope,
  fontSize: 10,
  fontFamily: "helvetica" as const,
  color: "#000000",
  marginMm: 12,
};

export function PageNumbersWorkspace() {
  const analytics = usePdfStudioAnalytics("page-numbers");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [settings, setSettings] = useState(DEFAULTS);
  const { file, pdfBytes, pages, loading, error, setError, onFileSelect } =
    useSinglePdfUpload("page-numbers", analytics);

  const handleGenerate = useCallback(async () => {
    if (!file || !pdfBytes) {
      return;
    }

    setGenerating(true);
    setError(null);
    analytics.trackStart({ pageCount: pages.length });

    try {
      const result = await injectPageNumbers(pdfBytes, {
        ...settings,
        filename: file.name.replace(/\.pdf$/i, ""),
      });
      downloadPdfBytes(
        result,
        buildPdfStudioOutputName({
          toolId: "page-numbers",
          baseName: `${file.name.replace(/\.pdf$/i, "")}-page-numbers`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({ pageCount: pages.length });
    } catch {
      setError("Could not add page numbers to this PDF. Please try again.");
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setGenerating(false);
    }
  }, [analytics, file, pages.length, pdfBytes, setError, settings]);

  if (!file || pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
        <div className="pdf-studio-tool-header text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">Page Numbers</h1>
          <p className="mt-2 text-sm text-[#666]">
            Add standalone pagination with odd/even scopes and first-page exceptions.
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
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Page Numbers</h1>
          <p className="mt-2 text-sm text-[#666]">
            Browser-safe numbering with scope controls and a predictable export.
          </p>
        </div>
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <label className="block text-sm font-medium text-[#1a1a1a]">
          Format
          <select
            className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
            value={settings.format}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                format: event.target.value as PageNumberFormat,
              }))
            }
          >
            <option value="number">1</option>
            <option value="page-number">Page 1</option>
            <option value="number-of-total">1 of 12</option>
            <option value="page-number-of-total">Page 1 of 12</option>
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
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
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Scope
            <select
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={settings.scope}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  scope: event.target.value as PdfStampScope,
                }))
              }
            >
              <option value="all">All pages</option>
              <option value="odd">Odd pages</option>
              <option value="even">Even pages</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Start from
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
            Font size
            <input
              type="number"
              min={8}
              max={18}
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={settings.fontSize}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  fontSize: Math.max(8, Number(event.target.value) || 10),
                }))
              }
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#444]">
          <input
            type="checkbox"
            checked={settings.skipFirstPage}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                skipFirstPage: event.target.checked,
              }))
            }
          />
          Skip the first page
        </label>

        <div className="rounded-xl border border-[#eee] bg-[#fafafa] px-4 py-3 text-sm text-[#555]">
          Preview label:{" "}
          <span className="font-semibold text-[#1a1a1a]">
            {formatPageNumberLabel(settings.format, settings.startFrom + currentPage, pages.length)}
          </span>
        </div>

        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Exporting..." : "Export numbered PDF"}
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
