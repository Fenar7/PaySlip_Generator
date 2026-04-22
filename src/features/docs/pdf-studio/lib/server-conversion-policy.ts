import JSZip from "jszip";
import type {
  PdfStudioConversionJsonObject,
  PdfStudioServerConversionTargetFormat,
  PdfStudioServerConversionToolId,
} from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { PdfStudioConversionError } from "@/features/docs/pdf-studio/lib/conversion-errors";
import { classifyPdfStudioFile, validatePdfStudioPageCount } from "@/features/docs/pdf-studio/lib/ingestion";
import { getPdfStudioTool } from "@/features/docs/pdf-studio/lib/tool-registry";

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const HTML_MIME_TYPES = new Set(["text/html", "application/xhtml+xml"]);
const PDF_MIME_TYPES = new Set(["application/pdf"]);
const ALLOWED_PAGE_SIZES = new Set(["A4", "Letter", "Legal"]);
const MARGIN_PATTERN = /^\d+(\.\d+)?(mm|cm|in|px)$/i;
const MAX_HTML_DOM_NODES = 5_000;
const MAX_HTML_TEXT_LENGTH = 500_000;

const SERVER_CONVERSION_SPECS: Record<
  PdfStudioServerConversionToolId,
  {
    targetFormat: PdfStudioServerConversionTargetFormat;
    label: string;
    extensions: string[];
    mimeTypes: Set<string>;
    acceptsSourceUrl?: boolean;
    requiresPdfInspection?: boolean;
  }
> = {
  "pdf-to-word": {
    targetFormat: "docx",
    label: "PDF",
    extensions: [".pdf"],
    mimeTypes: PDF_MIME_TYPES,
    requiresPdfInspection: true,
  },
  "pdf-to-excel": {
    targetFormat: "xlsx",
    label: "PDF",
    extensions: [".pdf"],
    mimeTypes: PDF_MIME_TYPES,
    requiresPdfInspection: true,
  },
  "pdf-to-ppt": {
    targetFormat: "pptx",
    label: "PDF",
    extensions: [".pdf"],
    mimeTypes: PDF_MIME_TYPES,
    requiresPdfInspection: true,
  },
  "word-to-pdf": {
    targetFormat: "pdf",
    label: "DOCX",
    extensions: [".docx"],
    mimeTypes: new Set([DOCX_MIME_TYPE]),
  },
  "html-to-pdf": {
    targetFormat: "pdf",
    label: "HTML",
    extensions: [".html", ".htm"],
    mimeTypes: HTML_MIME_TYPES,
  },
};

export const PDF_STUDIO_CONVERSION_ACTIVE_JOB_LIMIT = 3;
export const PDF_STUDIO_CONVERSION_RESULT_TTL_MS = 24 * 60 * 60 * 1000;
export const PDF_STUDIO_CONVERSION_RECORD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const PDF_STUDIO_CONVERSION_DEAD_LETTER_RETENTION_MS = 60 * 60 * 1000;
export const PDF_STUDIO_HTML_RENDER_TIMEOUT_MS = 15_000;
export const PDF_STUDIO_HTML_MAX_DOM_NODES = MAX_HTML_DOM_NODES;
export const PDF_STUDIO_HTML_MAX_TEXT_LENGTH = MAX_HTML_TEXT_LENGTH;

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

