import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loadingTaskDestroy,
  pdfCleanup,
  pageCleanup,
  getOutline,
  getPageIndex,
  getDestination,
  getPage,
  openPdfJsDocument,
  destroyPdfJsDocument,
} = vi.hoisted(() => ({
  loadingTaskDestroy: vi.fn(),
  pdfCleanup: vi.fn(),
  pageCleanup: vi.fn(),
  getOutline: vi.fn(),
  getPageIndex: vi.fn(),
  getDestination: vi.fn(),
  getPage: vi.fn(),
  openPdfJsDocument: vi.fn(),
  destroyPdfJsDocument: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/utils/pdfjs-client", () => ({
  openPdfJsDocument,
  destroyPdfJsDocument,
}));

import {
  analyzePdfForSplit,
  detectSeparatorCandidates,
  estimatePdfPageBytes,
  summarizePageText,
} from "@/features/docs/pdf-studio/utils/pdf-analysis";

describe("pdf analysis", () => {
  beforeEach(() => {
    loadingTaskDestroy.mockReset();
    pdfCleanup.mockReset();
    pageCleanup.mockReset();
    getOutline.mockReset();
    getPageIndex.mockReset();
    getDestination.mockReset();
    getPage.mockReset();
    openPdfJsDocument.mockReset();
    destroyPdfJsDocument.mockReset();

    getOutline.mockResolvedValue([]);
    getDestination.mockResolvedValue(null);
    getPageIndex.mockResolvedValue(0);
    getPage.mockImplementation((pageNumber: number) =>
      Promise.resolve({
        getTextContent: vi.fn().mockResolvedValue({
          items: [
            {
              str:
                pageNumber === 1
                  ? "Cover page"
                  : pageNumber === 2
                    ? "SECTION ALPHA"
                    : "Invoice Summary",
            },
          ],
        }),
        cleanup: pageCleanup,
      }),
    );
    openPdfJsDocument.mockResolvedValue({
      loadingTask: { destroy: loadingTaskDestroy },
      pdf: {
        numPages: 3,
        cleanup: pdfCleanup,
        getOutline,
        getDestination,
        getPageIndex,
        getPage,
      },
    });
  });

  it("weights size estimates using preview complexity instead of a flat average", () => {
    const analysis = estimatePdfPageBytes(1_000, [100, 300, 600], 3);

    expect(analysis.averagePageBytes).toBe(333);
    expect(analysis.estimatedPageBytes).toEqual([100, 300, 600]);
  });

  it("suppresses repeated header-style separator candidates", () => {
    const summaries = [
      summarizePageText(1, "Cover page"),
      summarizePageText(2, "Invoice Summary July 2024"),
      summarizePageText(3, "Invoice Summary July 2024"),
      summarizePageText(4, "Invoice Summary July 2024"),
    ];

    expect(detectSeparatorCandidates(summaries)).toEqual([]);
  });

  it("cleans up pdf.js resources after document analysis", async () => {
    const progress = vi.fn();
    const result = await analyzePdfForSplit(new Uint8Array([1, 2, 3]), {
      previewBytes: [100, 300, 600],
      onProgress: progress,
    });

    expect(result.separatorCandidates).toEqual([
      expect.objectContaining({
        pageNumber: 2,
        heading: "SECTION ALPHA",
      }),
    ]);
    expect(progress).toHaveBeenCalledWith({ processedPages: 3, totalPages: 3 });
    expect(pageCleanup).toHaveBeenCalledTimes(3);
    expect(destroyPdfJsDocument).toHaveBeenCalledTimes(1);
  });
});
