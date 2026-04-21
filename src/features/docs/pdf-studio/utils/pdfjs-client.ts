"use client";

// Import the standard pdfjs-dist entry (build/pdf.mjs). We load the module
// dynamically so webpack code-splits it into its own chunk. The worker is
// also resolved via new URL(…, import.meta.url) so webpack creates a
// compatible sibling chunk — both chunks come from the same webpack
// compilation, ensuring internal message-protocol compatibility at runtime.
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";

type PdfJsModule = typeof import("pdfjs-dist");
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

// WASM binaries (openjpeg.wasm, qcms_bg.wasm, jbig2.wasm) are served as
// static assets from public/vendor/pdfjs/wasm/. PDF.js fetches them lazily
// only when a PDF uses JPEG2000, JBIG2, or QCMS color-space compression.
const PDFJS_PUBLIC_WASM_URL = "/vendor/pdfjs/wasm/";

// Worker URL resolved by webpack at build time from the pdfjs-dist package.
// Using new URL(…, import.meta.url) makes webpack emit the worker as a
// separate chunk that is guaranteed to match the main module chunk.
const PDFJS_WORKER_URL = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

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
    cachedPdfJsModulePromise = import("pdfjs-dist")
      .then((pdfjsLib) => {
        if (pdfjsLib.GlobalWorkerOptions.workerSrc !== PDFJS_WORKER_URL) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
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
  options?: Omit<DocumentInitParameters, "data" | "wasmUrl">,
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
