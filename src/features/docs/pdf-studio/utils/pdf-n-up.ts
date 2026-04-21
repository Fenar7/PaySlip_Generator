import { PDFDocument } from "pdf-lib";

export type PdfNUpSettings = {
  layout: "2-up" | "4-up";
  sheetSize: "A4" | "A3";
};

const SHEET_SIZES = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
} as const;

function getGrid(layout: PdfNUpSettings["layout"]) {
  return layout === "2-up"
    ? { columns: 2, rows: 1 }
    : { columns: 2, rows: 2 };
}

export async function generatePdfNUpLayout(
  pdfBytes: Uint8Array,
  settings: PdfNUpSettings,
) {
  const source = await PDFDocument.load(pdfBytes);
  const output = await PDFDocument.create();
  const [sheetWidth, sheetHeight] = SHEET_SIZES[settings.sheetSize];
  const { columns, rows } = getGrid(settings.layout);
  const targetWidth = settings.layout === "2-up" ? sheetHeight : sheetWidth;
  const targetHeight = settings.layout === "2-up" ? sheetWidth : sheetHeight;
  const pagesPerSheet = columns * rows;
  const gutter = 18;
  const margin = 24;
  const cellWidth = (targetWidth - margin * 2 - gutter * (columns - 1)) / columns;
  const cellHeight = (targetHeight - margin * 2 - gutter * (rows - 1)) / rows;

  for (let index = 0; index < source.getPageCount(); index += pagesPerSheet) {
    const sheet = output.addPage([targetWidth, targetHeight]);

    for (let cell = 0; cell < pagesPerSheet; cell += 1) {
      const sourceIndex = index + cell;
      if (sourceIndex >= source.getPageCount()) {
        break;
      }

      const sourcePage = source.getPage(sourceIndex);
      if (!sourcePage.node.Contents()) {
        continue;
      }
      const embedded = await output.embedPage(sourcePage);
      const scale = Math.min(
        cellWidth / embedded.width,
        cellHeight / embedded.height,
      );
      const drawWidth = embedded.width * scale;
      const drawHeight = embedded.height * scale;
      const column = cell % columns;
      const row = Math.floor(cell / columns);
      const x =
        margin +
        column * (cellWidth + gutter) +
        (cellWidth - drawWidth) / 2;
      const y =
        targetHeight -
        margin -
        (row + 1) * cellHeight -
        row * gutter +
        (cellHeight - drawHeight) / 2;

      sheet.drawPage(embedded, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    }
  }

  return output.save();
}
