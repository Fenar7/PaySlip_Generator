"use client";

import type { ImageItem, PageSettings, WatermarkSettings, PageNumberFormat, WatermarkPosition, PageDimensions, ImagePlacement } from "@/features/docs/pdf-studio/types";
import {
  getEffectivePageDimensions,
  calculateImagePlacement,
  prepareImageDataUrl,
  getImageNaturalDimensions,
} from "@/features/docs/pdf-studio/utils/image-processor";
import { PDFPage, PDFFont } from "pdf-lib";

const PAGE_NUMBER_FONT_SIZE = 10;
const WATERMARK_FONT_SIZE = 34;
const DEFAULT_MARGINS = 20; // 20px margins for position calculations

export function normalizePercentageToUnitInterval(value: number | undefined, fallback = 0.5): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value / 100));
}

export function normalizePercentageToScale(value: number | undefined, fallback = 0.3): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0.1, value / 100));
}

export type GenerationProgress = {
  current: number;
  total: number;
  stage: "loading" | "rendering" | "finalizing";
};

export async function generatePdfFromImages(
  images: ImageItem[],
  settings: PageSettings,
  onProgress?: (progress: GenerationProgress) => void,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const pageNumberFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const watermarkFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const total = images.length;
  const exportQuality = settings.compressionQuality / 100;

  applyDocumentMetadata(pdfDoc, settings);

  for (let i = 0; i < images.length; i++) {
    // Check for cancellation before each page
    if (signal?.aborted) {
      throw new DOMException("PDF generation was cancelled.", "AbortError");
    }

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
      await embedInvisibleOcrText(page, item.ocrText, pageDimensions, placement, pageNumberFont);
    }

    // Apply watermark using the new enhanced system
    if (settings.watermark.enabled) {
      await applyWatermark(page, settings.watermark, i, total, watermarkFont, pdfDoc);
    }

    // Apply page numbers
    if (settings.pageNumbers.enabled) {
      const shouldSkip = settings.pageNumbers.skipFirstPage && i === 0;
      if (!shouldSkip) {
        await applyPageNumber(page, settings.pageNumbers, i, total, pageDimensions, pageNumberFont);
      }
    }
  }

  onProgress?.({ current: total, total, stage: "finalizing" });

  return pdfDoc.save();
}

/**
 * Compute a font size for invisible OCR text that scales with the image
 * placement so it remains indexable without overflowing the image bounds.
 */
function computeOcrFontSize(placementHeight: number): number {
  // Target ~30–60 lines of text within the image height
  return Math.max(6, Math.min(14, placementHeight / 40));
}

/**
 * Draw a single line of OCR text character-by-character so that one
 * unsupported glyph does not discard the entire page's searchable layer.
 */
function drawOcrLineSafely(
  page: PDFPage,
  line: string,
  startX: number,
  startY: number,
  font: PDFFont,
  fontSize: number,
  color: import("pdf-lib").RGB,
  maxWidth: number,
): void {
  let x = startX;
  const y = startY;
  const spaceWidth = font.widthOfTextAtSize(" ", fontSize);

  // Split into words so we can skip whole words that don't fit
  const words = line.split(" ");

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi];
    if (!word) continue;

    const wordWidth = font.widthOfTextAtSize(word, fontSize);
    if (x + wordWidth > startX + maxWidth) {
      // Word would overflow — skip it to stay within image bounds
      continue;
    }

    // Try drawing the whole word at once (fast path)
    try {
      page.drawText(word, {
        x,
        y,
        font,
        size: fontSize,
        color,
        opacity: 0,
      });
      x += wordWidth;
    } catch {
      // Whole-word failed (mixed scripts) — fall back to character-by-character
      for (const char of word) {
        const charWidth = font.widthOfTextAtSize(char, fontSize);
        if (x + charWidth > startX + maxWidth) break;
        try {
          page.drawText(char, {
            x,
            y,
            font,
            size: fontSize,
            color,
            opacity: 0,
          });
          x += charWidth;
        } catch {
          // Unsupported character — skip silently
        }
      }
    }

    // Add space after word (except last)
    if (wi < words.length - 1) {
      x += spaceWidth;
    }
  }
}

/**
 * Embed normalized OCR text as an invisible searchable text layer.
 *
 * Goals:
 * - text must be invisible (opacity 0) but still indexed by PDF readers
 * - text is placed within the image placement area, not the page edge
 * - line breaks from the OCR result are preserved for readable selection
 * - unsupported characters are skipped gracefully (not the whole page)
 * - empty/whitespace-only text is silently skipped
 *
 * This approach gives "searchable PDF" behavior without attempting
 * bounding-box layout reconstruction (out of scope for v1).
 */
