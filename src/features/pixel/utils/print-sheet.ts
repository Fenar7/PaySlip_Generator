export interface PrintSheetOptions {
  photoWidthMm: number;
  photoHeightMm: number;
  sheetSize: "a4" | "letter" | "4x6" | "5x7";
  gutterMm: number;
  dpi: number;
}

export interface PrintSheetResult {
  canvas: HTMLCanvasElement;
  photosPerSheet: number;
  columns: number;
  rows: number;
}

const SHEET_SIZES_MM: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  "4x6": { width: 101.6, height: 152.4 },
  "5x7": { width: 127, height: 177.8 },
};

export function generatePrintSheet(
  photoCanvas: HTMLCanvasElement,
  options: PrintSheetOptions,
): PrintSheetResult {
  const sheet = SHEET_SIZES_MM[options.sheetSize];
  const marginMm = 10;
  const usableW = sheet.width - 2 * marginMm;
  const usableH = sheet.height - 2 * marginMm;

  const cols = Math.floor(
    (usableW + options.gutterMm) / (options.photoWidthMm + options.gutterMm),
  );
  const rows = Math.floor(
    (usableH + options.gutterMm) / (options.photoHeightMm + options.gutterMm),
  );
  const count = cols * rows;

  const pxPerMm = options.dpi / 25.4;
  const sheetCanvas = document.createElement("canvas");
  sheetCanvas.width = Math.round(sheet.width * pxPerMm);
  sheetCanvas.height = Math.round(sheet.height * pxPerMm);
  const ctx = sheetCanvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

  const photoW = Math.round(options.photoWidthMm * pxPerMm);
  const photoH = Math.round(options.photoHeightMm * pxPerMm);
  const gutterPx = Math.round(options.gutterMm * pxPerMm);
  const marginPx = Math.round(marginMm * pxPerMm);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = marginPx + col * (photoW + gutterPx);
      const y = marginPx + row * (photoH + gutterPx);
      ctx.drawImage(photoCanvas, x, y, photoW, photoH);

      // Crop marks
      ctx.strokeStyle = "#cccccc";
      ctx.lineWidth = 1;
      const markLen = Math.round(3 * pxPerMm);

      ctx.beginPath();
      ctx.moveTo(x - markLen, y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - markLen);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + photoW, y);
      ctx.lineTo(x + photoW + markLen, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + photoW, y - markLen);
      ctx.lineTo(x + photoW, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x - markLen, y + photoH);
      ctx.lineTo(x, y + photoH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + photoH);
      ctx.lineTo(x, y + photoH + markLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + photoW, y + photoH);
      ctx.lineTo(x + photoW + markLen, y + photoH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + photoW, y + photoH);
      ctx.lineTo(x + photoW, y + photoH + markLen);
      ctx.stroke();
    }
  }

  return { canvas: sheetCanvas, photosPerSheet: count, columns: cols, rows };
}
