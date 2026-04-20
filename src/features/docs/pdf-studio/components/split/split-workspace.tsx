"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import {
  PdfPageGrid,
  type PageGridItem,
} from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";
import { SplitPlanPreview } from "@/features/docs/pdf-studio/components/split/split-plan-preview";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { usePdfStudioSurface } from "@/features/docs/pdf-studio/lib/surface";
import {
  buildPdfStudioOutputName,
  buildPdfStudioSegmentName,
  getPdfStudioSourceBaseName,
} from "@/features/docs/pdf-studio/lib/output";
import {
  analyzePdfForSplit,
  type PdfSplitAnalysis,
  type PdfSplitAnalysisProgress,
} from "@/features/docs/pdf-studio/utils/pdf-analysis";
import { readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import {
  parseRangeString,
  splitByPageGroups,
} from "@/features/docs/pdf-studio/utils/pdf-splitter";
import {
  planSplitByBookmarks,
  planSplitByDetectedSeparators,
  planSplitByRanges,
  planSplitBySelectedStarts,
  planSplitByTargetSize,
  planSplitEveryN,
  planSplitInHalf,
  type PdfSplitPlan,
} from "@/features/docs/pdf-studio/utils/pdf-split-planner";
import {
  buildZip,
  downloadBlob,
  downloadPdfBytes,
} from "@/features/docs/pdf-studio/utils/zip-builder";

type SplitMode =
  | "range"
  | "every-n"
  | "half"
  | "selected-starts"
  | "bookmarks"
  | "size-target"
  | "text-separators";

const SPLIT_MODE_GROUPS = [
  {
    label: "Fundamentals",
    modes: [
      { key: "range", label: "By range" },
      { key: "every-n", label: "Every N pages" },
      { key: "half", label: "In half" },
      { key: "selected-starts", label: "Selected starts" },
    ] as const,
  },
  {
    label: "Advanced",
    modes: [
      { key: "bookmarks", label: "Bookmarks" },
      { key: "size-target", label: "File size target" },
      { key: "text-separators", label: "Text separators" },
    ] as const,
  },
] as const;

function requiresAnalysis(mode: SplitMode) {
  return mode === "bookmarks" || mode === "size-target" || mode === "text-separators";
}

export function SplitWorkspace() {
  const analytics = usePdfStudioAnalytics("split");
  const { isPublic } = usePdfStudioSurface();
  const [pages, setPages] = useState<PageGridItem[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [splitMode, setSplitMode] = useState<SplitMode>("range");
  const [rangeStr, setRangeStr] = useState("");
  const [everyN, setEveryN] = useState(2);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sizeTargetMb, setSizeTargetMb] = useState(5);
  const [analysis, setAnalysis] = useState<PdfSplitAnalysis | null>(null);
  const [analysisProgress, setAnalysisProgress] =
    useState<PdfSplitAnalysisProgress | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const splitModeGroups = useMemo(
    () =>
      isPublic
        ? SPLIT_MODE_GROUPS.filter((group) => group.label === "Fundamentals")
        : SPLIT_MODE_GROUPS,
    [isPublic],
  );

  useEffect(() => {
    if (isPublic && requiresAnalysis(splitMode)) {
      setSplitMode("range");
    }
  }, [isPublic, splitMode]);

  const splitPlan = useMemo<PdfSplitPlan>(() => {
    switch (splitMode) {
      case "range": {
        if (!rangeStr.trim()) {
          return {
            segments: [],
            warning: "Enter one or more page ranges to preview the split.",
          };
        }
        const parsed = parseRangeString(rangeStr, pages.length);
        if (!parsed.ok) {
          return { segments: [], warning: parsed.error };
        }
        return planSplitByRanges(parsed.ranges, pages.length);
      }
      case "every-n":
        return planSplitEveryN(pages.length, everyN);
      case "half":
        return planSplitInHalf(pages.length);
      case "selected-starts": {
        const selectedStartPages = pages
          .filter((page) => selectedIds.has(page.id))
          .map((page) => page.originalPageNumber ?? page.pageIndex + 1);
        return planSplitBySelectedStarts(pages.length, selectedStartPages);
      }
      case "bookmarks":
        return analysis
          ? planSplitByBookmarks(pages.length, analysis.bookmarks)
          : {
              segments: [],
              warning: "Run document analysis to split by bookmarks.",
            };
      case "size-target":
        return analysis
          ? planSplitByTargetSize({
              totalPages: pages.length,
              targetBytes: Math.round(sizeTargetMb * 1024 * 1024),
              estimatedPageBytes: analysis.estimatedPageBytes,
            })
          : {
              segments: [],
              warning: "Run document analysis to estimate file-size splits.",
            };
      case "text-separators":
        return analysis
          ? planSplitByDetectedSeparators(pages.length, analysis.separatorCandidates)
          : {
              segments: [],
              warning: "Run document analysis to detect text-based separators.",
            };
    }
  }, [analysis, everyN, pages, rangeStr, selectedIds, sizeTargetMb, splitMode]);

  const handleFile = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setAnalysisProgress(null);
    setAnalysisError(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = await readPdfPages(file, { toolId: "split" });
      if (!result.ok) {
        setError(result.error);
        analytics.trackFail({ stage: "upload", reason: result.reason });
        return;
      }

      const sourceLabel = getPdfStudioSourceBaseName(file.name, "document");
      const nextPages = result.data.map((page) => ({
        ...page,
        id: `page-${page.pageIndex}`,
        originalPageNumber: page.pageIndex + 1,
        sourceLabel,
        sourceDocumentId: "source-document",
      }));

      setPdfBytes(bytes);
      setPdfName(file.name.replace(/\.pdf$/iu, ""));
      setPages(nextPages);
      setSelectedIds(new Set());
      setRangeStr("");
      setEveryN(2);
      setSizeTargetMb(5);
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

  const handleAnalyze = useCallback(async () => {
    if (!pdfBytes) {
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);
    setError(null);
    setAnalysisProgress({
      processedPages: 0,
      totalPages: pages.length,
    });

    try {
      const nextAnalysis = await analyzePdfForSplit(pdfBytes, {
        previewBytes: pages.map((page) => page.previewBytes),
        onProgress: setAnalysisProgress,
      });
      setAnalysis(nextAnalysis);
    } catch {
      setAnalysis(null);
      setAnalysisError("Document analysis could not complete for this PDF.");
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setAnalyzing(false);
      setAnalysisProgress(null);
    }
  }, [analytics, pages, pdfBytes]);

  const handleDownload = useCallback(async () => {
    if (!pdfBytes) {
      return;
    }

    if (splitPlan.segments.length === 0) {
      setError(splitPlan.warning ?? "No split outputs are ready yet.");
      return;
    }

    setProcessing(true);
    setError(null);
    analytics.trackStart({
      pageCount: pages.length,
      mode: splitMode,
      outputCount: splitPlan.segments.length,
    });

    try {
      const result = await splitByPageGroups(
        pdfBytes,
        splitPlan.segments.map((segment) => segment.pageIndices),
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
            toolId: "split",
            baseName: `${pdfName}-split`,
            startPage: splitPlan.segments[0].startPage,
            endPage: splitPlan.segments[0].endPage,
            totalPages: pages.length,
            label:
              splitPlan.segments[0].reason === "range"
                ? undefined
                : splitPlan.segments[0].label,
            extension: "pdf",
          }),
        );
      } else {
        const zip = buildZip(
          result.data.map((data, index) => ({
            name: buildPdfStudioSegmentName({
              toolId: "split",
              baseName: `${pdfName}-split`,
              startPage: splitPlan.segments[index].startPage,
              endPage: splitPlan.segments[index].endPage,
              totalPages: pages.length,
              label:
                splitPlan.segments[index].reason === "range"
                  ? undefined
                  : splitPlan.segments[index].label,
              extension: "pdf",
            }),
            data,
          })),
        );

        downloadBlob(
          zip,
          buildPdfStudioOutputName({
            toolId: "split",
            baseName: `${pdfName}-split`,
            extension: "zip",
          }),
        );
      }

      analytics.trackSuccess({
        pageCount: pages.length,
        mode: splitMode,
        outputCount: splitPlan.segments.length,
      });
    } catch {
      setError("Failed to split this PDF.");
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setProcessing(false);
    }
  }, [analytics, pages.length, pdfBytes, pdfName, splitMode, splitPlan]);

  const handleClear = useCallback(() => {
    setPages([]);
    setPdfBytes(null);
    setPdfName("");
    setSelectedIds(new Set());
    setRangeStr("");
    setAnalysis(null);
    setAnalysisProgress(null);
    setAnalysisError(null);
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
          Split PDF
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Preview every output file before export. Range-based split modes stay
          browser-first everywhere, while heavier analysis modes stay inside the
          workspace.
        </p>
      </div>

      {!pdfBytes ? (
        <PdfUploadZone
          onFiles={handleFile}
          toolId="split"
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
              {processing ? "Splitting…" : "Split & Download"}
            </Button>
          </div>

          <div className="mt-6 space-y-5 rounded-2xl border border-[var(--border-strong)] bg-white p-5 shadow-[var(--shadow-card)]">
            {splitModeGroups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  {group.label}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {group.modes.map((mode) => (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => setSplitMode(mode.key)}
                      className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                        splitMode === mode.key
                          ? "border-[var(--accent)] bg-red-50/40 text-[var(--foreground)]"
                          : "border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--muted-foreground)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {isPublic ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-950">
                  Advanced analysis stays in the workspace
                </p>
                <p className="mt-1 text-xs text-amber-900">
                  Bookmark, size-estimate, and separator detection modes run a
                  heavier analysis pass, so they stay in the workspace where the
                  processing cost is disclosed more clearly.
                </p>
              </div>
            ) : null}

            {splitMode === "range" ? (
              <div className="max-w-xl">
                <Input
                  value={rangeStr}
                  onChange={(event) => setRangeStr(event.target.value)}
                  label="Page ranges"
                  placeholder={`e.g. 1-3, 4-6, 7-${pages.length}`}
                />
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Each range creates a separate file. Use{" "}
                  <span className="font-medium">end</span> for the last page.
                </p>
              </div>
            ) : null}

            {splitMode === "every-n" ? (
              <div className="max-w-xs">
                <Input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={everyN}
                  onChange={(event) =>
                    setEveryN(Math.max(1, parseInt(event.target.value, 10) || 1))
                  }
                  label="Pages per file"
                />
              </div>
            ) : null}

            {splitMode === "selected-starts" ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Click the pages that should start a new output file. Page 1 is
                always treated as the first segment start.
              </p>
            ) : null}

            {splitMode === "size-target" ? (
              <div className="max-w-xs">
                <Input
                  type="number"
                  min={1}
                  step={0.5}
                  value={sizeTargetMb}
                  onChange={(event) =>
                    setSizeTargetMb(Math.max(1, parseFloat(event.target.value) || 1))
                  }
                  label="Approximate size per file (MB)"
                />
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  This mode weights pages by preview complexity before it plans
                  each file, but embedded content and compression still make the
                  final PDF size approximate.
                </p>
              </div>
            ) : null}

            {requiresAnalysis(splitMode) ? (
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Document analysis
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {splitMode === "bookmarks"
                        ? "Reads bookmark destinations before export."
                        : splitMode === "size-target"
                          ? "Builds approximate file groups from preview-complexity estimates."
                          : "Looks for isolated heading-style page starts and filters repeated headers."}
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleAnalyze} disabled={analyzing}>
                    {analyzing
                      ? analysisProgress
                        ? `Analyzing ${analysisProgress.processedPages}/${analysisProgress.totalPages}…`
                        : "Analyzing…"
                      : analysis
                        ? "Re-run analysis"
                        : "Analyze document"}
                  </Button>
                </div>
                {analysis ? (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted-foreground)]">
                    <span>{analysis.bookmarks.length} bookmark boundary candidates</span>
                    <span>{analysis.separatorCandidates.length} text separator candidates</span>
                  </div>
                ) : null}
                {analysisError ? (
                  <p className="mt-3 text-xs text-red-600">{analysisError}</p>
                ) : null}
                {splitMode === "text-separators" && analysis ? (
                  <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                    Repeated headers are filtered out, but separator detection is
                    still heuristic. Confirm the preview matches the real
                    document boundaries before export.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="mt-3 text-xs text-red-600">{error}</p>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <PdfPageGrid
                pages={pages}
                mode={splitMode === "selected-starts" ? "select" : "preview"}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelection}
              />
            </div>
            <SplitPlanPreview plan={splitPlan} />
          </div>
        </>
      ) : null}
    </div>
  );
}
