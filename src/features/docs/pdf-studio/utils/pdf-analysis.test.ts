import { beforeEach, describe, expect, it, vi } from "vitest";

const loadingTaskDestroy = vi.fn();
const pdfCleanup = vi.fn();
const pageCleanup = vi.fn();
const getOutline = vi.fn();
const getPageIndex = vi.fn();
const getDestination = vi.fn();
const getPage = vi.fn();
const getDocument = vi.fn();

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument,
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
    getDocument.mockReset();

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
    getDocument.mockImplementation(() => ({
      promise: Promise.resolve({
        numPages: 3,
        cleanup: pdfCleanup,
        getOutline,
        getDestination,
        getPageIndex,
        getPage,
      }),
      destroy: loadingTaskDestroy,
    }));
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
    expect(pdfCleanup).toHaveBeenCalledTimes(1);
    expect(loadingTaskDestroy).toHaveBeenCalledTimes(1);
  });
});
