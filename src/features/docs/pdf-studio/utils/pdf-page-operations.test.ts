import { describe, expect, it } from "vitest";
import { PDFDocument, degrees } from "pdf-lib";
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
        previewBytes: 1,
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
        previewBytes: 1,
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
        previewBytes: 1,
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

  it("composes user rotation with existing source page rotation metadata", async () => {
    const sourceDocumentFile = await PDFDocument.create();
    sourceDocumentFile.addPage([400, 600]).setRotation(degrees(90));
    const sourceBytes = await sourceDocumentFile.save();
    const sourceDocument = buildPdfSourceDocument({
      bytes: sourceBytes,
      name: "pre-rotated.pdf",
      pages: [
        {
          pageIndex: 0,
          previewBytes: 1,
          previewUrl: "",
          widthPt: 400,
          heightPt: 600,
          sourcePdfName: "pre-rotated.pdf",
        },
      ],
      sourceIndex: 0,
    });

    const [page] = buildPdfPageDescriptors([sourceDocument]);
    const [rotatedPage] = rotatePdfPageDescriptors([page], new Set([page.id]), 90);
    const exportedBytes = await exportPdfFromPageDescriptors([rotatedPage], [sourceDocument]);
    const exportedDocument = await PDFDocument.load(exportedBytes);

    expect(exportedDocument.getPages()[0].getRotation().angle).toBe(180);
  });

  it("repeated right rotations compose correctly through a full 360°", () => {
    const sourceDocument = buildPdfSourceDocument({
      bytes: new Uint8Array(),
      name: "test.pdf",
      pages: [{ pageIndex: 0, previewBytes: 1, previewUrl: "", widthPt: 400, heightPt: 600, sourcePdfName: "test.pdf" }],
      sourceIndex: 0,
    });
    const [page] = buildPdfPageDescriptors([sourceDocument]);
    const ids = new Set([page.id]);

    const after90 = rotatePdfPageDescriptors([page], ids, 90);
    expect(after90[0].rotation).toBe(90);

    const after180 = rotatePdfPageDescriptors(after90, ids, 90);
    expect(after180[0].rotation).toBe(180);

    const after270 = rotatePdfPageDescriptors(after180, ids, 90);
    expect(after270[0].rotation).toBe(270);

    const after360 = rotatePdfPageDescriptors(after270, ids, 90);
    expect(after360[0].rotation).toBe(0);
  });

  it("left rotation delta composes correctly", () => {
    const sourceDocument = buildPdfSourceDocument({
      bytes: new Uint8Array(),
      name: "test.pdf",
      pages: [{ pageIndex: 0, previewBytes: 1, previewUrl: "", widthPt: 400, heightPt: 600, sourcePdfName: "test.pdf" }],
      sourceIndex: 0,
    });
    const [page] = buildPdfPageDescriptors([sourceDocument]);
    const ids = new Set([page.id]);

    const after = rotatePdfPageDescriptors([page], ids, -90);
    expect(after[0].rotation).toBe(270);

    const after2 = rotatePdfPageDescriptors(after, ids, -90);
    expect(after2[0].rotation).toBe(180);
  });

  it("only selected pages are rotated; unselected pages are unchanged", () => {
    const sourceDocument = buildPdfSourceDocument({
      bytes: new Uint8Array(),
      name: "test.pdf",
      pages: Array.from({ length: 3 }, (_, pageIndex) => ({
        pageIndex,
        previewBytes: 1,
        previewUrl: "",
        widthPt: 400,
        heightPt: 600,
        sourcePdfName: "test.pdf",
      })),
      sourceIndex: 0,
    });
    const pages = buildPdfPageDescriptors([sourceDocument]);
    const selectedIds = new Set([pages[0].id, pages[2].id]);

    const rotated = rotatePdfPageDescriptors(pages, selectedIds, 90);

    expect(rotated[0].rotation).toBe(90);
    expect(rotated[1].rotation).toBe(0);
    expect(rotated[2].rotation).toBe(90);
  });

  it("all-pages rotation (whole-document) rotates every page", () => {
    const sourceDocument = buildPdfSourceDocument({
      bytes: new Uint8Array(),
      name: "test.pdf",
      pages: Array.from({ length: 3 }, (_, pageIndex) => ({
        pageIndex,
        previewBytes: 1,
        previewUrl: "",
        widthPt: 400,
        heightPt: 600,
        sourcePdfName: "test.pdf",
      })),
      sourceIndex: 0,
    });
    const pages = buildPdfPageDescriptors([sourceDocument]);
    const allIds = new Set(pages.map((p) => p.id));

    const rotated = rotatePdfPageDescriptors(pages, allIds, 90);

    expect(rotated.every((p) => p.rotation === 90)).toBe(true);
  });

  it("export preserves zero rotation on unselected pages when only some pages are rotated", async () => {
    const sourceDocument = buildPdfSourceDocument({
      bytes: await createPdfBytes(2),
      name: "partial.pdf",
      pages: Array.from({ length: 2 }, (_, pageIndex) => ({
        pageIndex,
        previewBytes: 1,
        previewUrl: "",
        widthPt: 400,
        heightPt: 600,
        sourcePdfName: "partial.pdf",
      })),
      sourceIndex: 0,
    });

    const pages = buildPdfPageDescriptors([sourceDocument]);
    const rotated = rotatePdfPageDescriptors(pages, new Set([pages[0].id]), 90);

    const exportedBytes = await exportPdfFromPageDescriptors(rotated, [sourceDocument]);
    const exportedDocument = await PDFDocument.load(exportedBytes);

    expect(exportedDocument.getPages()[0].getRotation().angle).toBe(90);
    expect(exportedDocument.getPages()[1].getRotation().angle).toBe(0);
  });
});
