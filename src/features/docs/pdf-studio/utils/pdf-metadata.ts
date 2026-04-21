import { PDFDocument } from "pdf-lib";

export type PdfMetadataSnapshot = {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
};

export function normalizePdfMetadataValue(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function normalizePdfKeywords(
  value: string | string[] | undefined | null,
) {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean).join(", ");
  }

  return normalizePdfMetadataValue(value);
}

function serializePdfKeywords(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function readPdfMetadata(pdfBytes: Uint8Array) {
  const doc = await PDFDocument.load(pdfBytes);
  return {
    pageCount: doc.getPageCount(),
    metadata: {
      title: normalizePdfMetadataValue(doc.getTitle()),
      author: normalizePdfMetadataValue(doc.getAuthor()),
      subject: normalizePdfMetadataValue(doc.getSubject()),
      keywords: normalizePdfKeywords(doc.getKeywords()),
      creator: normalizePdfMetadataValue(doc.getCreator()),
      producer: normalizePdfMetadataValue(doc.getProducer()),
    } satisfies PdfMetadataSnapshot,
  };
}

export async function updatePdfMetadata(
  pdfBytes: Uint8Array,
  metadata: PdfMetadataSnapshot,
) {
  const doc = await PDFDocument.load(pdfBytes);
  doc.setTitle(metadata.title);
  doc.setAuthor(metadata.author);
  doc.setSubject(metadata.subject);
  doc.setKeywords(serializePdfKeywords(metadata.keywords));
  doc.setCreator(metadata.creator);
  doc.setProducer(metadata.producer);
  return doc.save();
}

export function diffPdfMetadata(
  current: PdfMetadataSnapshot,
  next: PdfMetadataSnapshot,
) {
  return (Object.keys(current) as Array<keyof PdfMetadataSnapshot>).map((key) => ({
    key,
    current: current[key],
    next: next[key],
    changed: current[key] !== next[key],
  }));
}
