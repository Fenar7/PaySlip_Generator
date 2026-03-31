"use client";

import type { ImageItem, PageSettings } from "@/features/pdf-studio/types";
import {
  getEffectivePageDimensions,
  calculateImagePlacement,
  rotateImageDataUrl,
  getImageNaturalDimensions,
} from "@/features/pdf-studio/utils/image-processor";

export type GenerationProgress = {
  current: number;
  total: number;
  stage: "loading" | "rendering" | "finalizing";
};

export async function generatePdfFromImages(
  images: ImageItem[],
  settings: PageSettings,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const total = images.length;

  for (let i = 0; i < images.length; i++) {
    const item = images[i];

    onProgress?.({ current: i, total, stage: "loading" });

    const rotatedDataUrl = item.rotation !== 0
      ? await rotateImageDataUrl(item.previewUrl, item.rotation)
      : item.previewUrl;

    const naturalDims = await getImageNaturalDimensions(rotatedDataUrl);

    onProgress?.({ current: i, total, stage: "rendering" });

    const pageDimensions = getEffectivePageDimensions(
      settings,
      naturalDims.width,
      naturalDims.height,
    );

    const placement = calculateImagePlacement(
      naturalDims.width,
      naturalDims.height,
      pageDimensions,
      settings,
    );

    const page = pdfDoc.addPage([pageDimensions.widthPt, pageDimensions.heightPt]);

    const base64Data = rotatedDataUrl.split(",")[1];
    if (!base64Data) continue;

    const mimeMatch = rotatedDataUrl.match(/^data:(image\/[^;]+);base64,/);
    const mimeType = mimeMatch?.[1] ?? "image/jpeg";

    let embeddedImage;
    if (mimeType === "image/png") {
      const imageBytes = base64ToUint8Array(base64Data);
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    } else {
      const imageBytes = base64ToUint8Array(base64Data);
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    }

    page.drawImage(embeddedImage, {
      x: placement.x,
      y: pageDimensions.heightPt - placement.y - placement.height,
      width: placement.width,
      height: placement.height,
    });
  }

  onProgress?.({ current: total, total, stage: "finalizing" });

  return pdfDoc.save();
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function downloadPdfBlob(pdfBytes: Uint8Array, filename: string): void {
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
