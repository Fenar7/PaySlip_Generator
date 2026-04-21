import { beforeEach, describe, expect, it, vi } from "vitest";

const loadingTaskDestroy = vi.fn();
const pdfCleanup = vi.fn();
const pageCleanup = vi.fn();
const render = vi.fn();
const getPage = vi.fn();
const getDocument = vi.fn();

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument,
}));

import { getPdfPageCount, readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";

describe("pdf reader", () => {
  beforeEach(() => {
    loadingTaskDestroy.mockReset();
    pdfCleanup.mockReset();
    pageCleanup.mockReset();
    render.mockReset();
    getPage.mockReset();
    getDocument.mockReset();

    render.mockResolvedValue(undefined);
    getPage.mockResolvedValue({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 400 * scale,
        height: 600 * scale,
      }),
      render: vi.fn().mockReturnValue({ promise: render() }),
      cleanup: pageCleanup,
    });
    getDocument.mockImplementation(() => ({
      promise: Promise.resolve({
        numPages: 2,
        cleanup: pdfCleanup,
        getPage,
      }),
      destroy: loadingTaskDestroy,
    }));

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      "data:image/jpeg;base64,AAAA",
    );
  });

  it("releases pdf.js resources after reading page previews", async () => {
    const file = new File(["pdf"], "sample.pdf", { type: "application/pdf" });
    const result = await readPdfPages(file, { toolId: "split" });

    expect(result.ok).toBe(true);
    expect(pageCleanup).toHaveBeenCalledTimes(2);
    expect(pdfCleanup).toHaveBeenCalledTimes(1);
    expect(loadingTaskDestroy).toHaveBeenCalledTimes(1);
  });

  it("releases pdf.js resources after page-count inspection", async () => {
    const file = new File(["pdf"], "sample.pdf", { type: "application/pdf" });
    const result = await getPdfPageCount(file);

    expect(result).toEqual({ ok: true, pageCount: 2 });
    expect(pdfCleanup).toHaveBeenCalledTimes(1);
    expect(loadingTaskDestroy).toHaveBeenCalledTimes(1);
  });
});
