import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loadingTaskDestroyMock,
  pageCleanupMock,
  renderMock,
  getPageMock,
  destroyPdfJsDocumentMock,
  openPdfJsDocumentMock,
} = vi.hoisted(() => ({
  loadingTaskDestroyMock: vi.fn(),
  pageCleanupMock: vi.fn(),
  renderMock: vi.fn(),
  getPageMock: vi.fn(),
  destroyPdfJsDocumentMock: vi.fn(),
  openPdfJsDocumentMock: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/utils/pdfjs-client", () => ({
  openPdfJsDocument: openPdfJsDocumentMock,
  destroyPdfJsDocument: destroyPdfJsDocumentMock,
  normalizePdfJsError: (error: unknown) => ({
    code: "pdf-read-failed",
    message: error instanceof Error ? error.message : String(error),
    cause: error,
  }),
}));

import { extractImagesFromPdf } from "@/features/docs/pdf-studio/utils/pdf-image-extractor";

describe("pdf image extractor", () => {
  beforeEach(() => {
    loadingTaskDestroyMock.mockReset();
    pageCleanupMock.mockReset();
    renderMock.mockResolvedValue(undefined);
    getPageMock.mockResolvedValue({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 400 * scale,
        height: 600 * scale,
      }),
      render: vi.fn().mockReturnValue({ promise: renderMock() }),
      getOperatorList: vi.fn().mockResolvedValue({
        fnArray: [],
        argsArray: [],
      }),
      cleanup: pageCleanupMock,
      objs: { get: vi.fn() },
    });
    openPdfJsDocumentMock.mockResolvedValue({
      pdfjsLib: {
        GlobalWorkerOptions: { workerSrc: "", workerPort: null },
        OPS: {
          paintImageXObject: "paintImageXObject",
          paintXObject: "paintXObject",
        },
        getDocument: vi.fn(),
      },
      loadingTask: {
        destroy: loadingTaskDestroyMock,
      },
      pdf: {
        numPages: 1,
        getPage: getPageMock,
      },
    });
    destroyPdfJsDocumentMock.mockResolvedValue(undefined);

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      {} as CanvasRenderingContext2D,
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/png;base64,AAAA",
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback: BlobCallback) => {
        callback(new Blob(["page-render"], { type: "image/png" }));
      },
    );
  });

  it("falls back to rendered scanned pages when no embedded images exist", async () => {
    const result = await extractImagesFromPdf(new Uint8Array([1, 2, 3]));

    expect(result).toMatchObject({
      ok: true,
      fallbackUsed: true,
    });
    if (result.ok) {
      expect(result.images).toHaveLength(1);
      expect(result.images[0].source).toBe("page-render");
    }
    expect(openPdfJsDocumentMock).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
    expect(destroyPdfJsDocumentMock).toHaveBeenCalledTimes(1);
    expect(pageCleanupMock).toHaveBeenCalledTimes(1);
  });
});
