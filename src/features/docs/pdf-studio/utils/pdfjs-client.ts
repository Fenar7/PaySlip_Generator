"use client";

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
export type PdfJsLoadingTask = ReturnType<PdfJsModule["getDocument"]>;
export type PdfJsDocumentProxy = Awaited<PdfJsLoadingTask["promise"]>;
export type PdfJsFailureCode =
  | "pdf-runtime-failed"
  | "password-protected"
  | "pdf-read-failed";

export type PdfJsFailure = {
  code: PdfJsFailureCode;
  message: string;
  cause: unknown;
};

let cachedPdfJsModulePromise: Promise<PdfJsModule> | null = null;

const PDFJS_PUBLIC_ASSET_BASE = "/vendor/pdfjs";
const PDFJS_PUBLIC_WORKER_SRC = `${PDFJS_PUBLIC_ASSET_BASE}/pdf.worker.min.mjs`;
const PDFJS_PUBLIC_WASM_URL = `${PDFJS_PUBLIC_ASSET_BASE}/wasm/`;

export function normalizePdfJsError(error: unknown): PdfJsFailure {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "PasswordException"
  ) {
    return {
      code: "password-protected",
      message: "This PDF is password-protected. Unlock it first, then retry.",
      cause: error,
    };
  }

  const errorMessage =
    error instanceof Error ? error.message : String(error ?? "");

  if (
    /Unable to load wasm data|Setting up fake worker failed|Setting up worker failed|fetchBinaryData|FetchBinaryData|wasmUrl|worker/i.test(
      errorMessage,
    )
  ) {
    return {
      code: "pdf-runtime-failed",
      message:
        "PDF processing could not start in the browser. Please retry or contact support if this persists.",
      cause: error,
    };
  }

  return {
    code: "pdf-read-failed",
    message: "This PDF appears malformed or unsupported.",
    cause: error,
  };
}

export async function getPdfJsClient() {
  if (!cachedPdfJsModulePromise) {
    cachedPdfJsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs")
      .then((pdfjsLib) => {
        if (pdfjsLib.GlobalWorkerOptions.workerSrc !== PDFJS_PUBLIC_WORKER_SRC) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_PUBLIC_WORKER_SRC;
        }
        return pdfjsLib;
      })
      .catch((error) => {
        cachedPdfJsModulePromise = null;
        throw error;
      });
  }

  return cachedPdfJsModulePromise;
}

export async function openPdfJsDocument(
  data: ArrayBuffer | Uint8Array,
  options?: Partial<Parameters<PdfJsModule["getDocument"]>[0]>,
) {
  try {
    const pdfjsLib = await getPdfJsClient();
    const loadingTask = pdfjsLib.getDocument({
      data,
      wasmUrl: PDFJS_PUBLIC_WASM_URL,
      ...options,
    });
    const pdf = await loadingTask.promise;
    return { loadingTask, pdf };
  } catch (error) {
    throw normalizePdfJsError(error);
  }
}

export async function destroyPdfJsDocument(
  loadingTask: PdfJsLoadingTask,
  pdf: PdfJsDocumentProxy | null,
) {
  if (pdf) {
    try {
      pdf.cleanup();
    } catch {
      // Ignore cleanup failures from partially-loaded or already-destroyed docs.
    }
  }

  try {
    await loadingTask.destroy();
  } catch {
    // Ignore destroy failures; callers only need best-effort cleanup.
  }
}