function normalizeMimeType(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function looksLikePdf(bytes: Uint8Array) {
  return Buffer.from(bytes.subarray(0, 5)).toString("utf8") === "%PDF-";
}

function looksLikeZip(bytes: Uint8Array) {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function decodeUtf8(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("utf8");
}

function assertSupportedOptions(toolId: PdfStudioServerConversionToolId, options: PdfStudioConversionJsonObject) {
  if (options.pageSize != null) {
    if (typeof options.pageSize !== "string" || !ALLOWED_PAGE_SIZES.has(options.pageSize)) {
      throw new PdfStudioConversionError({
        code: "unsupported_input",
        message: `Use one of these page sizes for ${getPdfStudioTool(toolId).title}: A4, Letter, or Legal.`,
      });
    }
  }

  if (options.margin != null) {
    if (typeof options.margin !== "string" || !MARGIN_PATTERN.test(options.margin)) {
      throw new PdfStudioConversionError({
        code: "unsupported_input",
        message: "Margins must be provided as a single CSS print unit such as 10mm or 0.5in.",
      });
    }
  }

  if (options.preferPrintCss != null && typeof options.preferPrintCss !== "boolean") {
    throw new PdfStudioConversionError({
      code: "unsupported_input",
      message: "preferPrintCss must be true or false.",
    });
  }
}

function classifyPdfLoadError(error: unknown): never {
  if (error instanceof Error && error.name === "PasswordException") {
    throw new PdfStudioConversionError({
      code: "password_protected",
      message: "This PDF is password-protected. Unlock it first, then retry the conversion.",
      status: 422,
    });
  }

  throw new PdfStudioConversionError({
    code: "malformed_pdf",
    message: "This PDF is malformed or unsupported. Repair the PDF, then retry the conversion.",
    status: 422,
  });
}

async function inspectPdfDocument(sourceBytes: Uint8Array) {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjsLib.getDocument({
      data: sourceBytes,
      disableWorker: true,
    }).promise;
    const pageCount = pdf.numPages;
    await pdf.destroy();
    return { pageCount };
  } catch (error) {
    classifyPdfLoadError(error);
  }
}

async function assertDocxPackage(sourceBytes: Uint8Array) {
  if (!looksLikeZip(sourceBytes)) {
    throw new PdfStudioConversionError({
      code: "malformed_docx",
      message: "Upload a valid DOCX file. Legacy .doc files and non-DOCX packages are not supported here.",
      status: 422,
    });
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(sourceBytes);
  } catch {
    throw new PdfStudioConversionError({
      code: "malformed_docx",
      message: "Upload a valid DOCX file. The uploaded package could not be opened.",
      status: 422,
    });
  }

  if (!zip.file("[Content_Types].xml") || !zip.file("word/document.xml")) {
    throw new PdfStudioConversionError({
      code: "malformed_docx",
      message: "Upload a DOCX document generated by Word or a compatible editor.",
      status: 422,
    });
  }

  if (zip.file("word/vbaProject.bin")) {
    throw new PdfStudioConversionError({
      code: "unsupported_input",
      message: "Macro-enabled Word documents are not supported for Word to PDF. Save the file as a standard DOCX and retry.",
      status: 422,
    });
  }
}

function assertSelfContainedHtml(sourceBytes: Uint8Array) {
  const html = decodeUtf8(sourceBytes);
  const trimmedHtml = html.trimStart();

  if (!/^<!doctype html|^<html|^<body|^<head/i.test(trimmedHtml)) {
    throw new PdfStudioConversionError({
      code: "unsupported_input",
      message: "Upload a valid HTML document for HTML to PDF.",
      status: 422,
    });
  }

  const assetReferences = [
    ...html.matchAll(/<(?:img|script|iframe|audio|video|source|embed)\b[^>]*\bsrc=["']([^"']+)["']/gi),
    ...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi),
    ...html.matchAll(/\burl\(([^)]+)\)/gi),
  ]
    .map((match) => match[1]?.replace(/^['"]|['"]$/g, "").trim())
    .filter(Boolean) as string[];

  const hasExternalOrRelativeAsset = assetReferences.some((reference) => {
    const normalized = reference.toLowerCase();
    if (
      normalized.startsWith("data:") ||
      normalized.startsWith("blob:") ||
      normalized.startsWith("#") ||
      normalized.startsWith("about:")
    ) {
      return false;
    }

    return true;
  });

  if (hasExternalOrRelativeAsset) {
    throw new PdfStudioConversionError({
      code: "html_asset_blocked",
      message:
        "HTML to PDF only accepts self-contained HTML files. Inline images, fonts, and styles instead of referencing remote or relative assets.",
      status: 422,
    });
  }
}

export type ValidatedPdfStudioConversionRequest = {
  sourceFile?: File;
  sourceBytes?: Uint8Array;
  pageCount?: number;
  options: PdfStudioConversionJsonObject;
};

export type ValidatedPdfStudioConversionSource = {
  sourceFile: File;
  sourceBytes: Uint8Array;
  pageCount?: number;
};

export type ValidatedPdfStudioBatchConversionRequest = {
  sources: ValidatedPdfStudioConversionSource[];
  options: PdfStudioConversionJsonObject;
};

export async function validatePdfStudioConversionRequest(params: {
  toolId: PdfStudioServerConversionToolId;
  targetFormat: PdfStudioServerConversionTargetFormat;
  sourceFile?: File;
  sourceUrl?: string;
  options?: PdfStudioConversionJsonObject;
}): Promise<ValidatedPdfStudioConversionRequest> {
  const tool = getPdfStudioTool(params.toolId);
  const spec = SERVER_CONVERSION_SPECS[params.toolId];

  if (params.targetFormat !== spec.targetFormat) {
    throw new PdfStudioConversionError({
      code: "unsupported_input",
      message: `Unsupported output format for ${tool.title}.`,
    });
  }

  if (params.sourceUrl) {
    throw new PdfStudioConversionError({
      code: "html_remote_disabled",
      message:
        "Remote URL rendering is disabled for HTML to PDF. Upload a self-contained HTML file instead.",
      status: 422,
    });
  }

  if (!params.sourceFile) {
    throw new PdfStudioConversionError({
      code: "unsupported_input",
      message: `Upload a ${spec.label} file before starting ${tool.title}.`,
    });
  }

  const options = {
    pageSize: typeof params.options?.pageSize === "string" ? params.options.pageSize : undefined,
    margin: typeof params.options?.margin === "string" ? params.options.margin : undefined,
    preferPrintCss:
      typeof params.options?.preferPrintCss === "boolean"
        ? params.options.preferPrintCss
        : Boolean(params.options?.preferPrintCss ?? false),
  } satisfies PdfStudioConversionJsonObject;

  assertSupportedOptions(params.toolId, options);

  if (params.sourceFile.size > tool.limits.maxSizeMb * 1024 * 1024) {
    throw new PdfStudioConversionError({
      code: "file_too_large",
      message: `This file exceeds the ${tool.limits.maxSizeMb}MB upload limit for ${tool.title}.`,
      status: 413,
    });
  }

  const fileClass = classifyPdfStudioFile(params.sourceFile);
  if (!fileClass || !tool.inputTypes.includes(fileClass)) {
    throw new PdfStudioConversionError({
      code: "unsupported_input",
      message: `Unsupported file type for ${tool.title}. Upload a ${spec.label} file and retry.`,
      status: 422,
    });
  }

  const sourceBytes = new Uint8Array(await params.sourceFile.arrayBuffer());
  const extension = getFileExtension(params.sourceFile.name);
  const mimeType = normalizeMimeType(params.sourceFile.type);

  if (!spec.extensions.includes(extension)) {
    throw new PdfStudioConversionError({
      code: "unsupported_input",
      message: `${tool.title} only accepts ${spec.extensions.join(", ")} files.`,
      status: 422,
    });
  }

  if (mimeType && mimeType !== "application/octet-stream" && !spec.mimeTypes.has(mimeType)) {
    throw new PdfStudioConversionError({
      code: "unsupported_input",
      message: `${tool.title} rejected the uploaded file because its MIME type did not match ${spec.label}.`,
      status: 422,
    });
  }

  if (params.toolId.startsWith("pdf-to-")) {
    if (!looksLikePdf(sourceBytes)) {
      throw new PdfStudioConversionError({
        code: "unsupported_input",
        message: `${tool.title} only accepts real PDF files. Re-export the source as PDF and retry.`,
        status: 422,
      });
    }
  }

  if (params.toolId === "word-to-pdf") {
    await assertDocxPackage(sourceBytes);
  }

  if (params.toolId === "html-to-pdf") {
    assertSelfContainedHtml(sourceBytes);
  }

  if (spec.requiresPdfInspection) {
    const { pageCount } = await inspectPdfDocument(sourceBytes);
    const pageValidation = validatePdfStudioPageCount(params.toolId, pageCount);
    if (!pageValidation.ok) {
      throw new PdfStudioConversionError({
        code: "page_limit_exceeded",
        message: pageValidation.error,
        status: 422,
      });
    }
    return {
      sourceFile: params.sourceFile,
      sourceBytes,
      pageCount,
      options,
    };
  }

  return {
    sourceFile: params.sourceFile,
    sourceBytes,
    options,
  };
}

export async function validatePdfStudioBatchConversionRequest(params: {
  toolId: PdfStudioServerConversionToolId;
  targetFormat: PdfStudioServerConversionTargetFormat;
  sourceFiles: File[];
  options?: PdfStudioConversionJsonObject;
}): Promise<ValidatedPdfStudioBatchConversionRequest> {
  const tool = getPdfStudioTool(params.toolId);
  const validatedSources: ValidatedPdfStudioConversionSource[] = [];
  let combinedPages = 0;

  for (const sourceFile of params.sourceFiles) {
    const validated = await validatePdfStudioConversionRequest({
      toolId: params.toolId,
      targetFormat: params.targetFormat,
      sourceFile,
      options: params.options,
    });

    if (!validated.sourceFile || !validated.sourceBytes) {
      throw new PdfStudioConversionError({
        code: "unsupported_input",
        message: `Upload a supported file before starting ${tool.title}.`,
      });
    }

    validatedSources.push({
      sourceFile: validated.sourceFile,
      sourceBytes: validated.sourceBytes,
      pageCount: validated.pageCount,
    });

    if (typeof validated.pageCount === "number") {
      combinedPages += validated.pageCount;
    }
  }

  if (combinedPages > 0 && tool.limits.maxPages && combinedPages > tool.limits.maxPages) {
    throw new PdfStudioConversionError({
      code: "page_limit_exceeded",
      message: `${tool.title} supports up to ${tool.limits.maxPages} total pages per batch run. This selection contains ${combinedPages} pages.`,
      status: 422,
    });
  }

  return {
    sources: validatedSources,
    options:
      validatedSources[0]?.sourceFile != null
        ? {
            pageSize:
              typeof params.options?.pageSize === "string" ? params.options.pageSize : undefined,
            margin:
              typeof params.options?.margin === "string" ? params.options.margin : undefined,
            preferPrintCss:
              typeof params.options?.preferPrintCss === "boolean"
                ? params.options.preferPrintCss
                : Boolean(params.options?.preferPrintCss ?? false),
          }
        : {},
  };
}
