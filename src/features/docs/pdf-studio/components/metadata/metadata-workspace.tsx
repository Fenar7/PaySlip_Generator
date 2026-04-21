"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import {
  diffPdfMetadata,
  readPdfMetadata,
  updatePdfMetadata,
  type PdfMetadataSnapshot,
} from "@/features/docs/pdf-studio/utils/pdf-metadata";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

const EMPTY_METADATA: PdfMetadataSnapshot = {
  title: "",
  author: "",
  subject: "",
  keywords: "",
  creator: "",
  producer: "",
};

export function MetadataWorkspace() {
  const analytics = usePdfStudioAnalytics("metadata");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentMetadata, setCurrentMetadata] =
    useState<PdfMetadataSnapshot>(EMPTY_METADATA);
  const [draftMetadata, setDraftMetadata] =
    useState<PdfMetadataSnapshot>(EMPTY_METADATA);
  const [generating, setGenerating] = useState(false);
  const { file, pdfBytes, pages, loading, error, setError, onFileSelect } =
    useSinglePdfUpload("metadata", analytics);

  useEffect(() => {
    if (!pdfBytes) {
      setCurrentMetadata(EMPTY_METADATA);
      setDraftMetadata(EMPTY_METADATA);
      return;
    }

    void readPdfMetadata(pdfBytes).then(({ metadata }) => {
      setCurrentMetadata(metadata);
      setDraftMetadata(metadata);
    });
  }, [pdfBytes]);

  const handleGenerate = useCallback(async () => {
    if (!file || !pdfBytes) {
      return;
    }

    setGenerating(true);
    setError(null);
    analytics.trackStart({ pageCount: pages.length });

    try {
      const result = await updatePdfMetadata(pdfBytes, draftMetadata);
      downloadPdfBytes(
        result,
        buildPdfStudioOutputName({
          toolId: "metadata",
          baseName: `${file.name.replace(/\.pdf$/i, "")}-metadata`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({ pageCount: pages.length });
    } catch {
      setError("Could not update metadata for this PDF. Please try again.");
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setGenerating(false);
    }
  }, [analytics, draftMetadata, file, pages.length, pdfBytes, setError]);

  const changes = diffPdfMetadata(currentMetadata, draftMetadata);

  if (!file || !pdfBytes) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
        <div className="pdf-studio-tool-header text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">Edit Metadata</h1>
          <p className="mt-2 text-sm text-[#666]">
            Review current PDF properties, edit the supported fields, and export a clean copy.
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
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr,360px]">
      <div className="rounded-2xl border border-[#e5e5e5] bg-white p-5">
        <div className="pdf-studio-tool-header">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Edit Metadata</h1>
          <p className="mt-2 text-sm text-[#666]">
            Only the fields below are updated. Exported PDFs preserve unchanged properties.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(Object.keys(draftMetadata) as Array<keyof PdfMetadataSnapshot>).map((key) => (
            <label key={key} className="block text-sm font-medium text-[#1a1a1a]">
              {key.charAt(0).toUpperCase() + key.slice(1)}
              <input
                className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
                value={draftMetadata[key]}
                onChange={(event) =>
                  setDraftMetadata((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <p className="mt-4 text-sm text-[#666]">
          Keyword separators can be normalized by the PDF library on export, so review the final file properties if exact punctuation matters for your workflow.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-5">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <div className="rounded-xl border border-[#eee] bg-[#fafafa] px-4 py-3 text-sm">
          <p className="font-medium text-[#1a1a1a]">Preview changes</p>
          <div className="mt-2 space-y-2">
            {changes.map((item) => (
              <div key={item.key} className="rounded-lg border border-[#eee] bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#666]">{item.key}</div>
                <div className="mt-1 text-xs text-[#666]">Current: {item.current || "—"}</div>
                <div className="text-sm text-[#1a1a1a]">Export: {item.next || "—"}</div>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? "Exporting..." : "Export updated PDF"}
        </Button>
      </div>
    </div>
  );
}
