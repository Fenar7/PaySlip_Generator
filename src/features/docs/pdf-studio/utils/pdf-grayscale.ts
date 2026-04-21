"use client";

import { PDFDocument } from "pdf-lib";
import { validatePdfStudioPageCount } from "@/features/docs/pdf-studio/lib/ingestion";
import {
  destroyPdfJsDocument,
  openPdfJsDocument,
} from "@/features/docs/pdf-studio/utils/pdfjs-client";

export async function convertPdfToGrayscale(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void,
): Promise<{ ok: true; data: Uint8Array } | { ok: false; error: string }> {
  let loadingTask: Awaited<ReturnType<typeof openPdfJsDocument>>["loadingTask"] | null =
    null;
  let source: Awaited<ReturnType<typeof openPdfJsDocument>>["pdf"] | null = null;

  try {
    const opened = await openPdfJsDocument(pdfBytes);
    loadingTask = opened.loadingTask;
    source = opened.pdf;
    const pageValidation = validatePdfStudioPageCount("grayscale", source.numPages);
    if (!pageValidation.ok) {
      return { ok: false, error: pageValidation.error };
    }

    const output = await PDFDocument.create();

    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(pageNumber, source.numPages);
      const page = await source.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");

      try {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          return { ok: false, error: "Could not create a rendering canvas for grayscale conversion." };
        }

        await page.render({ canvas: null, canvasContext: context, viewport }).promise;

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const avg =
            imageData.data[i] * 0.299 +
            imageData.data[i + 1] * 0.587 +
            imageData.data[i + 2] * 0.114;
          imageData.data[i] = avg;
          imageData.data[i + 1] = avg;
          imageData.data[i + 2] = avg;
        }
        context.putImageData(imageData, 0, 0);

        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        if (!base64) {
          return { ok: false, error: "Could not encode a grayscale page image." };
        }

        const pngBytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        const png = await output.embedPng(pngBytes);
        const outPage = output.addPage([viewport.width, viewport.height]);
        outPage.drawImage(png, {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        canvas.remove();
        page.cleanup();
      }
    }

    return { ok: true, data: await output.save() };
  } catch {
    return {
      ok: false,
      error: "Grayscale conversion failed. Try a smaller PDF or split the file first.",
    };
  } finally {
    if (loadingTask) {
      await destroyPdfJsDocument(loadingTask, source);
    }
  }
}
