import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  buildPdfPageDescriptors,
  buildPdfSourceDocument,
  exportPdfFromPageDescriptors,
  interleavePdfPageDescriptors,
  rotatePdfPageDescriptors,
} from "@/features/docs/pdf-studio/utils/pdf-page-operations";

async function createPdfBytes(pageCount: number) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    document.addPage([400, 600]);
  }
  return document.save();
}

describe("pdf page operations", () => {
  it("interleaves source documents using per-file block sizes", async () => {
    const firstDocument = buildPdfSourceDocument({
      bytes: await createPdfBytes(3),
      name: "Invoices.pdf",
      pages: Array.from({ length: 3 }, (_, pageIndex) => ({
        pageIndex,
        previewUrl: "",
        widthPt: 400,
        heightPt: 600,
        sourcePdfName: "Invoices.pdf",
      })),
      sourceIndex: 0,
    });
    const secondDocument = buildPdfSourceDocument({
      bytes: await createPdfBytes(2),
      name: "Cover-Sheets.pdf",
      pages: Array.from({ length: 2 }, (_, pageIndex) => ({
        pageIndex,
        previewUrl: "",
        widthPt: 400,
        heightPt: 600,
        sourcePdfName: "Cover-Sheets.pdf",
      })),
      sourceIndex: 1,
    });

    const mixedPages = interleavePdfPageDescriptors({
      sourceDocuments: [firstDocument, secondDocument],
      blockSizesBySource: {
        [firstDocument.id]: 2,
        [secondDocument.id]: 1,
      },
    });

    expect(
      mixedPages.map((page) => `${page.sourceLabel}:${page.originalPageNumber}`),
    ).toEqual([
      "Invoices:1",
      "Invoices:2",
      "Cover-Sheets:1",
      "Invoices:3",
      "Cover-Sheets:2",
    ]);
  });

  it("exports reordered pages while preserving requested rotation", async () => {
    const sourceDocument = buildPdfSourceDocument({
      bytes: await createPdfBytes(2),
      name: "sample.pdf",
      pages: Array.from({ length: 2 }, (_, pageIndex) => ({
        pageIndex,
        previewUrl: "",
        widthPt: 400,
        heightPt: 600,
        sourcePdfName: "sample.pdf",
      })),
      sourceIndex: 0,
    });

    const pages = buildPdfPageDescriptors([sourceDocument]);
    const rotatedPages = rotatePdfPageDescriptors(
      [pages[1], pages[0]],
      new Set([pages[1].id]),
      90,
    );

    const exportedBytes = await exportPdfFromPageDescriptors(rotatedPages, [sourceDocument]);
    const exportedDocument = await PDFDocument.load(exportedBytes);

    expect(exportedDocument.getPageCount()).toBe(2);
    expect(exportedDocument.getPages()[0].getRotation().angle).toBe(90);
  });
});
