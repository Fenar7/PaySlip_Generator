"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { PdfUploadZone } from "@/features/docs/pdf-studio/components/shared/pdf-upload-zone";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import {
  buildPdfStudioOutputName,
  buildPdfStudioPartName,
} from "@/features/docs/pdf-studio/lib/output";
import {
  PdfPageGrid,
  type PageGridItem,
} from "@/features/docs/pdf-studio/components/shared/pdf-page-grid";
import { readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";
import {
  splitByRanges,
  splitEveryN,
  extractPages,
  parseRangeString,
} from "@/features/docs/pdf-studio/utils/pdf-splitter";
import {
  buildZip,
  downloadBlob,
  downloadPdfBytes,
} from "@/features/docs/pdf-studio/utils/zip-builder";
import { cn } from "@/lib/utils";

type SplitMode = "range" | "every-n" | "extract";

export function SplitWorkspace() {
  const analytics = usePdfStudioAnalytics("split");
  const [pages, setPages] = useState<PageGridItem[]>([]);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [splitMode, setSplitMode] = useState<SplitMode>("range");
  const [rangeStr, setRangeStr] = useState("");
  const [everyN, setEveryN] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleFile = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const result = await readPdfPages(file, { toolId: "split" });

        if (!result.ok) {
          setError(result.error);
          analytics.trackFail({ stage: "upload", reason: result.reason });
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
        setSelectedIds(new Set());
        setRangeStr("");
        analytics.trackUpload({
          fileCount: 1,
          pageCount: gridPages.length,
          totalBytes: file.size,
        });
      } catch {
        setError("Failed to read PDF");
        analytics.trackFail({ stage: "upload", reason: "pdf-read-failed" });
      } finally {
        setLoading(false);
      }
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const everyNFileCount = useMemo(() => {
    if (pages.length === 0 || everyN < 1) return 0;
    return Math.ceil(pages.length / everyN);
  }, [pages.length, everyN]);

  const handleSplit = useCallback(async () => {
    if (!pdfBytes) return;

    setProcessing(true);
    setError(null);
    analytics.trackStart({
      pageCount: pages.length,
      mode: splitMode,
    });

    try {
      if (splitMode === "range") {
        const parsed = parseRangeString(rangeStr, pages.length);
        if (!parsed.ok) {
          setError(parsed.error);
          setProcessing(false);
          return;
        }
        const result = await splitByRanges(pdfBytes, parsed.ranges);
        if (!result.ok) {
          setError(result.error);
          setProcessing(false);
          return;
        }

        if (result.data.length === 1) {
          downloadPdfBytes(
            result.data[0],
            buildPdfStudioOutputName({
              toolId: "split",
              baseName: `${pdfName}-split`,
              extension: "pdf",
            }),
          );
        } else {
          const files = result.data.map((data, i) => ({
            name: buildPdfStudioPartName({
              toolId: "split",
              baseName: `${pdfName}-split`,
              part: i + 1,
              extension: "pdf",
            }),
            data,
          }));
          const zip = buildZip(files);
          downloadBlob(
            zip,
            buildPdfStudioOutputName({
              toolId: "split",
              baseName: `${pdfName}-split`,
              extension: "zip",
            }),
          );
        }
      } else if (splitMode === "every-n") {
        if (everyN < 1) {
          setError("Pages per file must be at least 1");
          setProcessing(false);
          return;
        }
        const result = await splitEveryN(pdfBytes, everyN);
        if (!result.ok) {
          setError(result.error);
          setProcessing(false);
          return;
        }

        if (result.data.length === 1) {
          downloadPdfBytes(
            result.data[0],
            buildPdfStudioOutputName({
              toolId: "split",
              baseName: `${pdfName}-split`,
              extension: "pdf",
            }),
          );
        } else {
          const files = result.data.map((data, i) => ({
            name: buildPdfStudioPartName({
              toolId: "split",
              baseName: `${pdfName}-split`,
              part: i + 1,
              extension: "pdf",
            }),
            data,
          }));
          const zip = buildZip(files);
          downloadBlob(
            zip,
            buildPdfStudioOutputName({
              toolId: "split",
              baseName: `${pdfName}-split`,
              extension: "zip",
            }),
          );
        }
      } else {
        // extract mode
        const indices = pages
          .filter((p) => selectedIds.has(p.id))
          .map((p) => p.pageIndex);
        if (indices.length === 0) {
          setError("Select at least one page to extract");
          setProcessing(false);
          return;
        }
        const result = await extractPages(pdfBytes, indices);
        if (!result.ok) {
          setError(result.error);
          setProcessing(false);
          return;
        }
        downloadPdfBytes(
          result.data,
          buildPdfStudioOutputName({
            toolId: "split",
            baseName: `${pdfName}-extracted-pages`,
            extension: "pdf",
          }),
        );
      }
      analytics.trackSuccess({
        pageCount: pages.length,
        mode: splitMode,
      });
    } catch {
      setError("Failed to split PDF");
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setProcessing(false);
    }
  }, [pdfBytes, splitMode, rangeStr, everyN, selectedIds, pages, pdfName]);

  const handleClear = useCallback(() => {
    setPages([]);
    setPdfBytes(null);
    setPdfName("");
    setSelectedIds(new Set());
    setError(null);
  }, []);

  const modes: { key: SplitMode; label: string }[] = [
    { key: "range", label: "By Range" },
    { key: "every-n", label: "Every N Pages" },
    { key: "extract", label: "Extract Pages" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
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
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Divide a PDF into multiple files by range, every N pages, or selected
          pages.
        </p>
      </div>

      {!pdfBytes && (
        <PdfUploadZone
          onFiles={handleFile}
          toolId="split"
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
          </div>

          {/* Split mode selector */}
          <div className="mt-4 flex rounded-xl border border-[var(--border-strong)] bg-[var(--surface-soft)] p-1">
            {modes.map((m) => (
              <button
                key={m.key}
                onClick={() => setSplitMode(m.key)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  splitMode === m.key
                    ? "bg-white text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Mode controls */}
          <div className="mt-4">
            {splitMode === "range" && (
              <div className="space-y-2">
                <Input
                  value={rangeStr}
                  onChange={(e) => setRangeStr(e.target.value)}
                  placeholder={`e.g. 1-3, 4-6, 7-${pages.length}`}
                  label="Page ranges (comma-separated)"
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Use &quot;end&quot; for last page. Each range becomes a
                  separate PDF.
                </p>
              </div>
            )}

            {splitMode === "every-n" && (
              <div className="space-y-2">
                <Input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={everyN}
                  onChange={(e) =>
                    setEveryN(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  label="Pages per file"
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Will create {everyNFileCount} file
                  {everyNFileCount !== 1 ? "s" : ""}
                </p>
              </div>
            )}

            {splitMode === "extract" && (
              <p className="text-sm text-[var(--muted-foreground)]">
                Click pages below to select them for extraction.{" "}
                <span className="font-medium">
                  {selectedIds.size} selected
                </span>
              </p>
            )}
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-600">{error}</p>
          )}

          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSplit}
              disabled={processing}
              size="md"
            >
              {processing
                ? "Processing…"
                : splitMode === "extract"
                  ? "Extract & Download"
                  : "Split & Download"}
            </Button>
          </div>

          <div className="mt-4">
            <PdfPageGrid
              pages={pages}
              mode={splitMode === "extract" ? "select" : "reorder"}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </div>
        </>
      )}
    </div>
  );
}
