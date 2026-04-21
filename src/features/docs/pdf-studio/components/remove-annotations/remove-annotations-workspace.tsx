"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { PdfPagePreviewPanel } from "@/features/docs/pdf-studio/components/shared/pdf-page-preview-panel";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import {
  inspectPdfAnnotations,
  removePdfAnnotations,
  type PdfAnnotationGroup,
} from "@/features/docs/pdf-studio/utils/pdf-annotation-tools";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

const GROUP_OPTIONS: Array<{ value: PdfAnnotationGroup; label: string }> = [
  { value: "comments", label: "Comments & notes" },
  { value: "markup", label: "Highlights & text markup" },
  { value: "drawings", label: "Drawing annotations" },
  { value: "links", label: "Links" },
  { value: "widgets", label: "Form widgets" },
  { value: "stamps", label: "Stamps" },
];

export function RemoveAnnotationsWorkspace() {
  const analytics = usePdfStudioAnalytics("remove-annotations");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedGroups, setSelectedGroups] = useState<PdfAnnotationGroup[]>(["comments", "markup"]);
  const [annotationSummary, setAnnotationSummary] = useState<Array<{ subtype: string; count: number }>>([]);
  const [generating, setGenerating] = useState(false);
  const { file, pdfBytes, pages, loading, error, setError, onFileSelect } =
    useSinglePdfUpload("remove-annotations", analytics);

  useEffect(() => {
    if (!pdfBytes) {
      setAnnotationSummary([]);
      return;
    }

    void inspectPdfAnnotations(pdfBytes).then(setAnnotationSummary);
  }, [pdfBytes]);

  const handleGenerate = useCallback(async () => {
    if (!file || !pdfBytes) {
      return;
    }

    setGenerating(true);
    setError(null);
    analytics.trackStart({ pageCount: pages.length });

    try {
      const result = await removePdfAnnotations(pdfBytes, selectedGroups);
      downloadPdfBytes(
        result.pdfBytes,
        buildPdfStudioOutputName({
          toolId: "remove-annotations",
          baseName: `${file.name.replace(/\.pdf$/i, "")}-clean`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({
        pageCount: pages.length,
        annotationCount: result.removedCount,
      });
    } catch {
      setError("Could not remove annotations from this PDF. Please try again.");
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setGenerating(false);
    }
  }, [analytics, file, pages.length, pdfBytes, selectedGroups, setError]);

  if (!file || pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
        <div className="pdf-studio-tool-header text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">Remove Annotations</h1>
          <p className="mt-2 text-sm text-[#666]">
            Strip selected annotation types while keeping the underlying pages intact.
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
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Remove Annotations</h1>
          <p className="mt-2 text-sm text-[#666]">
            Select the annotation groups to strip. If a type is not listed below, it will stay in the output.
          </p>
        </div>

        {GROUP_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-[#444]">
            <input
              type="checkbox"
              checked={selectedGroups.includes(option.value)}
              onChange={(event) =>
                setSelectedGroups((current) =>
                  event.target.checked
                    ? [...current, option.value]
                    : current.filter((value) => value !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}

        <div className="rounded-xl border border-[#eee] bg-[#fafafa] px-4 py-3 text-sm">
          <p className="font-medium text-[#1a1a1a]">Detected annotations</p>
          <div className="mt-2 space-y-2">
            {annotationSummary.length === 0 ? (
              <p className="text-[#666]">No annotations detected.</p>
            ) : (
              annotationSummary.map((item) => (
                <div key={item.subtype} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                  <span>{item.subtype}</span>
                  <span className="text-[#666]">{item.count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button onClick={handleGenerate} disabled={selectedGroups.length === 0 || generating}>
          {generating ? "Exporting..." : "Export cleaned PDF"}
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
