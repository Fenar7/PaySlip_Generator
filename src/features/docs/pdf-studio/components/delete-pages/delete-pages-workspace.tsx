"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import {
  PdfPageGrid,
  type PageGridItem,
} from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";
import { readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import { deletePages } from "@/features/docs/pdf-studio/utils/pdf-splitter";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

export function DeletePagesWorkspace() {
  const [pages, setPages] = useState<PageGridItem[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<Set<string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingCount = pages.length - deletedIds.size;

  const handleFile = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await readPdfPages(file, 200);

      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const gridPages = result.data.map((p) => ({
        ...p,
        id: `page-${p.pageIndex}`,
      }));

      setPdfBytes(bytes);
      setPdfName(file.name.replace(/\.pdf$/i, ""));
      setPages(gridPages);
      setDeletedIds(new Set());
      setUndoStack([]);
    } catch {
      setError("Failed to read PDF");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleDelete = useCallback(
    (id: string) => {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          // Don't allow deleting all pages
          if (pages.length - next.size <= 1) {
            setError("At least one page must remain");
            return prev;
          }
          next.add(id);
          setError(null);
        }
        setUndoStack((stack) => [...stack, prev]);
        return next;
      });
    },
    [pages.length]
  );

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setDeletedIds(prev);
      return stack.slice(0, -1);
    });
    setError(null);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!pdfBytes) return;
    setProcessing(true);
    setError(null);

    try {
      const pagesToDelete = pages
        .filter((p) => deletedIds.has(p.id))
        .map((p) => p.pageIndex);

      if (pagesToDelete.length === 0) {
        downloadPdfBytes(pdfBytes, `${pdfName}.pdf`);
        setProcessing(false);
        return;
      }

      const result = await deletePages(pdfBytes, pagesToDelete);
      if (!result.ok) {
        setError(result.error);
        setProcessing(false);
        return;
      }
      downloadPdfBytes(result.data, `${pdfName}-cleaned.pdf`);
    } catch {
      setError("Failed to process PDF");
    } finally {
      setProcessing(false);
    }
  }, [pdfBytes, deletedIds, pages, pdfName]);

  const handleClear = useCallback(() => {
    setPages([]);
    setPdfBytes(null);
    setPdfName("");
    setDeletedIds(new Set());
    setUndoStack([]);
    setError(null);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/app/docs/pdf-studio"
          className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          ← Back to PDF Studio
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Delete Pages
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Click on pages to mark them for deletion. Download the cleaned PDF.
        </p>
      </div>

      {!pdfBytes && (
        <PdfUploadZone
          onFiles={handleFile}
          label="Drop your PDF here"
          disabled={loading}
          error={error}
        />
      )}

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Reading PDF pages…
        </div>
      )}

      {pdfBytes && pages.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {pdfName}.pdf — {remainingCount} of {pages.length} page
                {pages.length !== 1 ? "s" : ""} remaining
              </span>
              {deletedIds.size > 0 && (
                <span className="text-xs text-red-600">
                  {deletedIds.size} marked for deletion
                </span>
              )}
              <button
                onClick={handleClear}
                className="text-xs text-[var(--muted-foreground)] underline transition-colors hover:text-red-600"
              >
                Change file
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={undoStack.length === 0}
              >
                Undo
              </Button>
              <Button
                onClick={handleDownload}
                disabled={processing}
                size="md"
              >
                {processing ? "Processing…" : "Download PDF"}
              </Button>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-600">{error}</p>
          )}

          <div className="mt-4">
            <PdfPageGrid
              pages={pages}
              mode="delete"
              deletedIds={deletedIds}
              onToggleSelect={toggleDelete}
            />
          </div>
        </>
      )}
    </div>
  );
}
