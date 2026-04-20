export interface RenderOptions {
  format: "jpeg" | "png";
  dpi: 72 | 150 | 300;
  quality?: number; // JPEG quality 0-1
}

export interface RenderedPage {
  pageIndex: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export const PDF_TO_IMAGE_MAX_PAGES = 20;
const PDF_TO_IMAGE_MAX_TOTAL_PIXELS = 80_000_000;

export async function renderPdfPagesToImages(
  pdfBytes: Uint8Array,
  options: RenderOptions,
  onProgress?: (current: number, total: number) => void,
): Promise<{ ok: true; data: RenderedPage[] } | { ok: false; error: string }> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
    if (pdf.numPages > PDF_TO_IMAGE_MAX_PAGES) {
      await pdf.destroy();
      return {
        ok: false,
        error: `PDF has ${pdf.numPages} pages (max ${PDF_TO_IMAGE_MAX_PAGES} for image conversion).`,
      };
    }

    const pages: RenderedPage[] = [];
    const scale = options.dpi / 72;
    let renderedPixels = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(i, pdf.numPages);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const pagePixels = viewport.width * viewport.height;

      renderedPixels += pagePixels;
      if (renderedPixels > PDF_TO_IMAGE_MAX_TOTAL_PIXELS) {
        page.cleanup();
        await pdf.destroy();
        return {
          ok: false,
          error: "This PDF is too large to convert safely in the browser. Try a lower DPI or a shorter PDF.",
        };
      }

      const canvas = document.createElement("canvas");
      try {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          await pdf.destroy();
          return { ok: false, error: "Failed to create canvas context" };
        }

        await page.render({ canvas: null, canvasContext: ctx, viewport }).promise;

        const mimeType =
          options.format === "png" ? "image/png" : "image/jpeg";
        const quality =
          options.format === "jpeg" ? (options.quality ?? 0.92) : undefined;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), mimeType, quality);
        });

        if (!blob) {
          await pdf.destroy();
          return { ok: false, error: "Failed to encode the rendered page image." };
        }

        pages.push({
          pageIndex: i - 1,
          dataUrl,
          blob,
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

    await pdf.destroy();

    return { ok: true, data: pages };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to render PDF: ${msg}` };
  }
}
