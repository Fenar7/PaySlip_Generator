"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import {
  PdfPageGrid,
  type PageGridItem,
} from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";
import { readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import { PDFDocument, degrees } from "pdf-lib";

export function OrganizeWorkspace() {
  const analytics = usePdfStudioAnalytics("organize");
  const [pages, setPages] = useState<PageGridItem[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await readPdfPages(file, { toolId: "organize" });

      if (!result.ok) {
        setError(result.error);
        analytics.trackFail({ stage: "upload", message: result.error });
        setLoading(false);
        return;
      }

      const gridPages = result.data.map((p) => ({
        ...p,
        id: `page-${p.pageIndex}`,
        rotation: 0,
      }));

      setPdfBytes(bytes);
      setPdfName(file.name.replace(/\.pdf$/i, ""));
      setPages(gridPages);
      analytics.trackUpload({
        fileCount: 1,
        pageCount: gridPages.length,
        totalBytes: file.size,
      });
    } catch {
      setError("Failed to read PDF");
      analytics.trackFail({ stage: "upload", message: "Failed to read PDF" });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReorder = useCallback((reordered: PageGridItem[]) => {
    setPages(reordered);
  }, []);

  const handleRotate = useCallback((id: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, rotation: ((p.rotation ?? 0) + 90) % 360 }
          : p
      )
    );
  }, []);

  const handleDeletePage = useCallback((id: string) => {
    setPages((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const handleDownload = useCallback(async () => {
    if (!pdfBytes || pages.length === 0) return;
    setProcessing(true);
    setError(null);
    analytics.trackStart({ pageCount: pages.length });

    try {
      const srcDoc = await PDFDocument.load(pdfBytes);
      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(
        srcDoc,
        pages.map((p) => p.pageIndex)
      );

      copiedPages.forEach((page, i) => {
        const rotation = pages[i].rotation ?? 0;
        if (rotation !== 0) {
          page.setRotation(degrees(rotation));
        }
        newDoc.addPage(page);
      });

      const resultBytes = await newDoc.save();
      downloadPdfBytes(
        resultBytes,
        buildPdfStudioOutputName({
          toolId: "organize",
          baseName: `${pdfName}-organized`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({ pageCount: pages.length });
    } catch {
      setError("Failed to organize PDF");
      analytics.trackFail({ stage: "process", message: "Failed to organize PDF" });
    } finally {
      setProcessing(false);
    }
  }, [pdfBytes, pages, pdfName]);

  const handleClear = useCallback(() => {
    setPages([]);
    setPdfBytes(null);
    setPdfName("");
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
          Organize Pages
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Drag to reorder, rotate, or remove individual pages.
        </p>
      </div>

      {!pdfBytes && (
        <PdfUploadZone
          onFiles={handleFile}
          toolId="organize"
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
                {pdfName}.pdf — {pages.length} page
                {pages.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-[var(--muted-foreground)] underline transition-colors hover:text-red-600"
              >
                Change file
              </button>
            </div>
            <Button
              onClick={handleDownload}
              disabled={processing}
              size="md"
            >
              {processing ? "Processing…" : "Download PDF"}
            </Button>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-600">{error}</p>
          )}

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
      )}
    </div>
  );
}
