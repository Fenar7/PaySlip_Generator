import { PDFDocument, degrees } from "pdf-lib";
import { getPdfStudioSourceBaseName } from "@/features/docs/pdf-studio/lib/output";
import type { PdfPageItem } from "@/features/docs/pdf-studio/utils/pdf-reader";

export type PdfSourceDocument = {
  id: string;
  name: string;
  bytes: Uint8Array;
  pages: PdfPageItem[];
  sourceLabel: string;
};

export type PdfPageDescriptor = PdfPageItem & {
  id: string;
  originalPageNumber: number;
  rotation?: number;
  sourceDocumentId: string;
  sourceLabel: string;
};

export function buildPdfSourceDocument(options: {
  bytes: Uint8Array;
  name: string;
  pages: PdfPageItem[];
  sourceIndex: number;
}) {
  const sourceLabel = getPdfStudioSourceBaseName(
    options.name,
    `document-${options.sourceIndex + 1}`,
  );

  return {
    id: `doc-${options.sourceIndex + 1}-${sourceLabel}`,
    name: options.name,
    bytes: options.bytes,
    pages: options.pages,
    sourceLabel,
  } satisfies PdfSourceDocument;
}

export function buildPdfPageDescriptors(
  sourceDocuments: PdfSourceDocument[],
): PdfPageDescriptor[] {
  return sourceDocuments.flatMap((document) =>
    document.pages.map((page) => ({
      ...page,
      id: `${document.id}-page-${page.pageIndex + 1}`,
      originalPageNumber: page.pageIndex + 1,
      rotation: 0,
      sourceDocumentId: document.id,
      sourceLabel: document.sourceLabel,
    })),
  );
}

export function rotatePdfPageDescriptors(
  pages: PdfPageDescriptor[],
  ids: Set<string>,
  delta: 90 | -90,
) {
  return pages.map((page) => {
    if (!ids.has(page.id)) {
      return page;
    }

    const rotation = ((page.rotation ?? 0) + delta + 360) % 360;
    return { ...page, rotation };
  });
}

export function interleavePdfPageDescriptors(options: {
  sourceDocuments: PdfSourceDocument[];
  blockSizesBySource: Record<string, number>;
}) {
  const orderedPages = options.sourceDocuments.map((document) => ({
    document,
    cursor: 0,
    pages: buildPdfPageDescriptors([document]),
  }));
  const result: PdfPageDescriptor[] = [];

  while (orderedPages.some((entry) => entry.cursor < entry.pages.length)) {
    for (const entry of orderedPages) {
      const blockSize = Math.max(1, options.blockSizesBySource[entry.document.id] ?? 1);
      const nextPages = entry.pages.slice(entry.cursor, entry.cursor + blockSize);
      result.push(...nextPages);
      entry.cursor += nextPages.length;
    }
  }

  return result;
}

export async function exportPdfFromPageDescriptors(
  pages: PdfPageDescriptor[],
  sourceDocuments: PdfSourceDocument[],
) {
  const nextDocument = await PDFDocument.create();
  const sourceById = new Map(sourceDocuments.map((document) => [document.id, document]));
  const loadedDocuments = new Map<string, PDFDocument>();

  for (const page of pages) {
    const sourceDocument = sourceById.get(page.sourceDocumentId);
    if (!sourceDocument) {
      continue;
    }

    let loadedDocument = loadedDocuments.get(sourceDocument.id);
    if (!loadedDocument) {
      loadedDocument = await PDFDocument.load(sourceDocument.bytes);
      loadedDocuments.set(sourceDocument.id, loadedDocument);
    }

    const [copiedPage] = await nextDocument.copyPages(loadedDocument, [page.pageIndex]);
    const rotation = page.rotation ?? 0;
    if (rotation !== 0) {
      copiedPage.setRotation(degrees(rotation));
    }
    nextDocument.addPage(copiedPage);
  }

  return nextDocument.save();
}
