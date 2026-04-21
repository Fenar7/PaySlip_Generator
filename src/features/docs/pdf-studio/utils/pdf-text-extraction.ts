"use client";

import type {
  PdfTextExtractionMode,
  PdfTextExtractionResult,
} from "@/features/docs/pdf-studio/types";
import { renderPdfPagesToImages } from "@/features/docs/pdf-studio/utils/pdf-to-image";
import { processImageForOcr } from "@/features/docs/pdf-studio/utils/ocr-processor";
import { validatePdfStudioPageCount } from "@/features/docs/pdf-studio/lib/ingestion";

async function extractSelectableText(pdfBytes: Uint8Array) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
  const pageValidation = validatePdfStudioPageCount("pdf-to-text", pdf.numPages);
  if (!pageValidation.ok) {
    await pdf.destroy();
    throw new Error(pageValidation.error);
  }

  const parts: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
    parts.push(lines);
    page.cleanup();
  }

  await pdf.destroy();
  return {
    text: parts.filter(Boolean).join("\n\n").trim(),
    pageCount: pdf.numPages,
  };
}

async function extractTextWithOcr(
  pdfBytes: Uint8Array,
  onProgress?: (current: number, total: number) => void,
) {
  const rendered = await renderPdfPagesToImages(
    pdfBytes,
    { format: "png", dpi: 150 },
    onProgress,
  );
  if (!rendered.ok) {
    throw new Error(rendered.error);
  }

  const textParts: string[] = [];
  for (let index = 0; index < rendered.data.length; index += 1) {
    const page = rendered.data[index];
    const text = await processImageForOcr(page.blob, `pdf-text-${index}`);
    textParts.push(text.trim());
  }

  return {
    text: textParts.filter(Boolean).join("\n\n").trim(),
    pageCount: rendered.data.length,
  };
}

export async function extractPdfText(
  pdfBytes: Uint8Array,
  mode: PdfTextExtractionMode,
  onProgress?: (current: number, total: number) => void,
): Promise<PdfTextExtractionResult> {
  const selectable = await extractSelectableText(pdfBytes);

  if (mode === "selectable") {
    return {
      mode: "selectable",
      text: selectable.text,
      pageCount: selectable.pageCount,
      usedOcr: false,
    };
  }

  if (mode === "auto" && selectable.text.length > 40) {
    return {
      mode: "selectable",
      text: selectable.text,
      pageCount: selectable.pageCount,
      usedOcr: false,
    };
  }

  const ocr = await extractTextWithOcr(pdfBytes, onProgress);
  return {
    mode: "ocr",
    text: ocr.text,
    pageCount: ocr.pageCount,
    usedOcr: true,
  };
}
