"use client";

import type { ImageItem, PageSettings, WatermarkSettings, PageNumberFormat, WatermarkPosition, PasswordSettings } from "@/features/pdf-studio/types";
import {
  getEffectivePageDimensions,
  calculateImagePlacement,
  prepareImageDataUrl,
  getImageNaturalDimensions,
} from "@/features/pdf-studio/utils/image-processor";
import { PDFDocument, PDFFont, PDFPage, PageSizes, rgb, grayscale, degrees } from "pdf-lib";

const PAGE_NUMBER_FONT_SIZE = 10;
const WATERMARK_FONT_SIZE = 34;
const DEFAULT_MARGINS = 20; // 20px margins for position calculations

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
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

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

  // Apply password protection if enabled
  if (settings.password.enabled && settings.password.userPassword) {
    await encryptPdf(pdfDoc, settings.password);
  }

  return pdfDoc.save();
}

/**
 * Apply PDF encryption (placeholder for future implementation)
 * TODO: Implement proper PDF encryption once compatible library version is available
 */
async function encryptPdf(
  pdfDoc: import("pdf-lib").PDFDocument,
  passwordSettings: PasswordSettings
): Promise<void> {
  if (!passwordSettings.userPassword) {
    console.warn('PDF encryption enabled but no user password provided');
    return;
  }
  
  // TODO: Implement encryption when pdf-lib supports it or find alternative
  // For now, we'll log the intention and continue without encryption
  console.log('PDF encryption requested but not yet implemented:', {
    hasUserPassword: Boolean(passwordSettings.userPassword),
    hasOwnerPassword: Boolean(passwordSettings.ownerPassword),
    permissions: passwordSettings.permissions
  });
  
  // Placeholder - actual encryption to be implemented later
  console.warn('PDF generated without encryption - feature pending library support');
}

/**
 * Enhanced watermark application function as per PRD specifications
 */
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
    
    page.drawText(textWatermark.content, {
      x: position.x,
      y: position.y,
      size: fontSize,
      font: watermarkFont,
      rotate: degrees(watermark.rotation || 0),
      color: color,
      opacity: textWatermark.opacity,
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
      
      const imageDims = embeddedImage.scale(imageWatermark.scale || 0.3);
      
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
        opacity: imageWatermark.opacity,
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
 * Legacy watermark support for backward compatibility
 */
async function applyLegacyWatermark(
  page: PDFPage,
  watermark: { enabled: boolean; text: string; opacity: number },
  pageDimensions: { widthPt: number; heightPt: number },
  watermarkFont: PDFFont
): Promise<void> {
  if (watermark.enabled && watermark.text.trim()) {
    const { grayscale, degrees } = await import("pdf-lib");
    
    page.drawText(watermark.text.trim(), {
      x: pageDimensions.widthPt * 0.18,
      y: pageDimensions.heightPt * 0.48,
      size: WATERMARK_FONT_SIZE,
      font: watermarkFont,
      rotate: degrees(35),
      color: grayscale(0.45),
      opacity: watermark.opacity,
    });
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
