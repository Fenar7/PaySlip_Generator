"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import { PdfPageGrid } from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import {
  buildPdfPageDescriptors,
  buildPdfSourceDocument,
  exportPdfFromPageDescriptors,
  rotatePdfPageDescriptors,
  type PdfSourceDocument,
} from "@/features/docs/pdf-studio/utils/pdf-page-operations";
import { readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

export function RotatePagesWorkspace() {
  const analytics = usePdfStudioAnalytics("rotate");
  const [sourceDocument, setSourceDocument] = useState<PdfSourceDocument | null>(null);
  const [pages, setPages] = useState<ReturnType<typeof buildPdfPageDescriptors>>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLabel = useMemo(() => {
    if (selectedIds.size === 0) {
      return "All pages";
    }
    return `${selectedIds.size} selected`;
  }, [selectedIds.size]);

  const handleFile = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await readPdfPages(file, { toolId: "rotate" });
      if (!result.ok) {
        setError(result.error);
        analytics.trackFail({ stage: "upload", reason: result.reason });
        return;
      }

      const nextSourceDocument = buildPdfSourceDocument({
        bytes,
        name: file.name,
        pages: result.data,
        sourceIndex: 0,
      });

      setSourceDocument(nextSourceDocument);
      setPages(buildPdfPageDescriptors([nextSourceDocument]));
      setSelectedIds(new Set());
      analytics.trackUpload({
        fileCount: 1,
        pageCount: result.data.length,
        totalBytes: file.size,
      });
    } catch {
      setError("Failed to read this PDF.");
      analytics.trackFail({ stage: "upload", reason: "pdf-read-failed" });
    } finally {
      setLoading(false);
    }
  }, [analytics]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const rotateSelection = useCallback((delta: 90 | -90) => {
    const targetIds =
      selectedIds.size > 0 ? selectedIds : new Set(pages.map((page) => page.id));
    setPages((prev) => rotatePdfPageDescriptors(prev, targetIds, delta));
    setError(null);
  }, [pages, selectedIds]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(pages.map((page) => page.id)));
  }, [pages]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleClear = useCallback(() => {
    setSourceDocument(null);
    setPages([]);
    setSelectedIds(new Set());
    setError(null);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!sourceDocument || pages.length === 0) {
      return;
    }

    setProcessing(true);
    setError(null);
    analytics.trackStart({
      pageCount: pages.length,
      selectedCount: selectedIds.size,
    });

    try {
      const resultBytes = await exportPdfFromPageDescriptors(pages, [sourceDocument]);
      downloadPdfBytes(
        resultBytes,
        buildPdfStudioOutputName({
          toolId: "rotate",
          baseName: `${sourceDocument.sourceLabel}-rotated`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({
        pageCount: pages.length,
        selectedCount: selectedIds.size,
      });
    } catch {
      setError("Failed to rotate this PDF.");
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setProcessing(false);
    }
  }, [analytics, pages, selectedIds.size, sourceDocument]);

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
          Rotate Pages
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Click thumbnails to target specific pages, rotate the selection or the
          whole document, and download a corrected PDF with the new orientation.
        </p>
      </div>

      {!sourceDocument ? (
        <PdfUploadZone
          onFiles={handleFile}
          toolId="rotate"
          label="Drop your PDF here"
          disabled={loading}
          error={error}
        />
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          Reading PDF pages…
        </p>
      ) : null}

      {sourceDocument && pages.length > 0 ? (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {sourceDocument.name} — {selectedLabel}
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-[var(--muted-foreground)] underline transition-colors hover:text-red-600"
              >
                Change file
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                Select all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                disabled={selectedIds.size === 0}
              >
                Clear selection
              </Button>
              <Button variant="ghost" size="sm" onClick={() => rotateSelection(-90)}>
                Rotate left
              </Button>
              <Button variant="ghost" size="sm" onClick={() => rotateSelection(90)}>
                Rotate right
              </Button>
              <Button onClick={handleDownload} disabled={processing}>
                {processing ? "Rotating…" : "Rotate & Download"}
              </Button>
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-xs text-red-600">{error}</p>
          ) : null}

          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            If no pages are selected, the rotate actions apply to the whole document.
          </p>

          <div className="mt-4">
            <PdfPageGrid
              pages={pages}
              mode="select"
              selectedIds={selectedIds}
              onToggleSelect={toggleSelection}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
