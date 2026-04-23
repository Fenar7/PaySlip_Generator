import { beforeEach, describe, expect, it, vi } from "vitest";

const getDocument = vi.fn();
const workerOptions = Object.assign(function GlobalWorkerOptions() {}, {
  workerSrc: "",
  workerPort: null as Worker | null,
});
const mockImportShape = vi.hoisted(() => ({ mode: "direct" as "direct" | "default" }));

vi.mock("pdfjs-dist/build/pdf.mjs", () => {
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
    workerOptions.workerPort = null;
    mockImportShape.mode = "direct";
    vi.resetModules();
  });

  it("configures the public worker URL before opening a document", async () => {
    const { getPdfJsClient } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");

    const pdfjs = await getPdfJsClient();

    expect(pdfjs.getDocument).toBe(getDocument);
    expect(workerOptions.workerSrc).toBe("/vendor/pdfjs/pdf.worker.min.mjs");
  });

  it("accepts a default-wrapped pdfjs module namespace", async () => {
    mockImportShape.mode = "default";
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

  it("clears a stale workerPort on the primary worker-backed open path", async () => {
    workerOptions.workerPort = {} as Worker;
    const observedWorkerPorts: Array<Worker | null> = [];
    getDocument.mockImplementation(() => {
      observedWorkerPorts.push(workerOptions.workerPort);
      return {
        promise: Promise.resolve({ numPages: 1 }),
        destroy: vi.fn(),
      };
    });

    const { openPdfJsDocument } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");
    await openPdfJsDocument(new Uint8Array([1, 2, 3]));

    expect(getDocument).toHaveBeenCalledTimes(1);
    expect(observedWorkerPorts).toEqual([null]);
    expect(workerOptions.workerPort).toBeNull();
    expect(getDocument).toHaveBeenCalledWith(
      expect.not.objectContaining({
        disableWorker: true,
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

  it("falls back once to a no-worker open after a runtime bootstrap failure", async () => {
    workerOptions.workerPort = {} as Worker;
    const callModes: boolean[] = [];
    const observedWorkerPorts: Array<Worker | null> = [];
    getDocument
      .mockImplementationOnce((params: { disableWorker?: boolean }) => {
        callModes.push(Boolean(params.disableWorker));
        observedWorkerPorts.push(workerOptions.workerPort);
        throw new Error("Setting up worker failed");
      })
      .mockImplementationOnce((params: { disableWorker?: boolean }) => {
        callModes.push(Boolean(params.disableWorker));
        observedWorkerPorts.push(workerOptions.workerPort);
        return {
        promise: Promise.resolve({ numPages: 1 }),
        destroy: vi.fn(),
      };
      });

    const { openPdfJsDocument } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");
    const opened = await openPdfJsDocument(new Uint8Array([1, 2, 3]));

    expect(opened.pdf.numPages).toBe(1);
    expect(getDocument).toHaveBeenCalledTimes(2);
    expect(callModes).toEqual([false, true]);
    expect(observedWorkerPorts).toEqual([null, null]);
    expect(getDocument).toHaveBeenLastCalledWith(
      expect.objectContaining({
        disableWorker: true,
      }),
    );
    expect(workerOptions.workerPort).toBeNull();
  });

  it("does not retry malformed-pdf failures with the same runtime state", async () => {
    getDocument.mockReturnValue({
      promise: Promise.reject(new Error("Invalid PDF structure")),
      destroy: vi.fn(),
    });

    const { openPdfJsDocument } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");

    await expect(openPdfJsDocument(new Uint8Array([1, 2, 3]))).rejects.toMatchObject({
      code: "pdf-read-failed",
      message: "This PDF appears malformed or unsupported.",
    });
    expect(getDocument).toHaveBeenCalledTimes(1);
  });

  it("classifies defineProperty bootstrap crashes as runtime failures", async () => {
    const { normalizePdfJsError } = await import("@/features/docs/pdf-studio/utils/pdfjs-client");
    const failure = normalizePdfJsError(
      new Error("Object.defineProperty called on non-object"),
    );

    expect(failure.code).toBe("pdf-runtime-failed");
  });
});
