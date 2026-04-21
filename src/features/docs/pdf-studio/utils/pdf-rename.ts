import type { PdfRenameRuleSettings } from "@/features/docs/pdf-studio/types";

function stripPdfExtension(filename: string) {
  return filename.replace(/\.pdf$/i, "");
}

function normalizeWhitespace(value: string, separator: "-" | "_" | "none") {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (separator === "none") {
    return trimmed;
  }

  return trimmed.replace(/ /g, separator);
}

function applyCaseStyle(value: string, style: PdfRenameRuleSettings["caseStyle"]) {
  switch (style) {
    case "lower":
      return value.toLowerCase();
    case "upper":
      return value.toUpperCase();
    case "kebab":
      return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    case "snake":
      return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    case "original":
    default:
      return value;
  }
}

export function buildRenamedPdfFilename(
  originalFilename: string,
  rules: PdfRenameRuleSettings,
) {
  const baseName = stripPdfExtension(originalFilename);
  const withSpacing = normalizeWhitespace(baseName, rules.replaceSpacesWith);
  const cased = applyCaseStyle(withSpacing, rules.caseStyle);
  const nextName = `${rules.prefix}${cased}${rules.suffix}`.trim() || "renamed-document";
  return `${nextName}.pdf`;
}
