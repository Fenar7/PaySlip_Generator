import { validatePdfStudioPageCount } from "@/features/docs/pdf-studio/lib/ingestion";
import {
  destroyPdfJsDocument,
  getPdfJsClient,
  normalizePdfJsError,
  PDFJS_PUBLIC_WASM_URL,
  type PdfJsDocumentProxy,
  type PdfJsLoadingTask,
} from "@/features/docs/pdf-studio/utils/pdfjs-client";

export interface ExtractedPdfImage {
  pageIndex: number;
  imageIndex: number;
  width: number;
  height: number;
  dataUrl: string;
  blob: Blob;
  source: "embedded" | "page-render";
}

const PDF_IMAGE_EXTRACT_MAX_IMAGES = 60;

export async function extractImagesFromPdf(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void,
): Promise<
  | { ok: true; images: ExtractedPdfImage[]; fallbackUsed: boolean }
  | { ok: false; error: string }
> {
  let loadingTask: PdfJsLoadingTask | null = null;
  let pdf: PdfJsDocumentProxy | null = null;

  try {
    const pdfjsLib = await getPdfJsClient();
    loadingTask = pdfjsLib.getDocument({
      data: pdfBytes,
      wasmUrl: PDFJS_PUBLIC_WASM_URL,
    });
    pdf = await loadingTask.promise;
    const pageValidation = validatePdfStudioPageCount("extract-images", pdf.numPages);
    if (!pageValidation.ok) {
      return { ok: false, error: pageValidation.error };
    }

    const results: ExtractedPdfImage[] = [];
    const pageRenderFallbacks: ExtractedPdfImage[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      onProgress?.(pageNum, pdf.numPages);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");

      try {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          page.cleanup();
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.render({ canvasContext: ctx, viewport } as any).promise;

        const opList = await page.getOperatorList();
        const imgNames = new Set<string>();

        for (let index = 0; index < opList.fnArray.length; index += 1) {
          const OPS = pdfjsLib.OPS;
          if (
            opList.fnArray[index] === OPS.paintImageXObject ||
            opList.fnArray[index] === OPS.paintXObject
          ) {
            const args = opList.argsArray[index] as string[];
            if (args?.[0]) {
              imgNames.add(args[0] as string);
            }
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

          const objs = (
            page as unknown as {
              objs: {
                get: (
                  name: string,
                ) => { width?: number; height?: number; data?: Uint8ClampedArray } | null;
              };
            }
          ).objs;
          const imgObj = objs?.get(name);

          if (!imgObj || !imgObj.width || !imgObj.height || !imgObj.data) {
            continue;
          }

          const imageCanvas = document.createElement("canvas");

          try {
            imageCanvas.width = imgObj.width;
            imageCanvas.height = imgObj.height;
            const imageCtx = imageCanvas.getContext("2d");
            if (!imageCtx) {
              continue;
            }

            const imageData = new ImageData(
              imgObj.data instanceof Uint8ClampedArray
                ? imgObj.data
                : new Uint8ClampedArray(imgObj.data as ArrayBuffer),
              imgObj.width,
              imgObj.height,
            );
            imageCtx.putImageData(imageData, 0, 0);
            const dataUrl = imageCanvas.toDataURL("image/png");
            const blob = await new Promise<Blob | null>((resolve) => {
              imageCanvas.toBlob((value) => resolve(value), "image/png");
            });
            if (!blob) {
              continue;
            }

            results.push({
              pageIndex: pageNum - 1,
              imageIndex,
              width: imgObj.width,
              height: imgObj.height,
              dataUrl,
              blob,
              source: "embedded",
            });
            imageIndex += 1;
          } finally {
            imageCanvas.width = 0;
            imageCanvas.height = 0;
            imageCanvas.remove();
          }
        }

        if (imgNames.size === 0) {
          const dataUrl = canvas.toDataURL("image/png");
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((value) => resolve(value), "image/png");
          });
          if (blob) {
            pageRenderFallbacks.push({
              pageIndex: pageNum - 1,
              imageIndex: 0,
              width: viewport.width,
              height: viewport.height,
              dataUrl,
              blob,
              source: "page-render",
            });
          }
        }
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        canvas.remove();
        page.cleanup();
      }
    }

    if (results.length > 0) {
      return { ok: true, images: results, fallbackUsed: false };
    }

    return {
      ok: true,
      images: pageRenderFallbacks,
      fallbackUsed: pageRenderFallbacks.length > 0,
    };
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
