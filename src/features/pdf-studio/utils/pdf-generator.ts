"use client";

import type { ImageItem, PageSettings } from "@/features/pdf-studio/types";
import {
  getEffectivePageDimensions,
  calculateImagePlacement,
  prepareImageDataUrl,
  getImageNaturalDimensions,
} from "@/features/pdf-studio/utils/image-processor";

const PAGE_NUMBER_FONT_SIZE = 10;
const WATERMARK_FONT_SIZE = 34;

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
  const { PDFDocument, StandardFonts, degrees, grayscale, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const pageNumberFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const watermarkFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const total = images.length;
  const exportQuality = settings.compressionQuality / 100;

  applyDocumentMetadata(pdfDoc, settings);

  for (let i = 0; i < images.length; i++) {
    const item = images[i];

    onProgress?.({ current: i, total, stage: "loading" });

    const preparedDataUrl = await prepareImageDataUrl(item.previewUrl, item.rotation, item.crop, exportQuality);

    const naturalDims = await getImageNaturalDimensions(preparedDataUrl);

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

    const base64Data = preparedDataUrl.split(",")[1];
    if (!base64Data) continue;

    const mimeMatch = preparedDataUrl.match(/^data:(image\/[^;]+);base64,/);
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

    if (settings.enableOcr && item.ocrText) {
      // For now, use a simplified approach to place OCR text.
      // This might need more sophisticated layout algorithms for better text alignment.
      page.drawText(item.ocrText, {
        x: placement.x,
        y: pageDimensions.heightPt - placement.y - placement.height + PAGE_NUMBER_FONT_SIZE, // Offset for baseline
        font: pageNumberFont, // Using an existing font
        size: PAGE_NUMBER_FONT_SIZE, // Using an existing size
        color: rgb(0, 0, 0),
        opacity: 0, // Make it invisible
      });
    }

    if (settings.watermark.enabled && settings.watermark.text.trim()) {
      page.drawText(settings.watermark.text.trim(), {
        x: pageDimensions.widthPt * 0.18,
        y: pageDimensions.heightPt * 0.48,
        size: WATERMARK_FONT_SIZE,
        font: watermarkFont,
        rotate: degrees(35),
        color: grayscale(0.45),
        opacity: settings.watermark.opacity,
      });
    }

    if (settings.pageNumbers.enabled) {
      const label = `Page ${i + 1} of ${total}`;
      const textWidth = pageNumberFont.widthOfTextAtSize(label, PAGE_NUMBER_FONT_SIZE);
      page.drawText(label, {
        x: (pageDimensions.widthPt - textWidth) / 2,
        y: 14,
        size: PAGE_NUMBER_FONT_SIZE,
        font: pageNumberFont,
        color: grayscale(0.35),
      });
    }
  }

  onProgress?.({ current: total, total, stage: "finalizing" });

  return pdfDoc.save();
}

function applyDocumentMetadata(
  pdfDoc: {
    setTitle: (value: string) => void;
    setAuthor: (value: string) => void;
    setSubject: (value: string) => void;
    setKeywords: (value: string[]) => void;
  },
  settings: PageSettings,
) {
  if (settings.metadata.title.trim()) {
    pdfDoc.setTitle(settings.metadata.title.trim());
  }

  if (settings.metadata.author.trim()) {
    pdfDoc.setAuthor(settings.metadata.author.trim());
  }

  if (settings.metadata.subject.trim()) {
    pdfDoc.setSubject(settings.metadata.subject.trim());
  }

  if (settings.metadata.keywords.trim()) {
    const keywords = settings.metadata.keywords
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (keywords.length > 0) {
      pdfDoc.setKeywords(keywords);
    }
  }
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
