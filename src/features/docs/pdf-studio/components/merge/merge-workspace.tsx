"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  loadMergeSession,
  saveMergeSession,
  clearMergeSession,
  buildMergeRestoreMessage,
  type MergeSessionPage,
  type MergeSessionSource,
} from "@/features/docs/pdf-studio/utils/merge-session-storage";

const GRIPPER_SVG = (
  <svg className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="4" r="1.2" />
    <circle cx="15" cy="4" r="1.2" />
    <circle cx="9" cy="9" r="1.2" />
    <circle cx="15" cy="9" r="1.2" />
    <circle cx="9" cy="14" r="1.2" />
    <circle cx="15" cy="14" r="1.2" />
  </svg>
);

export function MergeWorkspace() {
  const analytics = usePdfStudioAnalytics("merge");
  const [pages, setPages] = useState<PageGridItem[]>([]);
  const [sourceDocuments, setSourceDocuments] = useState<PdfSourceDocument[]>([]);
  const [filename, setFilename] = useState("merged-document");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | undefined>(undefined);
  const [hasHydratedSession, setHasHydratedSession] = useState(false);

  const sourceIdsInOrder = useMemo(
    () => {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const page of pages) {
        if (page.sourceDocumentId && !seen.has(page.sourceDocumentId)) {
          seen.add(page.sourceDocumentId);
          result.push(page.sourceDocumentId);
        }
      }
      return result;
    },
    [pages],
  );

  // ── Session hydration ──────────────────────────────────────────────
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const session = loadMergeSession();
      if (session && session.pages.length > 0) {
        const restoredSourceMap = new Map(
          session.sources.map((s) => [s.id, s]),
        );

        const restoredPages: PageGridItem[] = session.pages
          .filter((p) => restoredSourceMap.has(p.sourceDocumentId))
          .map((p) => ({
            id: p.id,
            pageIndex: p.pageIndex,
            originalPageNumber: p.originalPageNumber,
            rotation: p.rotation,
            sourceDocumentId: p.sourceDocumentId,
            sourceLabel: p.sourceLabel,
            sourcePdfName: p.sourcePdfName,
            // Preview images are not persisted — source files must be re-uploaded
            previewUrl: "",
            previewBytes: 0,
            widthPt: 612,
            heightPt: 792,
          }));

        if (restoredPages.length > 0) {
          setPages(restoredPages);
          if (session.filename) setFilename(session.filename);

          // Reconstruct source metadata for labels/chips
          const restoredSources = session.sources.map((s) => ({
            id: s.id,
            name: s.name,
            bytes: new Uint8Array(0),
            pages: [],
            sourceLabel: s.sourceLabel,
          }));
          setSourceDocuments(restoredSources as unknown as PdfSourceDocument[]);

          setSessionStatus(
            buildMergeRestoreMessage(
              restoredPages.length,
              session.sources.length,
            ),
          );
        }
      }

      setHasHydratedSession(true);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  // ── Session auto-save ──────────────────────────────────────────────
  useEffect(() => {
    if (!hasHydratedSession) return;

    const timeout = window.setTimeout(() => {
      if (pages.length === 0) return;
      const sessionPages: MergeSessionPage[] = pages.map((p) => ({
        id: p.id,
        pageIndex: p.pageIndex,
        originalPageNumber: p.originalPageNumber ?? p.pageIndex + 1,
        rotation: p.rotation ?? 0,
        sourceDocumentId: p.sourceDocumentId ?? "",
        sourceLabel: p.sourceLabel ?? "",
        sourcePdfName: p.sourcePdfName ?? "",
        previewUrl: p.previewUrl,
      }));
      const sessionSources: MergeSessionSource[] = sourceDocuments.map((s) => ({
        id: s.id,
        name: s.name,
        sourceLabel: s.sourceLabel,
        pageCount: s.pages.length,
      }));
      saveMergeSession(sessionPages, sessionSources, filename);
    }, 600);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasHydratedSession, pages, sourceDocuments, filename]);

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
        clearMergeSession();
        setSessionStatus(undefined);
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

  const handleRotate = useCallback((id: string) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === id
          ? { ...page, rotation: ((page.rotation ?? 0) + 90) % 360 }
          : page,
      ),
    );
  }, []);

  const handleDeletePage = useCallback((id: string) => {
    setPages((prev) => prev.filter((page) => page.id !== id));
    setError(null);
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

  /**
   * Move all pages from a given source document up or down in the page order.
   * When a source is moved, all its pages shift together as a contiguous block.
   */
  const handleMoveSource = useCallback(
    (sourceDocumentId: string, direction: "up" | "down") => {
      setPages((prev) => {
        const sourcePageIds = new Set(
          prev.filter((p) => p.sourceDocumentId === sourceDocumentId).map((p) => p.id),
        );
        const nonSourcePages = prev.filter((p) => !sourcePageIds.has(p.id));
        const sourcePages = prev.filter((p) => sourcePageIds.has(p.id));

        if (sourcePages.length === 0) return prev;

        // Find the boundary indices
        const firstSourceIdx = prev.findIndex((p) => sourcePageIds.has(p.id));
        const lastSourceIdx = prev.findLastIndex((p) => sourcePageIds.has(p.id));

        if (direction === "up" && firstSourceIdx > 0) {
          // Insert source pages before the non-source page above
          const aboveId = prev[firstSourceIdx - 1].id;
          const aboveIdxInNonSource = nonSourcePages.findIndex((p) => p.id === aboveId);
          const reordered = [...nonSourcePages];
          reordered.splice(aboveIdxInNonSource, 0, ...sourcePages);
          return reordered;
        }

        if (direction === "down" && lastSourceIdx < prev.length - 1) {
          // Insert source pages after the non-source page below
          const belowId = prev[lastSourceIdx + 1].id;
          const belowIdxInNonSource = nonSourcePages.findIndex((p) => p.id === belowId);
          const reordered = [...nonSourcePages];
          reordered.splice(belowIdxInNonSource + 1, 0, ...sourcePages);
          return reordered;
        }

        return prev;
      });
    },
    [],
  );

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
      // Export must be driven by visible workspace state — page order, rotations, removals
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
    setSessionStatus(undefined);
    clearMergeSession();
  }, []);

  const hasRotatedPages = useMemo(
    () => pages.some((p) => (p.rotation ?? 0) !== 0),
    [pages],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="pdf-studio-tool-header mb-6">
        <Link
          href="/app/docs/pdf-studio"
          className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          &larr; Back to PDF Studio
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Merge PDFs
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Combine multiple PDFs into one document. Reorder pages by dragging, rotate individual pages, delete unwanted pages, and move whole source files up or down in the merge order — all before export.
        </p>
      </div>

      {sessionStatus ? (
        <div className="mb-4 rounded-xl border border-[var(--border-soft)] bg-white px-5 py-3 text-sm text-[var(--foreground-soft)] shadow-[var(--shadow-soft)]">
          {sessionStatus}
        </div>
      ) : null}

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
          Reading PDF pages&hellip;
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
              {hasRotatedPages ? (
                <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-2 py-0.5 text-[0.65rem] text-[var(--muted-foreground)]">
                  Rotations applied
                </span>
              ) : null}
              <button
                onClick={handleClear}
                className="text-xs text-[var(--muted-foreground)] underline transition-colors hover:text-red-600"
              >
                Clear all
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  File Name
                </span>
                <Input
                  value={filename}
                  onChange={(event) => setFilename(event.target.value)}
                  placeholder="merged-document"
                  className="h-9 w-52 text-sm"
                />
              </label>
              <Button
                onClick={handleMerge}
                disabled={processing || pages.length === 0}
                size="md"
              >
                {processing ? "Merging\u2026" : "Merge &amp; Download"}
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {/* Source file chips with move-up/move-down controls */}
            {sourceIdsInOrder.map((sourceId) => {
              const doc = sourceDocuments.find((d) => d.id === sourceId);
              if (!doc) return null;
              const isFirst = sourceIdsInOrder.indexOf(sourceId) === 0;
              const isLast = sourceIdsInOrder.indexOf(sourceId) === sourceIdsInOrder.length - 1;
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-white px-3 py-1.5"
                >
                  <div className="flex shrink-0 flex-col items-center gap-0">
                    <button
                      type="button"
                      onClick={() => handleMoveSource(doc.id, "up")}
                      disabled={isFirst}
                      className="flex h-4 w-4 items-center justify-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-30"
                      aria-label={`Move ${doc.sourceLabel} up`}
                      title={`Move ${doc.sourceLabel} up`}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSource(doc.id, "down")}
                      disabled={isLast}
                      className="flex h-4 w-4 items-center justify-center text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-30"
                      aria-label={`Move ${doc.sourceLabel} down`}
                      title={`Move ${doc.sourceLabel} down`}
                    >
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                  </div>
                  <span className="shrink-0" aria-hidden>{GRIPPER_SVG}</span>
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {doc.sourceLabel}
                  </span>
                  <span className="text-[0.65rem] text-[var(--muted-foreground)]">
                    {doc.pages.length} page
                    {doc.pages.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSource(doc.id)}
                    className="ml-auto text-[var(--muted-foreground)] transition-colors hover:text-red-600"
                    aria-label={`Remove ${doc.name}`}
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3.5 py-2.5 text-xs leading-5 text-[var(--muted-foreground)]">
            <p className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 2 7l10 5 10-5-10-5z" />
                <path d="M2 17 12 22l10-5" />
                <path d="M2 12 12 17l10-5" />
              </svg>
              Drag any page thumbnail to reorder it. Use the arrows above each source file to move all its pages together. Hover over a page to rotate or delete it.
            </p>
          </div>

          <div className="mt-4">
            <PdfPageGrid
              pages={pages}
              mode="reorder"
              onReorder={handleReorder}
              onRotate={handleRotate}
              onDeletePage={handleDeletePage}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
