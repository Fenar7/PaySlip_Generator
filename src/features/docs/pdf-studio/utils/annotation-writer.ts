import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface TextAnnotation {
  id: string;
  text: string;
  pageIndex: number;
  x: number; // 0-1 relative to page width
  y: number; // 0-1 relative to page height
  fontSize: number;
  color: "black" | "blue" | "red";
}

export interface SignatureAnnotation {
  id: string;
  dataUrl: string; // PNG data URL
  pageIndex: number;
  x: number; // 0-1 relative
  y: number; // 0-1 relative
  width: number; // 0-1 relative
  height: number; // 0-1 relative
}

const COLOR_MAP = {
  black: rgb(0, 0, 0),
  blue: rgb(0.1, 0.23, 0.36),
  red: rgb(0.55, 0.1, 0.1),
};

export async function embedAnnotations(
  pdfBytes: Uint8Array,
  textAnnotations: TextAnnotation[],
  signatureAnnotations: SignatureAnnotation[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const ann of textAnnotations) {
    const page = doc.getPage(ann.pageIndex);
    const { width, height } = page.getSize();
    page.drawText(ann.text, {
      x: ann.x * width,
      y: height - ann.y * height - ann.fontSize,
      size: ann.fontSize,
      font,
      color: COLOR_MAP[ann.color],
    });
  }

  for (const sig of signatureAnnotations) {
    const page = doc.getPage(sig.pageIndex);
    const { width, height } = page.getSize();
    const base64 = sig.dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const pngImage = await doc.embedPng(bytes);
    page.drawImage(pngImage, {
      x: sig.x * width,
      y: height - sig.y * height - sig.height * height,
      width: sig.width * width,
      height: sig.height * height,
    });
  }

  return doc.save();
}
