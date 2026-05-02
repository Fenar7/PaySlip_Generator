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

  // Explicit scope: whether rotate actions target the selection or the whole document.
  const rotateScope = useMemo<"selection" | "all">(() => {
    return selectedIds.size > 0 ? "selection" : "all";
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
          Select individual pages to rotate, or leave nothing selected to rotate
          the entire document. Download when the orientation looks correct.
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
          {/* File + selection controls */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {sourceDocument.name}
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
            </div>
          </div>

          {/* Scope indicator — primary UX signal for what will rotate */}
          <RotateScopeIndicator
            scope={rotateScope}
            selectedCount={selectedIds.size}
            totalCount={pages.length}
            onRotateLeft={() => rotateSelection(-90)}
            onRotateRight={() => rotateSelection(90)}
          />

          {error ? (
            <p className="mt-3 text-xs text-red-600">{error}</p>
          ) : null}

          {/* Download */}
          <div className="mt-4 flex items-center justify-end">
            <Button onClick={handleDownload} disabled={processing}>
              {processing ? "Exporting…" : "Download rotated PDF"}
            </Button>
          </div>

          {/* Page grid */}
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

interface RotateScopeIndicatorProps {
  scope: "selection" | "all";
  selectedCount: number;
  totalCount: number;
  onRotateLeft: () => void;
  onRotateRight: () => void;
}

function RotateScopeIndicator({
  scope,
  selectedCount,
  totalCount,
  onRotateLeft,
  onRotateRight,
}: RotateScopeIndicatorProps) {
  const isAllDoc = scope === "all";

  return (
    <div
      data-testid="rotate-scope-indicator"
      className={
        isAllDoc
          ? "mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
          : "mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--accent-soft,rgba(220,38,38,0.15))] bg-[var(--surface-soft)] px-4 py-3"
      }
    >
      <div className="flex items-center gap-2">
        {isAllDoc ? (
          <svg
            className="h-4 w-4 flex-shrink-0 text-amber-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 flex-shrink-0 text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )}
        <span
          className={
            isAllDoc
              ? "text-sm font-medium text-amber-800"
              : "text-sm font-medium text-[var(--foreground)]"
          }
          data-testid="rotate-scope-label"
        >
          {isAllDoc
            ? `No pages selected — rotating entire document (${totalCount} pages)`
            : `${selectedCount} of ${totalCount} page${selectedCount !== 1 ? "s" : ""} selected — rotating selected pages only`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRotateLeft}>
          ↺ Rotate left
        </Button>
        <Button variant="outline" size="sm" onClick={onRotateRight}>
          ↻ Rotate right
        </Button>
      </div>
    </div>
  );
}
