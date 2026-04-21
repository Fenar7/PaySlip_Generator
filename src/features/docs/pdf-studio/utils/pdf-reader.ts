"use client";

import { validatePdfStudioPageCount } from "@/features/docs/pdf-studio/lib/ingestion";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";
import {
  destroyPdfJsDocument,
  openPdfJsDocument,
  type PdfJsFailure,
  type PdfJsDocumentProxy,
  type PdfJsLoadingTask,
} from "@/features/docs/pdf-studio/utils/pdfjs-client";

export interface PdfPageItem {
  pageIndex: number;
  previewBytes: number;
  previewUrl: string;
  widthPt: number;
  heightPt: number;
  sourcePdfName: string;
}

export type PdfReadFailureReason =
  | "page-limit-exceeded"
  | "pdf-read-failed"
  | "pdf-runtime-failed"
  | "password-protected";

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

function dataUrlPayloadToBytes(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",", 2);
  if (!payload) {
    return 0;
  }

  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

function isPdfJsFailure(error: unknown): error is PdfJsFailure {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

function toPdfReadFailure(error: unknown) {
  if (isPdfJsFailure(error)) {
    return {
      ok: false as const,
      error: error.message,
      reason: error.code,
    };
  }

  return {
    ok: false as const,
    error: "This PDF appears malformed or unsupported.",
    reason: "pdf-read-failed" as const,
  };
}

export async function getPdfPageCount(file: File): Promise<PdfPageCountResult> {
  let loadingTask: PdfJsLoadingTask | null = null;
  let pdf: PdfJsDocumentProxy | null = null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const opened = await openPdfJsDocument(arrayBuffer);
    loadingTask = opened.loadingTask;
    pdf = opened.pdf;

    return { ok: true, pageCount: pdf.numPages };
  } catch (error) {
    return toPdfReadFailure(error);
  } finally {
    if (loadingTask) {
      await destroyPdfJsDocument(loadingTask, pdf);
    }
  }
}

export async function readPdfPages(
  file: File,
  options: PdfReadOptions = 50,
): Promise<PdfReadResult> {
  let loadingTask: PdfJsLoadingTask | null = null;
  let pdf: PdfJsDocumentProxy | null = null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const opened = await openPdfJsDocument(arrayBuffer);
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
          return toPdfReadFailure(
            new Error("Canvas context unavailable while rendering the PDF."),
          );
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
  } catch (error) {
    return toPdfReadFailure(error);
  } finally {
    if (loadingTask) {
      await destroyPdfJsDocument(loadingTask, pdf);
    }
  }
}
