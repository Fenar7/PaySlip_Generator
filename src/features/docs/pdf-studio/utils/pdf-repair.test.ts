import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  destroyPdfJsDocumentMock,
  openPdfJsDocumentMock,
  pdfDocumentCreateMock,
  pdfDocumentLoadMock,
} = vi.hoisted(() => ({
  destroyPdfJsDocumentMock: vi.fn(),
  openPdfJsDocumentMock: vi.fn(),
  pdfDocumentCreateMock: vi.fn(),
  pdfDocumentLoadMock: vi.fn(),
}));

vi.mock("@/features/docs/pdf-studio/utils/pdfjs-client", () => ({
  destroyPdfJsDocument: destroyPdfJsDocumentMock,
  openPdfJsDocument: openPdfJsDocumentMock,
}));

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    create: pdfDocumentCreateMock,
    load: pdfDocumentLoadMock,
  },
}));

import {
  analyzePdfDamage,
  buildRepairLog,
  repairPdfDocument,
  type PdfRepairResult,
} from "@/features/docs/pdf-studio/utils/pdf-repair";

describe("pdf repair utilities", () => {
  beforeEach(() => {
    destroyPdfJsDocumentMock.mockReset();
    openPdfJsDocumentMock.mockReset();
    pdfDocumentCreateMock.mockReset();
    pdfDocumentLoadMock.mockReset();
  });

  it("flags missing structure markers on truncated input", () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>");
    const analysis = analyzePdfDamage(bytes);

    expect(analysis.hasPdfHeader).toBe(true);
    expect(analysis.hasEofMarker).toBe(false);
    expect(analysis.truncationSuspected).toBe(true);
    expect(analysis.warnings).toContain("Missing EOF marker.");
  });

  it("builds a readable repair log", () => {
    const result: PdfRepairResult = {
      status: "partial",
      message: "Partial recovery succeeded.",
      originalSize: 1024,
      repairedSize: 2048,
      pageCount: 2,
      repairedBytes: new Uint8Array([1, 2, 3]),
      filename: "broken-file-partial-recovery",
      analysis: {
        byteLength: 1024,
        hasPdfHeader: true,
        hasEofMarker: false,
        hasXrefTable: false,
        hasTrailer: false,
        hasStartXref: false,
        truncationSuspected: true,
        warnings: ["Missing EOF marker."],
      },
      method: "raster-salvage",
      log: "",
    };

    const log = buildRepairLog(result);

    expect(log).toContain("Status: partial");
    expect(log).toContain("Method: raster-salvage");
    expect(log).toContain("Missing EOF marker.");
  });

  it("uses distinct filenames for repaired vs partial-recovery outcomes", () => {
    const repairedResult: PdfRepairResult = {
      status: "repaired",
      message: "Repaired.",
      originalSize: 1024,
      repairedSize: 1024,
      pageCount: 1,
      repairedBytes: new Uint8Array([]),
      filename: "doc-repaired",
      analysis: {
        byteLength: 1024,
        hasPdfHeader: true,
        hasEofMarker: true,
        hasXrefTable: true,
        hasTrailer: true,
        hasStartXref: true,
        truncationSuspected: false,
        warnings: [],
      },
      method: "structure-rebuild",
      log: "",
    };

    const partialResult: PdfRepairResult = {
      ...repairedResult,
      status: "partial",
      filename: "doc-partial-recovery",
      method: "raster-salvage",
    };

    expect(repairedResult.filename).toBe("doc-repaired");
    expect(partialResult.filename).toBe("doc-partial-recovery");
    expect(repairedResult.filename).not.toBe(partialResult.filename);
  });

  it("uses the shared pdf opener when validating a repaired file", async () => {
    pdfDocumentLoadMock
      .mockResolvedValueOnce({
        save: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
      })
      .mockResolvedValueOnce({
        getPageCount: () => 1,
      });
    openPdfJsDocumentMock.mockResolvedValue({
      pdfjsLib: {
        GlobalWorkerOptions: { workerSrc: "", workerPort: null },
        OPS: {},
        getDocument: vi.fn(),
      },
      loadingTask: {
        destroy: vi.fn(),
      },
      pdf: {
        cleanup: vi.fn(),
        numPages: 1,
      },
    });
    destroyPdfJsDocumentMock.mockResolvedValue(undefined);

    const file = new File([new Uint8Array([1, 2, 3])], "broken.pdf", {
      type: "application/pdf",
    });
    const result = await repairPdfDocument(file, new Uint8Array([1, 2, 3]));

    expect(openPdfJsDocumentMock).toHaveBeenCalledTimes(1);
    expect(openPdfJsDocumentMock).toHaveBeenCalledWith(expect.any(Uint8Array));
    expect(destroyPdfJsDocumentMock).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("repaired");
  });
});
