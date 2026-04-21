import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from "pdf-lib";
import type { PdfEditorObject } from "@/features/docs/pdf-studio/types";

function hexToRgb(hex: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000";
  return rgb(
    parseInt(normalized.slice(1, 3), 16) / 255,
    parseInt(normalized.slice(3, 5), 16) / 255,
    parseInt(normalized.slice(5, 7), 16) / 255,
  );
}

async function dataUrlToBytes(dataUrl: string) {
  const response = await fetch(dataUrl);
  return new Uint8Array(await response.arrayBuffer());
}

export async function applyPdfEditorObjects(
  pdfBytes: Uint8Array,
  objects: PdfEditorObject[],
) {
  const doc = await PDFDocument.load(pdfBytes);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const times = await doc.embedFont(StandardFonts.TimesRoman);

  for (const object of objects) {
    const page = doc.getPage(object.pageIndex);
    const { width, height } = page.getSize();
    const x = object.x * width;
    const y = height - object.y * height;

    if (object.type === "text" || object.type === "date" || object.type === "initials") {
      const font = object.fontFamily === "times" ? times : helvetica;
      page.drawText(object.text, {
        x,
        y: y - object.fontSize,
        font,
        size: object.fontSize,
        color: hexToRgb(object.color),
      });
      continue;
    }

    if (object.type === "shape") {
      const shapeWidth = object.width * width;
      const shapeHeight = object.height * height;
      const strokeColor = hexToRgb(object.strokeColor);
      const fillColor = object.fillColor ? hexToRgb(object.fillColor) : undefined;

      if (object.shapeType === "rectangle") {
        page.drawRectangle({
          x,
          y: y - shapeHeight,
          width: shapeWidth,
          height: shapeHeight,
          borderColor: strokeColor,
          color: fillColor,
          borderWidth: object.strokeWidth,
        });
      } else if (object.shapeType === "ellipse") {
        page.drawEllipse({
          x: x + shapeWidth / 2,
          y: y - shapeHeight / 2,
          xScale: shapeWidth / 2,
          yScale: shapeHeight / 2,
          borderColor: strokeColor,
          color: fillColor,
          borderWidth: object.strokeWidth,
        });
      } else {
        page.drawLine({
          start: { x, y },
          end: { x: x + shapeWidth, y: y - shapeHeight },
          thickness: object.strokeWidth,
          color: strokeColor,
        });
      }
      continue;
    }

    if (object.type === "image" || object.type === "signature") {
      const imageBytes = await dataUrlToBytes(object.dataUrl);
      const image = object.dataUrl.startsWith("data:image/png")
        ? await doc.embedPng(imageBytes)
        : await doc.embedJpg(imageBytes);

      page.drawImage(image, {
        x,
        y: y - object.height * height,
        width: object.width * width,
        height: object.height * height,
        rotate: degrees(0),
      });
    }
  }

  return doc.save();
}
