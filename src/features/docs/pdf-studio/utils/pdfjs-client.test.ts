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

  it("configures the legacy worker source before opening a document", async () => {
    const { getPdfJsClient } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");

    const pdfjs = await getPdfJsClient();

    expect(pdfjs.getDocument).toBe(getDocument);
    expect(workerOptions.workerSrc).toContain("pdf.worker.min.mjs");
    expect(workerOptions.workerSrc).toContain("pdfjs-dist/legacy/build");
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
});
