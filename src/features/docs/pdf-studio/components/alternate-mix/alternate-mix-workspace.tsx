"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import { PdfPageGrid } from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { validatePdfStudioCombinedPageCount } from "@/features/docs/pdf-studio/lib/ingestion";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import {
  buildPdfSourceDocument,
  exportPdfFromPageDescriptors,
  interleavePdfPageDescriptors,
  type PdfSourceDocument,
} from "@/features/docs/pdf-studio/utils/pdf-page-operations";
import { getPdfPageCount, readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

export function AlternateMixWorkspace() {
  const analytics = usePdfStudioAnalytics("alternate-mix");
  const [sourceDocuments, setSourceDocuments] = useState<PdfSourceDocument[]>([]);
  const [blockSizesBySource, setBlockSizesBySource] = useState<Record<string, number>>({});
  const [filename, setFilename] = useState("alternated-document");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewPages = useMemo(
    () =>
      interleavePdfPageDescriptors({
        sourceDocuments,
        blockSizesBySource,
      }),
    [blockSizesBySource, sourceDocuments],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      setLoading(true);
      setError(null);

      try {
        const uploadedDocuments: PdfSourceDocument[] = [];
        let projectedPageCount = sourceDocuments.reduce(
          (sum, document) => sum + document.pages.length,
          0,
        );

        for (const [fileIndex, file] of files.entries()) {
          const pageCountResult = await getPdfPageCount(file);
          if (!pageCountResult.ok) {
            setError(pageCountResult.error);
            analytics.trackFail({ stage: "upload", reason: pageCountResult.reason });
            return;
          }

          projectedPageCount += pageCountResult.pageCount;
          const projectedValidation = validatePdfStudioCombinedPageCount(
            "alternate-mix",
            projectedPageCount,
          );
          if (!projectedValidation.ok) {
            setError(projectedValidation.error);
            analytics.trackFail({ stage: "upload", reason: projectedValidation.reason });
            return;
          }

          const bytes = new Uint8Array(await file.arrayBuffer());
          const result = await readPdfPages(file, { toolId: "alternate-mix" });

          if (!result.ok) {
            setError(result.error);
            analytics.trackFail({ stage: "upload", reason: result.reason });
            return;
          }

          uploadedDocuments.push(
            buildPdfSourceDocument({
              bytes,
              name: file.name,
              pages: result.data,
              sourceIndex: sourceDocuments.length + fileIndex,
            }),
          );
        }

        const nextDocuments = [...sourceDocuments, ...uploadedDocuments];
        const combinedPageCount = nextDocuments.reduce(
          (sum, document) => sum + document.pages.length,
          0,
        );
        const validation = validatePdfStudioCombinedPageCount(
          "alternate-mix",
          combinedPageCount,
        );
        if (!validation.ok) {
          setError(validation.error);
          analytics.trackFail({ stage: "upload", reason: validation.reason });
          return;
        }

        setSourceDocuments(nextDocuments);
        setBlockSizesBySource((current) => ({
          ...current,
          ...Object.fromEntries(
            uploadedDocuments.map((document) => [document.id, 1] as const),
          ),
        }));
        analytics.trackUpload({
          fileCount: uploadedDocuments.length,
          pageCount: combinedPageCount,
          totalBytes: files.reduce((sum, file) => sum + file.size, 0),
        });
      } catch {
        setError("Failed to read one or more PDF files.");
        analytics.trackFail({ stage: "upload", reason: "pdf-read-failed" });
      } finally {
        setLoading(false);
      }
    },
    [analytics, sourceDocuments],
  );

  const handleRemoveSource = useCallback((sourceDocumentId: string) => {
    setSourceDocuments((prev) =>
      prev.filter((document) => document.id !== sourceDocumentId),
    );
    setBlockSizesBySource((prev) => {
      const next = { ...prev };
      delete next[sourceDocumentId];
      return next;
    });
    setError(null);
  }, []);

  const handleBlockSizeChange = useCallback((sourceDocumentId: string, value: string) => {
    const nextValue = Math.max(1, parseInt(value, 10) || 1);
    setBlockSizesBySource((prev) => ({
      ...prev,
      [sourceDocumentId]: nextValue,
    }));
  }, []);

  const handleDownload = useCallback(async () => {
    if (sourceDocuments.length < 2 || previewPages.length === 0) {
      setError("Upload at least two PDFs to alternate and mix pages.");
      return;
    }

    setProcessing(true);
    setError(null);
    analytics.trackStart({
      fileCount: sourceDocuments.length,
      pageCount: previewPages.length,
      pattern: sourceDocuments
        .map((document) => blockSizesBySource[document.id] ?? 1)
        .join("-"),
    });

    try {
      const resultBytes = await exportPdfFromPageDescriptors(
        previewPages,
        sourceDocuments,
      );
      downloadPdfBytes(
        resultBytes,
        buildPdfStudioOutputName({
          toolId: "alternate-mix",
          baseName: filename.trim() || "alternated-document",
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({
        fileCount: sourceDocuments.length,
        pageCount: previewPages.length,
      });
    } catch {
      setError("Failed to alternate and mix PDFs.");
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setProcessing(false);
    }
  }, [analytics, blockSizesBySource, filename, previewPages, sourceDocuments]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="pdf-studio-tool-header mb-6">
        <Link
          href="/app/docs/pdf-studio"
          className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          ← Back to PDF Studio
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Alternate & Mix PDFs
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Set how many pages each source file contributes per turn, preview the
          full interleaved order, and export a deterministic mixed PDF.
        </p>
      </div>

      <PdfUploadZone
        onFiles={handleFiles}
        toolId="alternate-mix"
        multiple
        currentFileCount={sourceDocuments.length}
        label={
          sourceDocuments.length > 0 ? "Add more PDFs to the mix" : "Drop the PDFs to alternate"
        }
        disabled={loading}
        error={error}
      />

      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Reading PDF pages…
        </p>
      ) : null}

      {sourceDocuments.length > 0 ? (
        <>
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="rounded-2xl border border-[var(--border-strong)] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Mixing order
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Files cycle from top to bottom. Each number controls how many
                    pages that file contributes before the next file takes over.
                  </p>
                </div>
                <Input
                  value={filename}
                  onChange={(event) => setFilename(event.target.value)}
                  placeholder="Filename"
                  className="h-9 w-40 text-sm"
                />
              </div>

              <div className="mt-4 space-y-3">
                {sourceDocuments.map((document, index) => (
                  <div
                    key={document.id}
                    className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {index + 1}. {document.sourceLabel}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {document.pages.length} page
                          {document.pages.length !== 1 ? "s" : ""} in source order
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSource(document.id)}
                        className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3">
                      <label className="text-xs font-medium text-[var(--muted-foreground)]">
                        Pages per turn
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={document.pages.length}
                        value={blockSizesBySource[document.id] ?? 1}
                        onChange={(event) =>
                          handleBlockSizeChange(document.id, event.target.value)
                        }
                        className="mt-1 h-10 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm text-[var(--foreground)]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                className="mt-4 w-full"
                onClick={handleDownload}
                disabled={processing || sourceDocuments.length < 2}
              >
                {processing ? "Mixing…" : "Mix & Download"}
              </Button>
              {sourceDocuments.length < 2 ? (
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Upload at least two PDFs to use Alternate & Mix.
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[var(--border-strong)] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">
                    Mixed preview
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    This preview reflects the exact output order the export will use.
                  </p>
                </div>
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  {previewPages.length} output page
                  {previewPages.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="mt-4">
                <PdfPageGrid pages={previewPages} mode="preview" />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
