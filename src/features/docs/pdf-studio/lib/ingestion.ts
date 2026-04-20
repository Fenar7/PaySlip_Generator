import { getPdfStudioTool } from "@/features/docs/pdf-studio/lib/tool-registry";
import type {
  PdfStudioFileClass,
  PdfStudioToolId,
} from "@/features/docs/pdf-studio/types";

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const OFFICE_EXTENSIONS = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
const HTML_EXTENSIONS = [".html", ".htm"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

function getLowercaseExtension(filename: string) {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return ext.startsWith(".") ? ext : "";
}

export function classifyPdfStudioFile(
  file: Pick<File, "name" | "type">,
  options?: { scannedPdf?: boolean },
): PdfStudioFileClass | null {
  const mime = file.type.toLowerCase();
  const ext = getLowercaseExtension(file.name);

  if (mime === "application/pdf" || ext === ".pdf") {
    return options?.scannedPdf ? "scanned-pdf" : "pdf";
  }

  if (IMAGE_MIME_TYPES.has(mime) || IMAGE_EXTENSIONS.includes(ext)) {
    return "image";
  }

  if (
    mime === "text/html" ||
    mime === "application/xhtml+xml" ||
    HTML_EXTENSIONS.includes(ext)
  ) {
    return "html";
  }

  if (
    OFFICE_EXTENSIONS.includes(ext) ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("powerpoint") ||
    mime.includes("officedocument")
  ) {
    return "office";
  }

  return null;
}

export function buildPdfStudioAcceptString(toolId: PdfStudioToolId) {
  const tool = getPdfStudioTool(toolId);
  const accepts = new Set<string>();

  for (const inputType of tool.inputTypes) {
    if (inputType === "pdf" || inputType === "scanned-pdf") {
      accepts.add(".pdf");
      accepts.add("application/pdf");
    }
    if (inputType === "image") {
      for (const ext of IMAGE_EXTENSIONS) accepts.add(ext);
      for (const mime of IMAGE_MIME_TYPES) accepts.add(mime);
    }
    if (inputType === "office") {
      for (const ext of OFFICE_EXTENSIONS) accepts.add(ext);
    }
    if (inputType === "html") {
      for (const ext of HTML_EXTENSIONS) accepts.add(ext);
      accepts.add("text/html");
    }
  }

  return Array.from(accepts).join(",");
}

function formatAcceptedInputClasses(classes: PdfStudioFileClass[]) {
  const labels = classes.map((value) => {
    switch (value) {
      case "pdf":
        return "PDF";
      case "scanned-pdf":
        return "scanned PDF";
      case "image":
        return "images";
      case "office":
        return "Office files";
      case "html":
        return "HTML";
    }
  });

  return labels.join(", ");
}

export function buildPdfStudioUploadSummary(toolId: PdfStudioToolId) {
  const tool = getPdfStudioTool(toolId);
  const parts = [
    formatAcceptedInputClasses(tool.inputTypes),
    tool.limits.maxFiles === 1
      ? "1 file"
      : `up to ${tool.limits.maxFiles} files`,
    `max ${tool.limits.maxSizeMb}MB each`,
  ];

  if (tool.limits.maxPages) {
    parts.push(`up to ${tool.limits.maxPages} pages`);
  }

  return parts.join(" • ");
}

export type PdfStudioFileValidationResult =
  | {
      ok: true;
      files: File[];
      fileClasses: PdfStudioFileClass[];
      totalBytes: number;
    }
  | { ok: false; error: string };

export function validatePdfStudioFiles(
  toolId: PdfStudioToolId,
  fileList: FileList | File[],
  options?: { currentFileCount?: number },
): PdfStudioFileValidationResult {
  const tool = getPdfStudioTool(toolId);
  const files = Array.from(fileList);
  const currentFileCount = options?.currentFileCount ?? 0;

  if (files.length === 0) {
    return { ok: false, error: `Add at least one file for ${tool.title}.` };
  }

  if (currentFileCount + files.length > tool.limits.maxFiles) {
    return {
      ok: false,
      error:
        tool.limits.maxFiles === 1
          ? `${tool.title} accepts one file at a time.`
          : `${tool.title} accepts up to ${tool.limits.maxFiles} files per run.`,
    };
  }

  const oversizedFile = files.find(
    (file) => file.size > tool.limits.maxSizeMb * 1024 * 1024,
  );
  if (oversizedFile) {
    return {
      ok: false,
      error: `${oversizedFile.name} exceeds the ${tool.limits.maxSizeMb}MB upload limit for ${tool.title}.`,
    };
  }

  const fileClasses: PdfStudioFileClass[] = [];
  for (const file of files) {
    const fileClass = classifyPdfStudioFile(file);
    if (!fileClass || !tool.inputTypes.includes(fileClass)) {
      return {
        ok: false,
        error: `${file.name} is not supported for ${tool.title}. Accepted inputs: ${formatAcceptedInputClasses(tool.inputTypes)}.`,
      };
    }
    fileClasses.push(fileClass);
  }

  return {
    ok: true,
    files,
    fileClasses,
    totalBytes: files.reduce((sum, file) => sum + file.size, 0),
  };
}

export function validatePdfStudioPageCount(
  toolId: PdfStudioToolId,
  pageCount: number,
) {
  const tool = getPdfStudioTool(toolId);
  if (!tool.limits.maxPages || pageCount <= tool.limits.maxPages) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    error: `This PDF has ${pageCount} pages. ${tool.title} supports up to ${tool.limits.maxPages} pages per run.`,
  };
}
