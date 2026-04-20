import { PDFDocument } from "pdf-lib";

export interface PageRange {
  start: number;
  end: number;
}

export type SplitResult =
  | { ok: true; data: Uint8Array[] }
  | { ok: false; error: string };

export type SingleResult =
  | { ok: true; data: Uint8Array }
  | { ok: false; error: string };

export type ParseResult =
  | { ok: true; ranges: PageRange[] }
  | { ok: false; error: string };

export async function splitByRanges(
  pdfBytes: Uint8Array,
  ranges: PageRange[]
): Promise<SplitResult> {
  try {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const results: Uint8Array[] = [];
    for (const range of ranges) {
      const newDoc = await PDFDocument.create();
      const indices = Array.from(
        { length: range.end - range.start + 1 },
        (_, i) => range.start + i
      );
      const copiedPages = await newDoc.copyPages(srcDoc, indices);
      copiedPages.forEach((p) => newDoc.addPage(p));
      results.push(await newDoc.save());
    }
    return { ok: true, data: results };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to split PDF: ${msg}` };
  }
}

export async function splitByPageGroups(
  pdfBytes: Uint8Array,
  pageGroups: number[][],
): Promise<SplitResult> {
  try {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const results: Uint8Array[] = [];

    for (const pageGroup of pageGroups) {
      if (pageGroup.length === 0) {
        continue;
      }

      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(srcDoc, pageGroup);
      copiedPages.forEach((page) => newDoc.addPage(page));
      results.push(await newDoc.save());
    }

    return { ok: true, data: results };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to split PDF: ${msg}` };
  }
}

export async function splitEveryN(
  pdfBytes: Uint8Array,
  n: number
): Promise<SplitResult> {
  try {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const totalPages = srcDoc.getPageCount();
    const ranges: PageRange[] = [];
    for (let i = 0; i < totalPages; i += n) {
      ranges.push({ start: i, end: Math.min(i + n - 1, totalPages - 1) });
    }
    return splitByRanges(pdfBytes, ranges);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to split PDF: ${msg}` };
  }
}

export async function extractPages(
  pdfBytes: Uint8Array,
  pageIndices: number[]
): Promise<SingleResult> {
  try {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((p) => newDoc.addPage(p));
    return { ok: true, data: await newDoc.save() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to extract pages: ${msg}` };
  }
}

export async function deletePages(
  pdfBytes: Uint8Array,
  pagesToDelete: number[]
): Promise<SingleResult> {
  try {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const totalPages = srcDoc.getPageCount();
    const keepIndices = Array.from({ length: totalPages }, (_, i) => i).filter(
      (i) => !pagesToDelete.includes(i)
    );
    if (keepIndices.length === 0) {
      return { ok: false, error: "Cannot delete all pages" };
    }
    return extractPages(pdfBytes, keepIndices);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to delete pages: ${msg}` };
  }
}

export async function reorderPages(
  pdfBytes: Uint8Array,
  newOrder: number[]
): Promise<SingleResult> {
  try {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, newOrder);
    copiedPages.forEach((p) => newDoc.addPage(p));
    return { ok: true, data: await newDoc.save() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to reorder pages: ${msg}` };
  }
}

export async function mergePdfs(
  pdfBytesArray: Uint8Array[]
): Promise<SingleResult> {
  try {
    const mergedDoc = await PDFDocument.create();
    for (const pdfBytes of pdfBytesArray) {
      const srcDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedDoc.copyPages(
        srcDoc,
        srcDoc.getPageIndices()
      );
      copiedPages.forEach((p) => mergedDoc.addPage(p));
    }
    return { ok: true, data: await mergedDoc.save() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to merge PDFs: ${msg}` };
  }
}

export function parseRangeString(
  rangeStr: string,
  totalPages: number
): ParseResult {
  const parts = rangeStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { ok: false, error: "Please enter at least one range" };
  }
  const ranges: PageRange[] = [];
  for (const part of parts) {
    const dashParts = part.split("-").map((s) => s.trim());
    if (dashParts.length === 1) {
      const p = parseInt(dashParts[0], 10);
      if (isNaN(p) || p < 1 || p > totalPages) {
        return { ok: false, error: `Invalid page: ${dashParts[0]}` };
      }
      ranges.push({ start: p - 1, end: p - 1 });
    } else if (dashParts.length === 2) {
      const s = parseInt(dashParts[0], 10);
      const e =
        dashParts[1].toLowerCase() === "end"
          ? totalPages
          : parseInt(dashParts[1], 10);
      if (isNaN(s) || isNaN(e) || s < 1 || e < s || e > totalPages) {
        return { ok: false, error: `Invalid range: ${part}` };
      }
      ranges.push({ start: s - 1, end: e - 1 });
    } else {
      return { ok: false, error: `Invalid range format: ${part}` };
    }
  }
  return { ok: true, ranges };
}
