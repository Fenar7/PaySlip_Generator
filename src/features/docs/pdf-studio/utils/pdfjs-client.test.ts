import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocument = vi.fn();
const workerOptions = { workerSrc: "" };
const mockImportShape = vi.hoisted(() => ({ mode: "direct" as "direct" | "default" }));

vi.mock("pdfjs-dist", () => {
  const runtimeModule = {
    GlobalWorkerOptions: workerOptions,
    OPS: {},
    getDocument,
  };

  if (mockImportShape.mode === "default") {
    return { default: runtimeModule };
  }

  return runtimeModule;
});

describe("pdfjs client", () => {
  beforeEach(() => {
    getDocument.mockReset();
    workerOptions.workerSrc = "";
    mockImportShape.mode = "direct";
    vi.resetModules();
  });

  it("configures the webpack-resolved worker URL before opening a document", async () => {
    const { getPdfJsClient } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");

    const pdfjs = await getPdfJsClient();

    expect(pdfjs.getDocument).toBe(getDocument);
    // In vitest (jsdom), import.meta.url is a file:// URL, so the resolved
    // worker URL starts with the test environment base rather than a public path.
    // We verify it is non-empty and contains the expected worker filename.
    expect(workerOptions.workerSrc).toMatch(/pdf\.worker\.min\.mjs/);
  });

  it("accepts a default-wrapped pdfjs module namespace", async () => {
    mockImportShape.mode = "default";
    const { getPdfJsClient } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");

    const pdfjs = await getPdfJsClient();

    expect(pdfjs.getDocument).toBe(getDocument);
    expect(workerOptions.workerSrc).toMatch(/pdf\.worker\.min\.mjs/);
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

  it("classifies defineProperty bootstrap crashes as runtime failures", async () => {
    const { normalizePdfJsError } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");
    const failure = normalizePdfJsError(
      new Error("Object.defineProperty called on non-object"),
    );

    expect(failure.code).toBe("pdf-runtime-failed");
  });
});
