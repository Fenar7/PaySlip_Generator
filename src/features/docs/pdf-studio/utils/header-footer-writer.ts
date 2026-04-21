import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type {
  PageNumberFormat,
  PageNumberPosition,
  PdfStampScope,
} from "@/features/docs/pdf-studio/types";

export interface HeaderFooterConfig {
  left: string;
  center: string;
  right: string;
  fontSize: number;
  fontFamily: "helvetica" | "times";
  color: string; // hex color
  marginMm: number;
}

export interface HeaderFooterSettings {
  header: HeaderFooterConfig;
  footer: HeaderFooterConfig;
  filename: string;
  scope?: PdfStampScope;
  skipFirstPage?: boolean;
}

export interface PdfPageNumberWriterSettings {
  filename: string;
  format: PageNumberFormat;
  position: PageNumberPosition;
  startFrom: number;
  skipFirstPage?: boolean;
  scope?: PdfStampScope;
  fontSize: number;
  fontFamily: "helvetica" | "times";
  color: string;
  marginMm: number;
}

export interface BatesNumberSettings {
  filename: string;
  prefix: string;
  suffix: string;
  startFrom: number;
  padding: number;
  position: PageNumberPosition;
  skipFirstPage?: boolean;
  scope?: PdfStampScope;
  fontSize: number;
  fontFamily: "helvetica" | "times";
  color: string;
  marginMm: number;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

function resolveTokens(
  text: string,
  pageNum: number,
  totalPages: number,
  filename: string,
): string {
  return text
    .replace(/\{page\}/g, String(pageNum))
    .replace(/\{total\}/g, String(totalPages))
    .replace(/\{date\}/g, new Date().toLocaleDateString())
    .replace(/\{filename\}/g, filename);
}

function marginMmToPt(marginMm: number) {
  return marginMm * 2.835;
}

function getStampFont(
  doc: PDFDocument,
  fontFamily: "helvetica" | "times",
) {
  return fontFamily === "times"
    ? doc.embedFont(StandardFonts.TimesRoman)
    : doc.embedFont(StandardFonts.Helvetica);
}

export function shouldStampPage(
  pageIndex: number,
  scope: PdfStampScope = "all",
  skipFirstPage = false,
) {
  if (skipFirstPage && pageIndex === 0) {
    return false;
  }

  if (scope === "odd") {
    return (pageIndex + 1) % 2 === 1;
  }

  if (scope === "even") {
    return (pageIndex + 1) % 2 === 0;
  }

  return true;
}

function drawAlignedText({
  page,
  font,
  text,
  fontSize,
  color,
  marginPt,
  verticalPosition,
  alignment,
}: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  fontSize: number;
  color: ReturnType<typeof rgb>;
  marginPt: number;
  verticalPosition: "top" | "bottom";
  alignment: "left" | "center" | "right";
}) {
  const { width, height } = page.getSize();
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const y =
    verticalPosition === "top"
      ? height - marginPt - fontSize
      : marginPt;

  const x =
    alignment === "left"
      ? marginPt
      : alignment === "center"
        ? (width - textWidth) / 2
        : width - marginPt - textWidth;

  page.drawText(text, { x, y, size: fontSize, font, color });
}

export function formatPageNumberLabel(
  format: PageNumberFormat,
  pageNum: number,
  totalPages: number,
) {
  switch (format) {
    case "number":
      return String(pageNum);
    case "page-number":
      return `Page ${pageNum}`;
    case "number-of-total":
      return `${pageNum} of ${totalPages}`;
    case "page-number-of-total":
    default:
      return `Page ${pageNum} of ${totalPages}`;
  }
}

export function formatBatesNumber(
  pageNum: number,
  {
    prefix,
    suffix,
    padding,
    startFrom,
  }: Pick<BatesNumberSettings, "prefix" | "suffix" | "padding" | "startFrom">,
) {
  const sequence = String(startFrom + pageNum - 1).padStart(padding, "0");
  return `${prefix}${sequence}${suffix}`;
}

function getPageNumberAlignment(position: PageNumberPosition) {
  if (position.endsWith("left")) {
    return "left" as const;
  }

  if (position.endsWith("center")) {
    return "center" as const;
  }

  return "right" as const;
}

function getPageNumberVerticalPosition(position: PageNumberPosition) {
  return position.startsWith("top") ? "top" : "bottom";
}

