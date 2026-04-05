import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

export async function injectHeaderFooter(
  pdfBytes: Uint8Array,
  settings: HeaderFooterSettings,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const totalPages = doc.getPageCount();

  const headerFont =
    settings.header.fontFamily === "times"
      ? await doc.embedFont(StandardFonts.TimesRoman)
      : await doc.embedFont(StandardFonts.Helvetica);
  const footerFont =
    settings.footer.fontFamily === "times"
      ? await doc.embedFont(StandardFonts.TimesRoman)
      : await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < totalPages; i++) {
    const page = doc.getPage(i);
    const { width, height } = page.getSize();
    const pageNum = i + 1;

    // Header
    const hCfg = settings.header;
    if (hCfg.left || hCfg.center || hCfg.right) {
      const marginPt = hCfg.marginMm * 2.835;
      const y = height - marginPt;
      const color = hexToRgb(hCfg.color);

      if (hCfg.left) {
        page.drawText(
          resolveTokens(hCfg.left, pageNum, totalPages, settings.filename),
          { x: 40, y, size: hCfg.fontSize, font: headerFont, color },
        );
      }
      if (hCfg.center) {
        const text = resolveTokens(
          hCfg.center,
          pageNum,
          totalPages,
          settings.filename,
        );
        const tw = headerFont.widthOfTextAtSize(text, hCfg.fontSize);
        page.drawText(text, {
          x: (width - tw) / 2,
          y,
          size: hCfg.fontSize,
          font: headerFont,
          color,
        });
      }
      if (hCfg.right) {
        const text = resolveTokens(
          hCfg.right,
          pageNum,
          totalPages,
          settings.filename,
        );
        const tw = headerFont.widthOfTextAtSize(text, hCfg.fontSize);
        page.drawText(text, {
          x: width - 40 - tw,
          y,
          size: hCfg.fontSize,
          font: headerFont,
          color,
        });
      }
    }

    // Footer
    const fCfg = settings.footer;
    if (fCfg.left || fCfg.center || fCfg.right) {
      const marginPt = fCfg.marginMm * 2.835;
      const y = marginPt;
      const color = hexToRgb(fCfg.color);

      if (fCfg.left) {
        page.drawText(
          resolveTokens(fCfg.left, pageNum, totalPages, settings.filename),
          { x: 40, y, size: fCfg.fontSize, font: footerFont, color },
        );
      }
      if (fCfg.center) {
        const text = resolveTokens(
          fCfg.center,
          pageNum,
          totalPages,
          settings.filename,
        );
        const tw = footerFont.widthOfTextAtSize(text, fCfg.fontSize);
        page.drawText(text, {
          x: (width - tw) / 2,
          y,
          size: fCfg.fontSize,
          font: footerFont,
          color,
        });
      }
      if (fCfg.right) {
        const text = resolveTokens(
          fCfg.right,
          pageNum,
          totalPages,
          settings.filename,
        );
        const tw = footerFont.widthOfTextAtSize(text, fCfg.fontSize);
        page.drawText(text, {
          x: width - 40 - tw,
          y,
          size: fCfg.fontSize,
          font: footerFont,
          color,
        });
      }
    }
  }

  return doc.save();
}
