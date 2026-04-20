"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import {
  PdfPageGrid,
  type PageGridItem,
} from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";
import { readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

const MAX_FILES = 10;
const MAX_TOTAL_PAGES = 200;

interface UploadedPdf {
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

export function MergeWorkspace() {
  const analytics = usePdfStudioAnalytics("merge");
  const [pages, setPages] = useState<PageGridItem[]>([]);
  const [uploadedPdfs, setUploadedPdfs] = useState<UploadedPdf[]>([]);
  const [filename, setFilename] = useState("merged-document");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPageCount = pages.length;

  const handleFiles = useCallback(
    async (files: File[]) => {
      setLoading(true);
      setError(null);

      try {
        const newPdfs: UploadedPdf[] = [];
        const newPages: PageGridItem[] = [];

        for (const file of files) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const result = await readPdfPages(file, { toolId: "merge" });

          if (!result.ok) {
            setError(result.error);
            analytics.trackFail({ stage: "upload", message: result.error });
            setLoading(false);
            return;
          }

          newPdfs.push({
            name: file.name,
            bytes,
            pageCount: result.data.length,
          });

          result.data.forEach((page) => {
            newPages.push({
              ...page,
              id: `${file.name}-${page.pageIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            });
          });
        }

        const allPages = [...pages, ...newPages];
        if (allPages.length > MAX_TOTAL_PAGES) {
          setError(`Total pages exceed ${MAX_TOTAL_PAGES} limit`);
          setLoading(false);
          return;
        }

        setUploadedPdfs((prev) => [...prev, ...newPdfs]);
        setPages(allPages);
        analytics.trackUpload({
          fileCount: files.length,
          pageCount: allPages.length,
          totalBytes: files.reduce((sum, file) => sum + file.size, 0),
        });
      } catch {
        setError("Failed to read one or more PDF files");
        analytics.trackFail({
          stage: "upload",
          message: "Failed to read one or more PDF files",
        });
      } finally {
        setLoading(false);
      }
    },
    [pages, uploadedPdfs.length]
  );

  const handleReorder = useCallback((reordered: PageGridItem[]) => {
    setPages(reordered);
  }, []);

  const handleMerge = useCallback(async () => {
    if (uploadedPdfs.length === 0) return;
    setProcessing(true);
    setError(null);
    analytics.trackStart({
      fileCount: uploadedPdfs.length,
      pageCount: pages.length,
    });

    try {
      const { PDFDocument } = await import("pdf-lib");

      // Build merged doc following grid order
      const mergedDoc = await PDFDocument.create();

      // Create a map of source pdf bytes by name
      const pdfByName = new Map<string, Uint8Array>();
      for (const pdf of uploadedPdfs) {
        pdfByName.set(pdf.name, pdf.bytes);
      }

      for (const page of pages) {
        const srcBytes = pdfByName.get(page.sourcePdfName);
        if (!srcBytes) continue;
        const srcDoc = await PDFDocument.load(srcBytes);
        const [copiedPage] = await mergedDoc.copyPages(srcDoc, [
          page.pageIndex,
        ]);
        mergedDoc.addPage(copiedPage);
      }

      const resultBytes = await mergedDoc.save();
      const name = filename.trim() || "merged-document";
      downloadPdfBytes(
        resultBytes,
        buildPdfStudioOutputName({
          toolId: "merge",
          baseName: name,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({
        fileCount: uploadedPdfs.length,
        pageCount: pages.length,
        output: "pdf",
      });
    } catch {
      setError("Failed to merge PDFs");
      analytics.trackFail({ stage: "process", message: "Failed to merge PDFs" });
    } finally {
      setProcessing(false);
    }
  }, [uploadedPdfs, pages, filename]);

  const handleClear = useCallback(() => {
    setPages([]);
    setUploadedPdfs([]);
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
          Merge PDFs
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Combine multiple PDF files into a single document. Drag to reorder
          pages.
        </p>
      </div>

      <PdfUploadZone
        onFiles={handleFiles}
        toolId="merge"
        multiple
        currentFileCount={uploadedPdfs.length}
        label={
          pages.length > 0 ? "Add more PDFs" : "Drop your PDFs here"
        }
        disabled={loading}
        error={error}
      />

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

      {pages.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {totalPageCount} page{totalPageCount !== 1 ? "s" : ""} from{" "}
                {uploadedPdfs.length} file
                {uploadedPdfs.length !== 1 ? "s" : ""}
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
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Filename"
                className="h-9 w-48 text-sm"
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

          <div className="mt-4">
            <PdfPageGrid
              pages={pages}
              mode="reorder"
              onReorder={handleReorder}
            />
          </div>
        </>
      )}
    </div>
  );
}
