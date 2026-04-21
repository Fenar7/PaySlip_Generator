"use client";

import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFPage,
  type PDFImage,
} from "pdf-lib";
import type { WatermarkSettings } from "@/features/docs/pdf-studio/types";
import {
  normalizePercentageToScale,
  normalizePercentageToUnitInterval,
} from "@/features/docs/pdf-studio/utils/pdf-generator";

function resolvePagePosition(
  page: PDFPage,
  position: WatermarkSettings["position"],
  itemWidth: number,
  itemHeight: number,
) {
  const { width, height } = page.getSize();
  const margin = 28;

  switch (position) {
    case "top-left":
      return { x: margin, y: height - itemHeight - margin };
    case "top-center":
      return { x: (width - itemWidth) / 2, y: height - itemHeight - margin };
    case "top-right":
      return { x: width - itemWidth - margin, y: height - itemHeight - margin };
    case "center-left":
      return { x: margin, y: (height - itemHeight) / 2 };
    case "center":
      return { x: (width - itemWidth) / 2, y: (height - itemHeight) / 2 };
    case "center-right":
      return { x: width - itemWidth - margin, y: (height - itemHeight) / 2 };
    case "bottom-left":
      return { x: margin, y: margin };
    case "bottom-center":
      return { x: (width - itemWidth) / 2, y: margin };
    case "bottom-right":
      return { x: width - itemWidth - margin, y: margin };
  }
}

function hexToRgbColor(value: string) {
  const normalized = value.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;

  const int = Number.parseInt(expanded, 16);
  if (Number.isNaN(int)) {
    return rgb(0.6, 0.6, 0.6);
  }

  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

async function embedWatermarkImage(
  doc: PDFDocument,
  previewUrl: string,
): Promise<PDFImage> {
  const response = await fetch(previewUrl);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (previewUrl.startsWith("data:image/png")) {
    return doc.embedPng(bytes);
  }
  return doc.embedJpg(bytes);
}

export async function applyWatermarkToPdf(
  pdfBytes: Uint8Array,
  watermark: WatermarkSettings,
): Promise<Uint8Array> {
  if (!watermark.enabled || watermark.type === "none") {
    return pdfBytes;
  }

  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const image =
    watermark.type === "image" && watermark.image?.previewUrl
      ? await embedWatermarkImage(doc, watermark.image.previewUrl)
      : null;

  doc.getPages().forEach((page, index) => {
    if (watermark.scope === "first" && index > 0) {
      return;
    }

    if (watermark.type === "text" && watermark.text?.content?.trim()) {
      const content = watermark.text.content.trim();
      const fontSize = Math.max(8, watermark.text.fontSize || 30);
      const opacity = normalizePercentageToUnitInterval(watermark.text.opacity, 0.2);
      const textWidth = font.widthOfTextAtSize(content, fontSize);
      const textHeight = fontSize;
      const { x, y } = resolvePagePosition(page, watermark.position, textWidth, textHeight);

      page.drawText(content, {
        x,
        y,
        font,
        size: fontSize,
        rotate: degrees(watermark.rotation || 0),
        opacity,
        color: hexToRgbColor(watermark.text.color || "#999999"),
      });
      return;
    }

    if (image) {
      const scale = normalizePercentageToScale(watermark.image?.scale, 0.35);
      const opacity = normalizePercentageToUnitInterval(watermark.image?.opacity, 0.25);
      const imageSize = image.scale(scale);
      const { x, y } = resolvePagePosition(
        page,
        watermark.position,
        imageSize.width,
        imageSize.height,
      );

      page.drawImage(image, {
        x,
        y,
        width: imageSize.width,
        height: imageSize.height,
        rotate: degrees(watermark.rotation || 0),
        opacity,
      });
    }
  });

  return doc.save();
}