async function embedInvisibleOcrText(
  page: PDFPage,
  ocrText: string,
  pageDimensions: PageDimensions,
  placement: ImagePlacement,
  font: PDFFont,
): Promise<void> {
  // Normalize whitespace but preserve single line breaks
  const normalized = ocrText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (!normalized) return;

  const { rgb } = await import("pdf-lib");
  const color = rgb(0, 0, 0);

  const fontSize = computeOcrFontSize(placement.height);
  const lineHeight = fontSize * 1.4;

  // Place text starting at the top-left of the image placement area.
  // PDF coordinates: origin is bottom-left, y increases upward.
  // placement.y is the top offset from the page top, so:
  //   imageTop    = pageDimensions.heightPt - placement.y
  //   imageBottom = imageTop - placement.height
  const imageTop = pageDimensions.heightPt - placement.y;
  const imageLeft = placement.x;
  const maxWidth = placement.width;

  const lines = normalized.split("\n");
  let currentY = imageTop - fontSize;

  for (const line of lines) {
    if (currentY < imageTop - placement.height + fontSize) {
      // Would overflow bottom of image — stop embedding more lines
      break;
    }

    const trimmedLine = line.trim();
    if (trimmedLine) {
      drawOcrLineSafely(
        page,
        trimmedLine,
        imageLeft,
        currentY,
        font,
        fontSize,
        color,
        maxWidth,
      );
    }

    currentY -= lineHeight;
  }
}


async function applyWatermark(
  page: PDFPage,
  watermark: WatermarkSettings, 
  pageIndex: number,
  totalPages: number,
  watermarkFont: PDFFont,
  pdfDoc: import("pdf-lib").PDFDocument
): Promise<void> {
  if (!watermark.enabled || watermark.type === 'none') return;
  
  // Import pdf-lib functions
  const { degrees } = await import("pdf-lib");
  
  // Check scope
  if (watermark.scope === 'first' && pageIndex !== 0) return;
  
  const pageSize = page.getSize();
  
  if (watermark.type === 'text' && watermark.text) {
    const textWatermark = watermark.text;
    const fontSize = textWatermark.fontSize || WATERMARK_FONT_SIZE;
    
    // Calculate text dimensions for positioning
    const textWidth = watermarkFont.widthOfTextAtSize(textWatermark.content, fontSize);
    const textHeight = fontSize;
    
    const position = calculatePosition(
      pageSize,
      watermark.position,
      { width: textWidth, height: textHeight }
    );
    
    // Parse color (assuming hex format like "#000000")
    const color = await hexToRgb(textWatermark.color || "#999999");
    const opacity = normalizePercentageToUnitInterval(textWatermark.opacity, 0.5);
    
    page.drawText(textWatermark.content, {
      x: position.x,
      y: position.y,
      size: fontSize,
      font: watermarkFont,
      rotate: degrees(watermark.rotation || 0),
      color: color,
      opacity,
    });
    
  } else if (watermark.type === 'image' && watermark.image?.previewUrl) {
    const imageWatermark = watermark.image;
    
    try {
      // Convert image to bytes for embedding
      const response = await fetch(imageWatermark.previewUrl!);
      const imageBytes = new Uint8Array(await response.arrayBuffer());
      
      let embeddedImage;
      const mimeType = imageWatermark.previewUrl!.startsWith('data:image/png') ? 'png' : 'jpg';
      
      if (mimeType === 'png') {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      }
      
      const imageScale = normalizePercentageToScale(imageWatermark.scale, 0.3);
      const imageOpacity = normalizePercentageToUnitInterval(imageWatermark.opacity, 0.5);
      const imageDims = embeddedImage.scale(imageScale);
      
      const position = calculatePosition(
        pageSize,
        watermark.position,
        { width: imageDims.width, height: imageDims.height }
      );
      
      page.drawImage(embeddedImage, {
        x: position.x,
        y: position.y,
        width: imageDims.width,
        height: imageDims.height,
        rotate: degrees(watermark.rotation || 0),
        opacity: imageOpacity,
      });
      
    } catch (error) {
      console.warn('Failed to apply image watermark:', error);
      // Fall back to text watermark if image fails
      if (watermark.text) {
        const position = calculatePosition(
          pageSize,
          watermark.position,
          { width: 100, height: WATERMARK_FONT_SIZE }
        );
        
        const { grayscale, degrees } = await import("pdf-lib");
        
        page.drawText(watermark.text.content, {
          x: position.x,
          y: position.y,
          size: WATERMARK_FONT_SIZE,
          font: watermarkFont,
          rotate: degrees(watermark.rotation || 0),
          color: grayscale(0.5),
          opacity: 0.5,
        });
      }
    }
  }
}

