"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import {
  PdfPageGrid,
  type PageGridItem,
} from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { validatePdfStudioCombinedPageCount } from "@/features/docs/pdf-studio/lib/ingestion";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import {
  buildPdfPageDescriptors,
  buildPdfSourceDocument,
  exportPdfFromPageDescriptors,
  type PdfPageDescriptor,
  type PdfSourceDocument,
} from "@/features/docs/pdf-studio/utils/pdf-page-operations";
import { getPdfPageCount, readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

export function MergeWorkspace() {
  const analytics = usePdfStudioAnalytics("merge");
  const [pages, setPages] = useState<PageGridItem[]>([]);
  const [sourceDocuments, setSourceDocuments] = useState<PdfSourceDocument[]>([]);
  const [filename, setFilename] = useState("merged-document");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setLoading(true);
      setError(null);

      try {
        const uploadedDocuments: PdfSourceDocument[] = [];
        let projectedPageCount = pages.length;

        for (const [fileIndex, file] of files.entries()) {
          const pageCountResult = await getPdfPageCount(file);
          if (!pageCountResult.ok) {
            setError(pageCountResult.error);
            analytics.trackFail({ stage: "upload", reason: pageCountResult.reason });
            return;
          }

          projectedPageCount += pageCountResult.pageCount;
          const projectedValidation = validatePdfStudioCombinedPageCount(
            "merge",
            projectedPageCount,
          );
          if (!projectedValidation.ok) {
            setError(projectedValidation.error);
            analytics.trackFail({ stage: "upload", reason: projectedValidation.reason });
            return;
          }

          const bytes = new Uint8Array(await file.arrayBuffer());
          const result = await readPdfPages(file, { toolId: "merge" });

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
        const nextPages = [...pages, ...buildPdfPageDescriptors(uploadedDocuments)];
        const pageValidation = validatePdfStudioCombinedPageCount("merge", nextPages.length);
        if (!pageValidation.ok) {
          setError(pageValidation.error);
          analytics.trackFail({ stage: "upload", reason: pageValidation.reason });
          return;
        }

        setSourceDocuments(nextDocuments);
        setPages(nextPages);
        analytics.trackUpload({
          fileCount: uploadedDocuments.length,
          pageCount: nextPages.length,
          totalBytes: files.reduce((sum, file) => sum + file.size, 0),
        });
      } catch {
        setError("Failed to read one or more PDF files.");
        analytics.trackFail({
          stage: "upload",
          reason: "pdf-read-failed",
        });
      } finally {
        setLoading(false);
      }
    },
    [analytics, pages, sourceDocuments],
  );

  const handleReorder = useCallback((reordered: PageGridItem[]) => {
    setPages(reordered);
  }, []);

  const handleRemoveSource = useCallback((sourceDocumentId: string) => {
    setSourceDocuments((prev) =>
      prev.filter((document) => document.id !== sourceDocumentId),
    );
    setPages((prev) =>
      prev.filter((page) => page.sourceDocumentId !== sourceDocumentId),
    );
    setError(null);
  }, []);

  const handleMerge = useCallback(async () => {
    if (sourceDocuments.length === 0 || pages.length === 0) {
      return;
    }

    setProcessing(true);
    setError(null);
    analytics.trackStart({
      fileCount: sourceDocuments.length,
      pageCount: pages.length,
    });

    try {
      const orderedPages: PdfPageDescriptor[] = pages.map((page) => ({
        ...page,
        originalPageNumber: page.originalPageNumber ?? page.pageIndex + 1,
        rotation: page.rotation ?? 0,
        sourceDocumentId: page.sourceDocumentId ?? "source-document",
        sourceLabel: page.sourceLabel ?? page.sourcePdfName,
      }));
      const resultBytes = await exportPdfFromPageDescriptors(
        orderedPages,
        sourceDocuments,
      );
      const resolvedFilename = filename.trim() || "merged-document";

      downloadPdfBytes(
        resultBytes,
        buildPdfStudioOutputName({
          toolId: "merge",
          baseName: resolvedFilename,
          extension: "pdf",
        }),
      );

      analytics.trackSuccess({
        fileCount: sourceDocuments.length,
        pageCount: pages.length,
      });
    } catch {
      setError("Failed to merge PDFs.");
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setProcessing(false);
    }
  }, [analytics, filename, pages, sourceDocuments]);

  const handleClear = useCallback(() => {
    setPages([]);
    setSourceDocuments([]);
    setFilename("merged-document");
    setError(null);
  }, []);

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
          Merge PDFs
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Combine multiple PDFs into one document, keep the source files labeled
          in the preview, and drag pages into the exact final order before you
          export.
        </p>
      </div>

      <PdfUploadZone
        onFiles={handleFiles}
        toolId="merge"
        multiple
        currentFileCount={sourceDocuments.length}
        label={pages.length > 0 ? "Add more PDFs" : "Drop your PDFs here"}
        disabled={loading}
        error={error}
      />

      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Reading PDF pages…
        </p>
      ) : null}

      {pages.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {pages.length} page{pages.length !== 1 ? "s" : ""} from{" "}
                {sourceDocuments.length} file
                {sourceDocuments.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-[var(--muted-foreground)] underline transition-colors hover:text-red-600"
              >
                Clear all
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Input
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                placeholder="Filename"
                className="h-9 w-52 text-sm"
              />
              <Button
                onClick={handleMerge}
                disabled={processing || pages.length === 0}
                size="md"
              >
                {processing ? "Merging…" : "Merge & Download"}
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {sourceDocuments.map((document) => (
              <div
                key={document.id}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
              >
                <span className="font-medium">{document.sourceLabel}</span>
                <span className="text-[var(--muted-foreground)]">
                  {document.pages.length} page
                  {document.pages.length !== 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSource(document.id)}
                  className="text-[var(--muted-foreground)] transition-colors hover:text-red-600"
                  aria-label={`Remove ${document.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            Drag pages to reorder them. The source badge under each thumbnail
            shows which uploaded file that page came from.
          </p>

          <div className="mt-4">
            <PdfPageGrid
              pages={pages}
              mode="reorder"
              onReorder={handleReorder}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
