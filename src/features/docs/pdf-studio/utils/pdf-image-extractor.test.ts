import { beforeEach, describe, expect, it, vi } from "vitest";

const destroyMock = vi.fn();
const pageCleanupMock = vi.fn();
const renderMock = vi.fn();
const getPageMock = vi.fn();
const getDocumentMock = vi.fn();

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  OPS: {
    paintImageXObject: "paintImageXObject",
    paintXObject: "paintXObject",
  },
  getDocument: getDocumentMock,
}));

import { extractImagesFromPdf } from "@/features/docs/pdf-studio/utils/pdf-image-extractor";

describe("pdf image extractor", () => {
  beforeEach(() => {
    destroyMock.mockReset();
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
    getDocumentMock.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: getPageMock,
        destroy: destroyMock,
      }),
    });

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
    expect(pageCleanupMock).toHaveBeenCalledTimes(1);
  });
});
