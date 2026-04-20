"use client";

import { validatePdfStudioPageCount } from "@/features/docs/pdf-studio/lib/ingestion";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";

export interface PdfPageItem {
  pageIndex: number;
  previewUrl: string;
  widthPt: number;
  heightPt: number;
  sourcePdfName: string;
}

export type PdfReadResult =
  | { ok: true; data: PdfPageItem[] }
  | { ok: false; error: string };

type PdfReadOptions =
  | number
  | {
      toolId?: PdfStudioToolId;
      maxPages?: number;
    };

export async function readPdfPages(
  file: File,
  options: PdfReadOptions = 50,
): Promise<PdfReadResult> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    if (typeof options === "number") {
      if (pdf.numPages > options) {
        return {
          ok: false,
          error: `This PDF has ${pdf.numPages} pages. The current limit is ${options} pages.`,
        };
      }
    } else if (options.toolId) {
      const pageValidation = validatePdfStudioPageCount(
        options.toolId,
        pdf.numPages,
      );
      if (!pageValidation.ok) {
        return {
          ok: false,
          error: pageValidation.error,
        };
      }
    } else if (options.maxPages && pdf.numPages > options.maxPages) {
      return {
        ok: false,
        error: `This PDF has ${pdf.numPages} pages. The current limit is ${options.maxPages} pages.`,
      };
    }

    const pages: PdfPageItem[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 150 / 72 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return { ok: false, error: "Failed to create canvas context" };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: ctx, viewport } as any).promise;

      const originalViewport = page.getViewport({ scale: 1 });
      pages.push({
        pageIndex: i - 1,
        previewUrl: canvas.toDataURL("image/jpeg", 0.8),
        widthPt: originalViewport.width,
        heightPt: originalViewport.height,
        sourcePdfName: file.name,
      });
      canvas.remove();
    }

    return { ok: true, data: pages };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to read PDF: ${msg}` };
  }
}