export async function injectHeaderFooter(
  pdfBytes: Uint8Array,
  settings: HeaderFooterSettings,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();

  const headerFont = await getStampFont(doc, settings.header.fontFamily);
  const footerFont = await getStampFont(doc, settings.footer.fontFamily);

  for (let i = 0; i < totalPages; i++) {
    if (!shouldStampPage(i, settings.scope, settings.skipFirstPage)) {
      continue;
    }

    const page = doc.getPage(i);
    const pageNum = i + 1;

    const hCfg = settings.header;
    if (hCfg.left || hCfg.center || hCfg.right) {
      const marginPt = marginMmToPt(hCfg.marginMm);
      const color = hexToRgb(hCfg.color);

      if (hCfg.left) {
        drawAlignedText({
          page,
          font: headerFont,
          text: resolveTokens(hCfg.left, pageNum, totalPages, settings.filename),
          fontSize: hCfg.fontSize,
          color,
          marginPt,
          verticalPosition: "top",
          alignment: "left",
        });
      }
      if (hCfg.center) {
        drawAlignedText({
          page,
          font: headerFont,
          text: resolveTokens(hCfg.center, pageNum, totalPages, settings.filename),
          fontSize: hCfg.fontSize,
          color,
          marginPt,
          verticalPosition: "top",
          alignment: "center",
        });
      }
      if (hCfg.right) {
        drawAlignedText({
          page,
          font: headerFont,
          text: resolveTokens(hCfg.right, pageNum, totalPages, settings.filename),
          fontSize: hCfg.fontSize,
          color,
          marginPt,
          verticalPosition: "top",
          alignment: "right",
        });
      }
    }

    const fCfg = settings.footer;
    if (fCfg.left || fCfg.center || fCfg.right) {
      const marginPt = marginMmToPt(fCfg.marginMm);
      const color = hexToRgb(fCfg.color);

      if (fCfg.left) {
        drawAlignedText({
          page,
          font: footerFont,
          text: resolveTokens(fCfg.left, pageNum, totalPages, settings.filename),
          fontSize: fCfg.fontSize,
          color,
          marginPt,
          verticalPosition: "bottom",
          alignment: "left",
        });
      }
      if (fCfg.center) {
        drawAlignedText({
          page,
          font: footerFont,
          text: resolveTokens(fCfg.center, pageNum, totalPages, settings.filename),
          fontSize: fCfg.fontSize,
          color,
          marginPt,
          verticalPosition: "bottom",
          alignment: "center",
        });
      }
      if (fCfg.right) {
        drawAlignedText({
          page,
          font: footerFont,
          text: resolveTokens(fCfg.right, pageNum, totalPages, settings.filename),
          fontSize: fCfg.fontSize,
          color,
          marginPt,
          verticalPosition: "bottom",
          alignment: "right",
        });
      }
    }
  }

  return doc.save();
}

export async function injectPageNumbers(
  pdfBytes: Uint8Array,
  settings: PdfPageNumberWriterSettings,
) {
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();
  const font = await getStampFont(doc, settings.fontFamily);
  const color = hexToRgb(settings.color);
  const marginPt = marginMmToPt(settings.marginMm);
  const alignment = getPageNumberAlignment(settings.position);
  const verticalPosition = getPageNumberVerticalPosition(settings.position);

  for (let i = 0; i < totalPages; i += 1) {
    if (!shouldStampPage(i, settings.scope, settings.skipFirstPage)) {
      continue;
    }

    const pageNumber = settings.startFrom + i;
    const page = doc.getPage(i);
    drawAlignedText({
      page,
      font,
      text: formatPageNumberLabel(settings.format, pageNumber, totalPages),
      fontSize: settings.fontSize,
      color,
      marginPt,
      verticalPosition,
      alignment,
    });
  }

  return doc.save();
}

export async function injectBatesNumbers(
  pdfBytes: Uint8Array,
  settings: BatesNumberSettings,
) {
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();
  const font = await getStampFont(doc, settings.fontFamily);
  const color = hexToRgb(settings.color);
  const marginPt = marginMmToPt(settings.marginMm);
  const alignment = getPageNumberAlignment(settings.position);
  const verticalPosition = getPageNumberVerticalPosition(settings.position);

  for (let i = 0; i < totalPages; i += 1) {
    if (!shouldStampPage(i, settings.scope, settings.skipFirstPage)) {
      continue;
    }

    const page = doc.getPage(i);
    drawAlignedText({
      page,
      font,
      text: formatBatesNumber(i + 1, settings),
      fontSize: settings.fontSize,
      color,
      marginPt,
      verticalPosition,
      alignment,
    });
  }

  return doc.save();
}
