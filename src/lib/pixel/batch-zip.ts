/**
 * Client-side batch ZIP export for Pixel tools.
 * Uses JSZip to bundle multiple processed images and trigger a browser download.
 */

export interface BatchZipItem {
  filename: string;
  /** Base64-encoded data URL of the processed image. */
  dataUrl: string;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error(`Invalid data URL: missing base64 payload`);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Bundles processed images into a ZIP file and triggers a browser download.
 */
export async function downloadBatchZip(
  items: BatchZipItem[],
  zipName = "pixel-batch"
): Promise<void> {
  if (items.length === 0) throw new Error("No items to zip.");

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const item of items) {
    zip.file(item.filename, dataUrlToUint8Array(item.dataUrl));
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${zipName}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Processes a list of image Files through a canvas transform,
 * then downloads all outputs as a single ZIP archive.
 */
export async function batchProcessAndZip(
  files: File[],
  transform: (img: HTMLImageElement, canvas: HTMLCanvasElement) => void,
  format: "image/jpeg" | "image/png" | "image/webp" = "image/png",
  quality = 0.92,
  zipName = "pixel-batch"
): Promise<void> {
  const ext = format === "image/jpeg" ? "jpg" : format === "image/webp" ? "webp" : "png";
  const items: BatchZipItem[] = [];

  for (const file of files) {
    const bitmap = await createImageBitmap(file);
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = bitmap.width;
    srcCanvas.height = bitmap.height;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) throw new Error("Canvas 2D context unavailable");
    srcCtx.drawImage(bitmap, 0, 0);

    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = srcCanvas.toDataURL();
    });

    const outCanvas = document.createElement("canvas");
    outCanvas.width = img.naturalWidth;
    outCanvas.height = img.naturalHeight;
    transform(img, outCanvas);

    const stem = file.name.replace(/\.[^.]+$/, "");
    items.push({ filename: `${stem}.${ext}`, dataUrl: outCanvas.toDataURL(format, quality) });
  }

  await downloadBatchZip(items, zipName);
}
