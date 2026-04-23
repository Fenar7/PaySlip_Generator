"use client";

// Load the browser runtime from a public static asset. Bundling pdfjs-dist 5's
// browser runtime through Next/webpack still crashes at module bootstrap with
// "Object.defineProperty called on non-object", so the browser must import the
// same-family PDF.js asset natively instead.
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";

type PdfJsNamespaceModule = typeof import("pdfjs-dist/build/pdf.mjs");
type PdfJsRuntimeModule = {
  GlobalWorkerOptions: PdfJsNamespaceModule["GlobalWorkerOptions"];
  getDocument: PdfJsNamespaceModule["getDocument"];
  OPS: PdfJsNamespaceModule["OPS"];
};

export type PdfJsLoadingTask = ReturnType<PdfJsRuntimeModule["getDocument"]>;
export type PdfJsDocumentProxy = Awaited<PdfJsLoadingTask["promise"]>;
export type OpenPdfJsDocumentResult = {
  pdfjsLib: PdfJsRuntimeModule;
  loadingTask: PdfJsLoadingTask;
  pdf: PdfJsDocumentProxy;
};
export type PdfJsFailureCode =
  | "pdf-runtime-failed"
  | "password-protected"
  | "pdf-read-failed";

export type PdfJsFailure = {
  code: PdfJsFailureCode;
  message: string;
  cause: unknown;
};

let cachedPdfJsModulePromise: Promise<PdfJsRuntimeModule> | null = null;

export const PDFJS_PUBLIC_MAIN_URL = "/vendor/pdfjs/pdf.min.mjs";

// WASM binaries (openjpeg.wasm, qcms_bg.wasm, jbig2.wasm) are served as
// static assets from public/vendor/pdfjs/wasm/. PDF.js fetches them lazily
// only when a PDF uses JPEG2000, JBIG2, or QCMS color-space compression.
export const PDFJS_PUBLIC_WASM_URL = "/vendor/pdfjs/wasm/";

const PDFJS_PUBLIC_WORKER_URL = "/vendor/pdfjs/pdf.worker.min.mjs";

function isPdfJsRuntimeModule(value: unknown): value is PdfJsRuntimeModule {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<PdfJsRuntimeModule>;
  const workerOptions = candidate.GlobalWorkerOptions;
  const hasWorkerOptionsShape =
    (typeof workerOptions === "function" ||
      (typeof workerOptions === "object" && workerOptions !== null)) &&
    "workerSrc" in workerOptions &&
    "workerPort" in workerOptions;

  return (
    typeof candidate.getDocument === "function" &&
    hasWorkerOptionsShape &&
    typeof candidate.OPS === "object" &&
    candidate.OPS !== null
  );
}

function resolvePdfJsRuntimeModule(moduleNamespace: unknown): PdfJsRuntimeModule {
  if (isPdfJsRuntimeModule(moduleNamespace)) {
    return moduleNamespace;
  }

  if (typeof moduleNamespace === "object" && moduleNamespace !== null) {
    const defaultExport = (moduleNamespace as { default?: unknown }).default;
    if (isPdfJsRuntimeModule(defaultExport)) {
      return defaultExport;
    }
  }

  throw new Error("Invalid PDF.js runtime module shape.");
}

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
    /Unable to load wasm data|Setting up fake worker failed|Setting up worker failed|fetchBinaryData|FetchBinaryData|wasmUrl|worker|Object\.defineProperty called on non-object|Cannot redefine property|Invalid PDF\.js runtime module shape/i.test(
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

function applyWorkerSrc(pdfjsLib: PdfJsRuntimeModule, workerSrc: string) {
  if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }
}

function clearWorkerPort(pdfjsLib: PdfJsRuntimeModule) {
  if (pdfjsLib.GlobalWorkerOptions.workerPort) {
    pdfjsLib.GlobalWorkerOptions.workerPort = null;
  }
}

async function openPdfJsDocumentOnce(
  pdfjsLib: PdfJsRuntimeModule,
  data: ArrayBuffer | Uint8Array,
  options: Omit<DocumentInitParameters, "data" | "wasmUrl"> | undefined,
  workerSrc: string,
  disableWorker = false,
): Promise<OpenPdfJsDocumentResult> {
  clearWorkerPort(pdfjsLib);
  applyWorkerSrc(pdfjsLib, workerSrc);
  const loadingTask = pdfjsLib.getDocument({
    data,
    wasmUrl: PDFJS_PUBLIC_WASM_URL,
    ...options,
    ...(disableWorker ? { disableWorker: true } : {}),
  });

  try {
    const pdf = await loadingTask.promise;
    return { pdfjsLib, loadingTask, pdf };
  } catch (error) {
    await destroyPdfJsDocument(loadingTask, null);
    throw error;
  }
}

export async function getPdfJsClient() {
  if (!cachedPdfJsModulePromise) {
    const importPdfJsModule =
      process.env.NODE_ENV === "test"
        ? () => import("pdfjs-dist/build/pdf.mjs")
        : () => import(/* webpackIgnore: true */ PDFJS_PUBLIC_MAIN_URL);

    cachedPdfJsModulePromise = importPdfJsModule()
      .then((moduleNamespace) => {
        const pdfjsLib = resolvePdfJsRuntimeModule(moduleNamespace);
        applyWorkerSrc(pdfjsLib, PDFJS_PUBLIC_WORKER_URL);
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
  const pdfjsLib = await getPdfJsClient();

  try {
    return await openPdfJsDocumentOnce(
      pdfjsLib,
      data,
      options,
      PDFJS_PUBLIC_WORKER_URL,
    );
  } catch (error) {
    const primaryFailure = normalizePdfJsError(error);
    if (primaryFailure.code !== "pdf-runtime-failed" || options?.disableWorker) {
      throw primaryFailure;
    }

    try {
      return await openPdfJsDocumentOnce(
        pdfjsLib,
        data,
        options,
        PDFJS_PUBLIC_WORKER_URL,
        true,
      );
    } catch (fallbackError) {
      throw normalizePdfJsError(fallbackError);
    }
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
