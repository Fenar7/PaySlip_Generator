"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { PdfPagePreviewPanel } from "@/features/docs/pdf-studio/components/shared/pdf-page-preview-panel";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import { applyPdfBookmarks } from "@/features/docs/pdf-studio/utils/pdf-bookmarks";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import type { PdfBookmarkDraft } from "@/features/docs/pdf-studio/types";

function createDraft(pageNumber: number): PdfBookmarkDraft {
  return {
    id: crypto.randomUUID(),
    title: `Bookmark ${pageNumber}`,
    pageNumber,
    level: 0,
  };
}

export function BookmarksWorkspace() {
  const analytics = usePdfStudioAnalytics("bookmarks");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [drafts, setDrafts] = useState<PdfBookmarkDraft[]>([]);
  const [generating, setGenerating] = useState(false);
  const { file, pdfBytes, pages, loading, error, setError, onFileSelect } =
    useSinglePdfUpload("bookmarks", analytics);

  const addDraft = useCallback(() => {
    setDrafts((current) => [...current, createDraft(currentPage + 1)]);
  }, [currentPage]);

  const handleGenerate = useCallback(async () => {
    if (!file || !pdfBytes || drafts.length === 0) {
      return;
    }

    setGenerating(true);
    setError(null);
    analytics.trackStart({ pageCount: pages.length, bookmarkCount: drafts.length });

    try {
      const result = await applyPdfBookmarks(pdfBytes, drafts);
      downloadPdfBytes(
        result,
        buildPdfStudioOutputName({
          toolId: "bookmarks",
          baseName: `${file.name.replace(/\.pdf$/i, "")}-bookmarks`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({ pageCount: pages.length, bookmarkCount: drafts.length });
    } catch {
      setError("Could not create bookmarks for this PDF. Please try again.");
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setGenerating(false);
    }
  }, [analytics, drafts, file, pages.length, pdfBytes, setError]);

  if (!file || pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
        <div className="pdf-studio-tool-header text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">Create Bookmarks</h1>
          <p className="mt-2 text-sm text-[#666]">
            Build a bookmark outline with structured levels and page targets.
          </p>
        </div>
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <button
          className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ddd] bg-white px-6 py-16 text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-sm font-medium text-[#1a1a1a]">
            {loading ? "Loading PDF..." : "Upload a PDF"}
          </span>
          <span className="mt-1 text-xs text-[#666]">Single PDF • up to 200 pages</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="application/pdf"
          onChange={(event) => void onFileSelect(event.target.files?.[0] ?? null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[360px,1fr]">
      <div className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-5">
        <div className="pdf-studio-tool-header">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Create Bookmarks</h1>
          <p className="mt-2 text-sm text-[#666]">
            Add outline entries in order. Levels nest under the last higher-level bookmark.
          </p>
        </div>

        <Button variant="secondary" onClick={addDraft}>
          Add bookmark for current page
        </Button>

        <div className="space-y-3">
          {drafts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#ddd] bg-[#fafafa] px-4 py-8 text-sm text-[#666]">
              Add at least one bookmark to build the outline.
            </div>
          ) : (
            drafts.map((draft, index) => (
              <div key={draft.id} className="rounded-xl border border-[#eee] bg-[#fafafa] p-3">
                <label className="block text-sm font-medium text-[#1a1a1a]">
                  Title
                  <input
                    className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
                    value={draft.title}
                    onChange={(event) =>
                      setDrafts((current) =>
                        current.map((item) =>
                          item.id === draft.id ? { ...item, title: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-[#1a1a1a]">
                    Page
                    <input
                      type="number"
                      min={1}
                      max={pages.length}
                      className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
                      value={draft.pageNumber}
                      onChange={(event) =>
                        setDrafts((current) =>
                          current.map((item) =>
                            item.id === draft.id
                              ? {
                                  ...item,
                                  pageNumber: Math.min(
                                    pages.length,
                                    Math.max(1, Number(event.target.value) || 1),
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="block text-sm font-medium text-[#1a1a1a]">
                    Level
                    <select
                      className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
                      value={draft.level}
                      onChange={(event) =>
                        setDrafts((current) =>
                          current.map((item) =>
                            item.id === draft.id
                              ? { ...item, level: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value={0}>Level 1</option>
                      <option value={1}>Level 2</option>
                      <option value={2}>Level 3</option>
                    </select>
                  </label>
                </div>
                <button
                  className="mt-3 text-sm font-medium text-[#8b1a1a]"
                  onClick={() =>
                    setDrafts((current) => current.filter((item, itemIndex) => itemIndex !== index))
                  }
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button onClick={handleGenerate} disabled={drafts.length === 0 || generating}>
          {generating ? "Exporting..." : "Export bookmarked PDF"}
        </Button>
      </div>

      <PdfPagePreviewPanel
        pages={pages}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