/**
 * Format page number according to specified format
 */
function formatPageNumber(
  current: number,
  total: number, 
  format: PageNumberFormat
): string {
  switch (format) {
    case 'number': return `${current}`;
    case 'page-number': return `Page ${current}`;
    case 'number-of-total': return `${current} of ${total}`;
    case 'page-number-of-total': return `Page ${current} of ${total}`;
    default: return `${current} of ${total}`;
  }
}

/**
 * Apply page numbers to PDF page
 */
async function applyPageNumber(
  page: PDFPage,
  pageNumbers: {
    position: string;
    format: PageNumberFormat;
    startFrom: number;
  },
  pageIndex: number,
  totalPages: number,
  pageDimensions: { widthPt: number; heightPt: number },
  font: PDFFont
): Promise<void> {
  const pageNum = pageIndex + pageNumbers.startFrom;
  const label = formatPageNumber(pageNum, totalPages, pageNumbers.format);
  
  const textWidth = font.widthOfTextAtSize(label, PAGE_NUMBER_FONT_SIZE);
  const textHeight = PAGE_NUMBER_FONT_SIZE;
  
  const position = calculatePageNumberPosition(
    pageDimensions,
    pageNumbers.position,
    { width: textWidth, height: textHeight }
  );
  
  const { grayscale } = await import("pdf-lib");
  
  page.drawText(label, {
    x: position.x,
    y: position.y,
    size: PAGE_NUMBER_FONT_SIZE,
    font: font,
    color: grayscale(0.35),
  });
}

/**
 * Calculate position based on 9-position grid for watermarks
 */
function calculatePosition(
  pageSize: { width: number; height: number },
  position: WatermarkPosition,
  contentSize: { width: number; height: number }
): { x: number; y: number } {
  const margin = DEFAULT_MARGINS;
  const { width: pageWidth, height: pageHeight } = pageSize;
  const { width: contentWidth, height: contentHeight } = contentSize;
  
  let x: number, y: number;
  
  switch (position) {
    case 'top-left':
      x = margin;
      y = pageHeight - margin - contentHeight;
      break;
    case 'top-center':
      x = (pageWidth - contentWidth) / 2;
      y = pageHeight - margin - contentHeight;
      break;
    case 'top-right':
      x = pageWidth - margin - contentWidth;
      y = pageHeight - margin - contentHeight;
      break;
    case 'center-left':
      x = margin;
      y = (pageHeight - contentHeight) / 2;
      break;
    case 'center':
      x = (pageWidth - contentWidth) / 2;
      y = (pageHeight - contentHeight) / 2;
      break;
    case 'center-right':
      x = pageWidth - margin - contentWidth;
      y = (pageHeight - contentHeight) / 2;
      break;
    case 'bottom-left':
      x = margin;
      y = margin;
      break;
    case 'bottom-center':
      x = (pageWidth - contentWidth) / 2;
      y = margin;
      break;
    case 'bottom-right':
      x = pageWidth - margin - contentWidth;
      y = margin;
      break;
    default:
      // Default to center
      x = (pageWidth - contentWidth) / 2;
      y = (pageHeight - contentHeight) / 2;
  }
  
  return { x, y };
}

/**
 * Calculate position for page numbers (simpler positioning system)
 */
function calculatePageNumberPosition(
  pageDimensions: { widthPt: number; heightPt: number },
  position: string,
  contentSize: { width: number; height: number }
): { x: number; y: number } {
  const margin = 14; // Smaller margin for page numbers
  const { widthPt: pageWidth, heightPt: pageHeight } = pageDimensions;
  const { width: contentWidth } = contentSize;
  
  let x: number, y: number;
  
  switch (position) {
    case 'top-left':
      x = margin;
      y = pageHeight - margin;
      break;
    case 'top-right':
      x = pageWidth - margin - contentWidth;
      y = pageHeight - margin;
      break;
    case 'bottom-left':
      x = margin;
      y = margin;
      break;
    case 'bottom-right':
      x = pageWidth - margin - contentWidth;
      y = margin;
      break;
    case 'center':
    default:
      x = (pageWidth - contentWidth) / 2;
      y = margin;
      break;
  }
  
  return { x, y };
}

/**
 * Convert hex color to RGB for pdf-lib
 */
async function hexToRgb(hex: string): Promise<import("pdf-lib").RGB> {
  const { rgb } = await import("pdf-lib");
  
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  return rgb(r, g, b);
}

// Export the main functions for external use
export { applyWatermark, formatPageNumber, calculatePosition };

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
