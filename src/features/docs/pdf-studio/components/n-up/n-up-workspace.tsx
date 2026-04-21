"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { PdfPagePreviewPanel } from "@/features/docs/pdf-studio/components/shared/pdf-page-preview-panel";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import { generatePdfNUpLayout, type PdfNUpSettings } from "@/features/docs/pdf-studio/utils/pdf-n-up";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

export function NUpWorkspace() {
  const analytics = usePdfStudioAnalytics("n-up");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [settings, setSettings] = useState<PdfNUpSettings>({
    layout: "2-up",
    sheetSize: "A4",
  });
  const [generating, setGenerating] = useState(false);
  const { file, pdfBytes, pages, loading, error, setError, onFileSelect } =
    useSinglePdfUpload("n-up", analytics);

  const handleGenerate = useCallback(async () => {
    if (!file || !pdfBytes) {
      return;
    }

    setGenerating(true);
    setError(null);
    analytics.trackStart({ pageCount: pages.length, layout: settings.layout });

    try {
      const result = await generatePdfNUpLayout(pdfBytes, settings);
      downloadPdfBytes(
        result,
        buildPdfStudioOutputName({
          toolId: "n-up",
          baseName: `${file.name.replace(/\.pdf$/i, "")}-${settings.layout}`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({ pageCount: pages.length, layout: settings.layout });
    } catch {
      setError("Could not generate the N-up layout. Please try again.");
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setGenerating(false);
    }
  }, [analytics, file, pages.length, pdfBytes, setError, settings]);

  if (!file || pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
        <div className="pdf-studio-tool-header text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">N-Up Layout</h1>
          <p className="mt-2 text-sm text-[#666]">
            Generate printable 2-up and 4-up sheet layouts for A4 and A3 output.
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
          <span className="mt-1 text-xs text-[#666]">Single PDF • up to 100 pages</span>
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
          <h1 className="text-2xl font-bold text-[#1a1a1a]">N-Up Layout</h1>
          <p className="mt-2 text-sm text-[#666]">
            Export printable imposed sheets instead of a visual-only preview.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Layout
            <select
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={settings.layout}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  layout: event.target.value as PdfNUpSettings["layout"],
                }))
              }
            >
              <option value="2-up">2-up</option>
              <option value="4-up">4-up</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Sheet size
            <select
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={settings.sheetSize}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  sheetSize: event.target.value as PdfNUpSettings["sheetSize"],
                }))
              }
            >
              <option value="A4">A4</option>
              <option value="A3">A3</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Exporting..." : "Export N-up PDF"}
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
