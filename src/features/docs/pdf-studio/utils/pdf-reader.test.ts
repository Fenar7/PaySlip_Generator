import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  loadingTaskDestroy,
  pdfCleanup,
  pageCleanup,
  render,
  getPage,
  openPdfJsDocument,
  destroyPdfJsDocument,
} = vi.hoisted(() => ({
  loadingTaskDestroy: vi.fn(),
  pdfCleanup: vi.fn(),
  pageCleanup: vi.fn(),
  render: vi.fn(),
  getPage: vi.fn(),
  openPdfJsDocument: vi.fn(),
  destroyPdfJsDocument: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/utils/pdfjs-client", () => ({
  openPdfJsDocument,
  destroyPdfJsDocument,
}));

import { getPdfPageCount, readPdfPages } from "@/features/docs/pdf-studio/utils/pdf-reader";

describe("pdf reader", () => {
  beforeEach(() => {
    loadingTaskDestroy.mockReset();
    pdfCleanup.mockReset();
    pageCleanup.mockReset();
    render.mockReset();
    getPage.mockReset();
    openPdfJsDocument.mockReset();
    destroyPdfJsDocument.mockReset();

    render.mockResolvedValue(undefined);
    getPage.mockResolvedValue({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 400 * scale,
        height: 600 * scale,
      }),
      render: vi.fn().mockReturnValue({ promise: render() }),
      cleanup: pageCleanup,
    });
    openPdfJsDocument.mockResolvedValue({
      loadingTask: { destroy: loadingTaskDestroy },
      pdf: {
        numPages: 2,
        cleanup: pdfCleanup,
        getPage,
      },
    });

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
    expect(destroyPdfJsDocument).toHaveBeenCalledTimes(1);
  });

  it("releases pdf.js resources after page-count inspection", async () => {
    const file = new File(["pdf"], "sample.pdf", { type: "application/pdf" });
    const result = await getPdfPageCount(file);

    expect(result).toEqual({ ok: true, pageCount: 2 });
    expect(destroyPdfJsDocument).toHaveBeenCalledTimes(1);
  });

  it("surfaces runtime bootstrap failures separately from invalid PDFs", async () => {
    openPdfJsDocument.mockRejectedValue({
      code: "pdf-runtime-failed",
      message:
        "PDF processing could not start in the browser. Please retry or contact support if this persists.",
    });

    const file = new File(["pdf"], "sample.pdf", { type: "application/pdf" });
    const result = await readPdfPages(file, { toolId: "split" });

    expect(result).toEqual({
      ok: false,
      error:
        "PDF processing could not start in the browser. Please retry or contact support if this persists.",
      reason: "pdf-runtime-failed",
    });
  });

  it("surfaces password-protected PDFs distinctly", async () => {
    openPdfJsDocument.mockRejectedValue({
      code: "password-protected",
      message: "This PDF is password-protected. Unlock it first, then retry.",
    });

    const file = new File(["pdf"], "locked.pdf", { type: "application/pdf" });
    const result = await getPdfPageCount(file);

    expect(result).toEqual({
      ok: false,
      error: "This PDF is password-protected. Unlock it first, then retry.",
      reason: "password-protected",
    });
  });
});
