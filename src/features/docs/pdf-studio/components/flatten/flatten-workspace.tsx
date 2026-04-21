"use client";

import { useCallback, useRef } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { PdfPagePreviewPanel } from "@/features/docs/pdf-studio/components/shared/pdf-page-preview-panel";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import { flattenPdfFormFields } from "@/features/docs/pdf-studio/utils/pdf-annotation-tools";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import { useState } from "react";

export function FlattenWorkspace() {
  const analytics = usePdfStudioAnalytics("flatten");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [generating, setGenerating] = useState(false);
  const { file, pdfBytes, pages, loading, error, setError, onFileSelect } =
    useSinglePdfUpload("flatten", analytics);

  const handleGenerate = useCallback(async () => {
    if (!file || !pdfBytes) {
      return;
    }

    setGenerating(true);
    setError(null);
    analytics.trackStart({ pageCount: pages.length });

    try {
      const result = await flattenPdfFormFields(pdfBytes);
      downloadPdfBytes(
        result.pdfBytes,
        buildPdfStudioOutputName({
          toolId: "flatten",
          baseName: `${file.name.replace(/\.pdf$/i, "")}-flattened`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({
        pageCount: pages.length,
        flattenedFieldCount: result.flattenedFieldCount,
      });
    } catch {
      setError("Could not flatten this PDF. Please try again.");
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setGenerating(false);
    }
  }, [analytics, file, pages.length, pdfBytes, setError]);

  if (!file || pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
        <div className="pdf-studio-tool-header text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">Flatten PDF</h1>
          <p className="mt-2 text-sm text-[#666]">
            Flatten interactive form fields into a read-only deliverable.
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
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Flatten PDF</h1>
          <p className="mt-2 text-sm text-[#666]">
            This export is irreversible. Supported browser-safe flattening currently converts AcroForm fields and widget annotations into page content.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Flattening removes form interactivity from the exported PDF. Unsupported non-form annotations and optional layers stay unchanged.
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Exporting..." : "Export flattened PDF"}
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
