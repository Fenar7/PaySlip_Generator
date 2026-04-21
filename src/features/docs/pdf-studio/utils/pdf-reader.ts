"use client";

import { validatePdfStudioPageCount } from "@/features/docs/pdf-studio/lib/ingestion";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";

export interface PdfPageItem {
  pageIndex: number;
  previewBytes: number;
  previewUrl: string;
  widthPt: number;
  heightPt: number;
  sourcePdfName: string;
}

export type PdfReadFailureReason = "page-limit-exceeded" | "pdf-read-failed";

export type PdfReadResult =
  | { ok: true; data: PdfPageItem[] }
  | {
      ok: false;
      error: string;
      reason: PdfReadFailureReason;
    };

export type PdfPageCountResult =
  | { ok: true; pageCount: number }
  | { ok: false; error: string; reason: PdfReadFailureReason };

type PdfReadOptions =
  | number
  | {
      toolId?: PdfStudioToolId;
      maxPages?: number;
    };

type PdfJsModule = Awaited<typeof import("pdfjs-dist")>;
type PdfLoadingTask = ReturnType<PdfJsModule["getDocument"]>;
type PdfDocumentProxy = Awaited<PdfLoadingTask["promise"]>;

let cachedPdfJsModulePromise: Promise<PdfJsModule> | null = null;

function dataUrlPayloadToBytes(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",", 2);
  if (!payload) {
    return 0;
  }

  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

async function getPdfJs() {
  if (!cachedPdfJsModulePromise) {
    cachedPdfJsModulePromise = import("pdfjs-dist").then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return pdfjsLib;
    });
  }

  return cachedPdfJsModulePromise;
}

async function openPdfDocument(data: ArrayBuffer | Uint8Array) {
  const pdfjsLib = await getPdfJs();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  return { loadingTask, pdf };
}

async function destroyPdfDocument(
  loadingTask: PdfLoadingTask,
  pdf: PdfDocumentProxy | null,
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

export async function getPdfPageCount(file: File): Promise<PdfPageCountResult> {
  let loadingTask: PdfLoadingTask | null = null;
  let pdf: PdfDocumentProxy | null = null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const opened = await openPdfDocument(arrayBuffer);
    loadingTask = opened.loadingTask;
    pdf = opened.pdf;

    return { ok: true, pageCount: pdf.numPages };
  } catch {
    return {
      ok: false,
      error: "Unable to inspect this PDF. Please verify the file is valid and try again.",
      reason: "pdf-read-failed",
    };
  } finally {
    if (loadingTask) {
      await destroyPdfDocument(loadingTask, pdf);
    }
  }
}

export async function readPdfPages(
  file: File,
  options: PdfReadOptions = 50,
): Promise<PdfReadResult> {
  let loadingTask: PdfLoadingTask | null = null;
  let pdf: PdfDocumentProxy | null = null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const opened = await openPdfDocument(arrayBuffer);
    loadingTask = opened.loadingTask;
    pdf = opened.pdf;

    if (typeof options === "number") {
      if (pdf.numPages > options) {
        return {
          ok: false,
          error: `This PDF has ${pdf.numPages} pages. The current limit is ${options} pages.`,
          reason: "page-limit-exceeded",
        };
      }
    } else if (options.toolId) {
      const pageValidation = validatePdfStudioPageCount(options.toolId, pdf.numPages);
      if (!pageValidation.ok) {
        return {
          ok: false,
          error: pageValidation.error,
          reason: pageValidation.reason,
        };
      }
    } else if (options.maxPages && pdf.numPages > options.maxPages) {
      return {
        ok: false,
        error: `This PDF has ${pdf.numPages} pages. The current limit is ${options.maxPages} pages.`,
        reason: "page-limit-exceeded",
      };
    }

    const pages: PdfPageItem[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);

      try {
        const viewport = page.getViewport({ scale: 150 / 72 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext("2d");
        if (!context) {
          canvas.remove();
          return {
            ok: false,
            error: "Unable to read this PDF. Please verify the file and try again.",
            reason: "pdf-read-failed",
          };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvasContext: context, viewport } as any).promise;

        const previewUrl = canvas.toDataURL("image/jpeg", 0.8);
        const originalViewport = page.getViewport({ scale: 1 });
        pages.push({
          pageIndex: pageNumber - 1,
          previewBytes: dataUrlPayloadToBytes(previewUrl),
          previewUrl,
          widthPt: originalViewport.width,
          heightPt: originalViewport.height,
          sourcePdfName: file.name,
        });

        canvas.width = 0;
        canvas.height = 0;
        canvas.remove();
      } finally {
        page.cleanup();
      }
    }

    return { ok: true, data: pages };
  } catch {
    return {
      ok: false,
      error: "Unable to read this PDF. Please verify the file is valid and try again.",
      reason: "pdf-read-failed",
    };
  } finally {
    if (loadingTask) {
      await destroyPdfDocument(loadingTask, pdf);
    }
  }
}
