"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import {
  PdfPageGrid,
  type PageGridItem,
} from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";
import { SplitPlanPreview } from "@/features/docs/pdf-studio/components/split/split-plan-preview";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import {
  buildPdfStudioOutputName,
  buildPdfStudioSegmentName,
  getPdfStudioSourceBaseName,
} from "@/features/docs/pdf-studio/lib/output";
import { readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import {
  parseRangeString,
  splitByPageGroups,
} from "@/features/docs/pdf-studio/utils/pdf-splitter";
import {
  planSplitByRanges,
  type PdfSplitPlan,
} from "@/features/docs/pdf-studio/utils/pdf-split-planner";
import {
  buildZip,
  downloadBlob,
  downloadPdfBytes,
} from "@/features/docs/pdf-studio/utils/zip-builder";

type ExtractMode = "selection" | "ranges";

export function ExtractPagesWorkspace() {
  const analytics = usePdfStudioAnalytics("extract-pages");
  const [pages, setPages] = useState<PageGridItem[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [extractMode, setExtractMode] = useState<ExtractMode>("selection");
  const [rangeStr, setRangeStr] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo<PdfSplitPlan>(() => {
    if (extractMode === "selection") {
      const selectedPages = pages.filter((page) => selectedIds.has(page.id));
      if (selectedPages.length === 0) {
        return {
          segments: [],
          warning: "Select one or more pages to extract.",
        };
      }

      return {
        segments: [
          {
            id: "selection",
            label: "Selected pages",
            startPage: selectedPages[0].originalPageNumber ?? selectedPages[0].pageIndex + 1,
            endPage:
              selectedPages[selectedPages.length - 1].originalPageNumber ??
              selectedPages[selectedPages.length - 1].pageIndex + 1,
            pageIndices: selectedPages.map((page) => page.pageIndex),
            reason: "range",
            detail: `${selectedPages.length} page${selectedPages.length !== 1 ? "s" : ""} will be copied into one new PDF.`,
          },
        ],
      };
    }

    if (!rangeStr.trim()) {
      return {
        segments: [],
        warning: "Enter one or more ranges to preview extracted outputs.",
      };
    }

    const parsed = parseRangeString(rangeStr, pages.length);
    if (!parsed.ok) {
      return {
        segments: [],
        warning: parsed.error,
      };
    }

    return planSplitByRanges(parsed.ranges, pages.length);
  }, [extractMode, pages, rangeStr, selectedIds]);

  const handleFile = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await readPdfPages(file, { toolId: "extract-pages" });
      if (!result.ok) {
        setError(result.error);
        analytics.trackFail({ stage: "upload", reason: result.reason });
        return;
      }

      const nextPages = result.data.map((page) => ({
        ...page,
        id: `page-${page.pageIndex}`,
        originalPageNumber: page.pageIndex + 1,
        sourceLabel: getPdfStudioSourceBaseName(file.name, "document"),
        sourceDocumentId: "source-document",
      }));

      setPdfBytes(bytes);
      setPdfName(file.name.replace(/\.pdf$/iu, ""));
      setPages(nextPages);
      setSelectedIds(new Set());
      setRangeStr("");
      analytics.trackUpload({
        fileCount: 1,
        pageCount: nextPages.length,
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

  const handleDownload = useCallback(async () => {
    if (!pdfBytes) {
      return;
    }

    if (plan.segments.length === 0) {
      setError(plan.warning ?? "Nothing to extract yet.");
      return;
    }

    setProcessing(true);
    setError(null);
    analytics.trackStart({
      pageCount: pages.length,
      mode: extractMode,
      outputCount: plan.segments.length,
    });

    try {
      const result = await splitByPageGroups(
        pdfBytes,
        plan.segments.map((segment) => segment.pageIndices),
      );
      if (!result.ok) {
        setError(result.error);
        analytics.trackFail({ stage: "process", reason: "processing-failed" });
        return;
      }

      if (result.data.length === 1) {
        downloadPdfBytes(
          result.data[0],
          buildPdfStudioSegmentName({
            toolId: "extract-pages",
            baseName: `${pdfName}-extract`,
            startPage: plan.segments[0].startPage,
            endPage: plan.segments[0].endPage,
            totalPages: pages.length,
            label: extractMode === "selection" ? "selected-pages" : undefined,
            extension: "pdf",
          }),
        );
      } else {
        const zip = buildZip(
          result.data.map((data, index) => ({
            name: buildPdfStudioSegmentName({
              toolId: "extract-pages",
              baseName: `${pdfName}-extract`,
              startPage: plan.segments[index].startPage,
              endPage: plan.segments[index].endPage,
              totalPages: pages.length,
              extension: "pdf",
            }),
            data,
          })),
        );
        downloadBlob(
          zip,
          buildPdfStudioOutputName({
            toolId: "extract-pages",
            baseName: `${pdfName}-extract`,
            extension: "zip",
          }),
        );
      }

      analytics.trackSuccess({
        pageCount: pages.length,
        mode: extractMode,
        outputCount: plan.segments.length,
      });
    } catch {
      setError("Failed to extract pages.");
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setProcessing(false);
    }
  }, [analytics, extractMode, pages.length, pdfBytes, pdfName, plan]);

  const handleClear = useCallback(() => {
    setPages([]);
    setPdfBytes(null);
    setPdfName("");
    setRangeStr("");
    setSelectedIds(new Set());
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
          Extract Pages
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Pull the exact pages you need into a new PDF, or split multiple ranges
          into separate output files with deterministic filenames.
        </p>
      </div>

      {!pdfBytes ? (
        <PdfUploadZone
          onFiles={handleFile}
          toolId="extract-pages"
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

      {pdfBytes && pages.length > 0 ? (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {pdfName}.pdf — {pages.length} page{pages.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-[var(--muted-foreground)] underline transition-colors hover:text-red-600"
              >
                Change file
              </button>
            </div>
            <Button onClick={handleDownload} disabled={processing}>
              {processing ? "Extracting…" : "Extract & Download"}
            </Button>
          </div>

          <div className="mt-4 flex rounded-xl border border-[var(--border-strong)] bg-[var(--surface-soft)] p-1">
            {(
              [
                { key: "selection", label: "Selected pages" },
                { key: "ranges", label: "Ranges" },
              ] as const
            ).map((mode) => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setExtractMode(mode.key)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  extractMode === mode.key
                    ? "bg-white text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {extractMode === "ranges" ? (
            <div className="mt-4 max-w-xl">
              <Input
                value={rangeStr}
                onChange={(event) => setRangeStr(event.target.value)}
                label="Page ranges"
                placeholder={`e.g. 1-2, 5, 7-${pages.length}`}
              />
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                Use commas to create multiple extraction outputs. A single range
                downloads one PDF; multiple ranges download a ZIP.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              Click the pages you want to copy into the extracted PDF.{" "}
              <span className="font-medium text-[var(--foreground)]">
                {selectedIds.size} selected
              </span>
            </p>
          )}

          {error ? (
            <p className="mt-3 text-xs text-red-600">{error}</p>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <PdfPageGrid
                pages={pages}
                mode={extractMode === "selection" ? "select" : "preview"}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelection}
              />
            </div>
            <SplitPlanPreview plan={plan} />
          </div>
        </>
      ) : null}
    </div>
  );
}
