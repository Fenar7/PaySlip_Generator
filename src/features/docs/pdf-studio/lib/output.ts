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
