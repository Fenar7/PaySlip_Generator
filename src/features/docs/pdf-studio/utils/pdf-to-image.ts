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
    const pages: RenderedPage[] = [];
    const scale = options.dpi / 72;

    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(i, pdf.numPages);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return { ok: false, error: "Failed to create canvas context" };
      }
      await page.render({ canvas: null, canvasContext: ctx, viewport }).promise;

      const mimeType =
        options.format === "png" ? "image/png" : "image/jpeg";
      const quality =
        options.format === "jpeg" ? (options.quality ?? 0.92) : undefined;
      const dataUrl = canvas.toDataURL(mimeType, quality);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), mimeType, quality);
      });

      pages.push({
        pageIndex: i - 1,
        dataUrl,
        blob,
        width: viewport.width,
        height: viewport.height,
      });
      canvas.remove();
    }

    return { ok: true, data: pages };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to render PDF: ${msg}` };
  }
}
