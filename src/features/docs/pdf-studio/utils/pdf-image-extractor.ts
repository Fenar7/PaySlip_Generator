import { validatePdfStudioPageCount } from "@/features/docs/pdf-studio/lib/ingestion";
import {
  destroyPdfJsDocument,
  getPdfJsClient,
  normalizePdfJsError,
  openPdfJsDocument,
} from "@/features/docs/pdf-studio/utils/pdfjs-client";

/**
 * Extract raster images embedded in a PDF file using pdfjs-dist.
 *
 * This works by iterating over each page's operator list and collecting
 * `paintImageXObject` / `paintXObject` calls, then rendering each found
 * image-object to a canvas and exporting it as PNG.
 */

export interface ExtractedPdfImage {
  pageIndex: number;
  imageIndex: number;
  width: number;
  height: number;
  dataUrl: string;
  blob: Blob;
}

const PDF_IMAGE_EXTRACT_MAX_IMAGES = 60;

export async function extractImagesFromPdf(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void,
): Promise<{ ok: true; images: ExtractedPdfImage[] } | { ok: false; error: string }> {
  let loadingTask: Awaited<ReturnType<typeof openPdfJsDocument>>["loadingTask"] | null =
    null;
  let pdf: Awaited<ReturnType<typeof openPdfJsDocument>>["pdf"] | null = null;

  try {
    const pdfjsLib = await getPdfJsClient();
    const opened = await openPdfJsDocument(pdfBytes);
    loadingTask = opened.loadingTask;
    pdf = opened.pdf;
    const totalPages = pdf.numPages;
    const pageValidation = validatePdfStudioPageCount(
      "extract-images",
      totalPages,
    );
    if (!pageValidation.ok) {
      return {
        ok: false,
        error: pageValidation.error,
      };
    }

    const results: ExtractedPdfImage[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(pageNum, totalPages);
      const page = await pdf.getPage(pageNum);

      // Render the page at 2× scale to get a high-quality raster we can crop.
      const scale = 2;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      try {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          page.cleanup();
          continue;
        }

        await page.render({ canvas, viewport }).promise;

        const opList = await page.getOperatorList();
        const imgNames = new Set<string>();

        for (let i = 0; i < opList.fnArray.length; i++) {
          const OPS = pdfjsLib.OPS;
          if (
            opList.fnArray[i] === OPS.paintImageXObject ||
            opList.fnArray[i] === OPS.paintXObject
          ) {
            const args = opList.argsArray[i] as string[];
            if (args?.[0]) imgNames.add(args[0] as string);
          }
        }

        let imageIndex = 0;
        for (const name of imgNames) {
          if (results.length >= PDF_IMAGE_EXTRACT_MAX_IMAGES) {
            return {
              ok: false,
              error: `This PDF contains too many embedded images to extract safely in the browser (max ${PDF_IMAGE_EXTRACT_MAX_IMAGES}).`,
            };
          }

          const objs = (page as unknown as { objs: { get: (name: string) => { width?: number; height?: number; data?: Uint8ClampedArray } | null } }).objs;
          const imgObj = objs?.get(name);

          if (!imgObj || !imgObj.width || !imgObj.height) continue;

          const w = imgObj.width;
          const h = imgObj.height;
          const imgCanvas = document.createElement("canvas");

          try {
            imgCanvas.width = w;
            imgCanvas.height = h;
            const imgCtx = imgCanvas.getContext("2d");
            if (!imgCtx) continue;

            if (imgObj.data) {
              const rawData =
                imgObj.data instanceof Uint8ClampedArray
                  ? imgObj.data
                  : new Uint8ClampedArray(imgObj.data as ArrayBuffer);
              const imageData = new ImageData(rawData as unknown as Uint8ClampedArray<ArrayBuffer>, w, h);
              imgCtx.putImageData(imageData, 0, 0);
            }

            const dataUrl = imgCanvas.toDataURL("image/png");
            const blob = await new Promise<Blob | null>((resolve) => {
              imgCanvas.toBlob((value) => resolve(value), "image/png");
            });

            if (!blob) continue;

            results.push({
              pageIndex: pageNum - 1,
              imageIndex,
              width: w,
              height: h,
              dataUrl,
              blob,
            });
            imageIndex++;
          } finally {
            imgCanvas.width = 0;
            imgCanvas.height = 0;
            imgCanvas.remove();
          }
        }
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        canvas.remove();
        page.cleanup();
      }
    }

    return { ok: true, images: results };
  } catch (error) {
    return {
      ok: false,
      error: normalizePdfJsError(error).message,
    };
  } finally {
    if (loadingTask) {
      await destroyPdfJsDocument(loadingTask, pdf);
    }
  }
}
