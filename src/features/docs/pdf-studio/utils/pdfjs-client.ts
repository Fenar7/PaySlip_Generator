"use client";

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
export type PdfJsLoadingTask = ReturnType<PdfJsModule["getDocument"]>;
export type PdfJsDocumentProxy = Awaited<PdfJsLoadingTask["promise"]>;

let cachedPdfJsModulePromise: Promise<PdfJsModule> | null = null;

function getPdfJsWorkerSrc() {
  return new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

export async function getPdfJsClient() {
  if (!cachedPdfJsModulePromise) {
    cachedPdfJsModulePromise = import("pdfjs-dist/legacy/build/pdf.mjs")
      .then((pdfjsLib) => {
        const workerSrc = getPdfJsWorkerSrc();
        if (pdfjsLib.GlobalWorkerOptions.workerSrc !== workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
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
  const pdfjsLib = await getPdfJsClient();
  const loadingTask = pdfjsLib.getDocument({
    data,
    ...options,
  });
  const pdf = await loadingTask.promise;
  return { loadingTask, pdf };
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
