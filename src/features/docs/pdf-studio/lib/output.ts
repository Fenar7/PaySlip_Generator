import { getPdfStudioTool } from "@/features/docs/pdf-studio/lib/tool-registry";
import type { PdfStudioToolId } from "@/features/docs/pdf-studio/types";

function sanitizeBaseName(value: string) {
  return value
    .trim()
    .replace(/\.[^.]+$/u, "")
    .replace(/[^\w.-]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");
}

export function getPdfStudioSourceBaseName(filename: string, fallback: string) {
  return sanitizeBaseName(filename) || sanitizeBaseName(fallback) || "document";
}

export function buildPdfStudioPageRangeVariant(options: {
  startPage: number;
  endPage: number;
  totalPages?: number;
}) {
  const width = Math.max(
    2,
    String(Math.max(options.totalPages ?? options.endPage, options.endPage)).length,
  );
  const startPage = String(options.startPage).padStart(width, "0");
  const endPage = String(options.endPage).padStart(width, "0");

  return options.startPage === options.endPage
    ? `page-${startPage}`
    : `pages-${startPage}-${endPage}`;
}

export function buildPdfStudioOutputName(options: {
  toolId: PdfStudioToolId;
  baseName?: string;
  variant?: string;
  extension: string;
}) {
  const tool = getPdfStudioTool(options.toolId);
  const baseName = sanitizeBaseName(options.baseName ?? tool.defaultOutputBase) || "document";
  const variant = options.variant ? `-${sanitizeBaseName(options.variant)}` : "";
  const normalizedExtension = options.extension.replace(/^\./u, "");
  return `${baseName}${variant}.${normalizedExtension}`;
}

export function buildPdfStudioPartName(options: {
  toolId: PdfStudioToolId;
  baseName?: string;
  part: number;
  extension: string;
}) {
  return buildPdfStudioOutputName({
    toolId: options.toolId,
    baseName: options.baseName,
    variant: `part-${String(options.part).padStart(2, "0")}`,
    extension: options.extension,
  });
}

export function buildPdfStudioSegmentName(options: {
  toolId: PdfStudioToolId;
  baseName?: string;
  startPage: number;
  endPage: number;
  totalPages?: number;
  label?: string;
  extension: string;
}) {
  return buildPdfStudioOutputName({
    toolId: options.toolId,
    baseName: options.baseName,
    variant:
      options.label ??
      buildPdfStudioPageRangeVariant({
        startPage: options.startPage,
        endPage: options.endPage,
        totalPages: options.totalPages,
      }),
    extension: options.extension,
  });
}
