import { describe, expect, it } from "vitest";
import {
  analyzePdfDamage,
  buildRepairLog,
  type PdfRepairResult,
} from "@/features/docs/pdf-studio/utils/pdf-repair";

describe("pdf repair utilities", () => {
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
      filename: "broken-file-repaired",
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
});
