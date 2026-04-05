"use client";

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

export async function readPdfPages(
  file: File,
  maxPages = 50
): Promise<PdfReadResult> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    if (pdf.numPages > maxPages) {
      return {
        ok: false,
        error: `PDF has ${pdf.numPages} pages (max ${maxPages})`,
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
