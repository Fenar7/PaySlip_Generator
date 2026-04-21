import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocument = vi.fn();
const workerOptions = { workerSrc: "" };

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: workerOptions,
  getDocument,
}));

describe("pdfjs client", () => {
  beforeEach(() => {
    getDocument.mockReset();
    workerOptions.workerSrc = "";
    vi.resetModules();
  });

  it("configures the served worker source before opening a document", async () => {
    const { getPdfJsClient } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");

    const pdfjs = await getPdfJsClient();

    expect(pdfjs.getDocument).toBe(getDocument);
    expect(workerOptions.workerSrc).toBe("/vendor/pdfjs/pdf.worker.min.mjs");
  });

  it("cleans up loading tasks through the shared destroy helper", async () => {
    const { destroyPdfJsDocument } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");
    const cleanup = vi.fn();
    const destroy = vi.fn().mockResolvedValue(undefined);

    await destroyPdfJsDocument(
      { destroy } as never,
      { cleanup } as never,
    );

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("passes the public wasm asset base when opening a document", async () => {
    getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 1 }),
      destroy: vi.fn(),
    });

    const { openPdfJsDocument } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");
    await openPdfJsDocument(new Uint8Array([1, 2, 3]));

    expect(getDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        wasmUrl: "/vendor/pdfjs/wasm/",
      }),
    );
  });

  it("classifies worker/bootstrap failures separately from malformed PDFs", async () => {
    getDocument.mockImplementation(() => {
      throw new Error("Unable to load wasm data at: /vendor/pdfjs/wasm/openjpeg.wasm");
    });

    const { openPdfJsDocument } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");

    await expect(openPdfJsDocument(new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
      code: "pdf-runtime-failed",
      message:
        "PDF processing could not start in the browser. Please retry or contact support if this persists.",
    });
  });
});
