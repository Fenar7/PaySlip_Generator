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

export async function extractImagesFromPdf(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void,
): Promise<{ ok: true; images: ExtractedPdfImage[] } | { ok: false; error: string }> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    const totalPages = pdf.numPages;
    const results: ExtractedPdfImage[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      onProgress?.(pageNum, totalPages);
      const page = await pdf.getPage(pageNum);

      // Render the page at 2× scale to get a high-quality raster we can crop.
      const scale = 2;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      await page.render({ canvas, viewport }).promise;

      // Extract image bitmaps via the operator list
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

      // For each unique image name, use the commonObjs / objs to get dimensions
      let imageIndex = 0;
      for (const name of imgNames) {
        // Try to retrieve the image object; pdfjs stores it in objs after render
        const objs = (page as unknown as { objs: { get: (name: string) => { width?: number; height?: number; data?: Uint8ClampedArray } | null } }).objs;
        const imgObj = objs?.get(name);

        if (!imgObj || !imgObj.width || !imgObj.height) continue;

        const w = imgObj.width;
        const h = imgObj.height;

        // Draw only the image portion to a new canvas
        const imgCanvas = document.createElement("canvas");
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
        const blob = await fetch(dataUrl).then((r) => r.blob());

        results.push({
          pageIndex: pageNum - 1,
          imageIndex,
          width: w,
          height: h,
          dataUrl,
          blob,
        });
        imageIndex++;
      }
    }

    return { ok: true, images: results };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown extraction error",
    };
  }
}
