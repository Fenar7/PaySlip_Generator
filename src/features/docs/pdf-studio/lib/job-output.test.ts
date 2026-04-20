import { describe, expect, it } from "vitest";
import {
  buildPdfStudioPageRangeVariant,
  buildPdfStudioOutputName,
  buildPdfStudioPartName,
  buildPdfStudioSegmentName,
} from "@/features/docs/pdf-studio/lib/output";

describe("pdf studio output helpers", () => {
  it("normalizes output naming across the catalog", () => {
    expect(
      buildPdfStudioOutputName({
        toolId: "merge",
        baseName: " April Board Pack ",
        extension: "pdf",
      }),
    ).toBe("April-Board-Pack.pdf");

    expect(
      buildPdfStudioPartName({
        toolId: "split",
        baseName: "quarterly-report",
        part: 2,
        extension: "pdf",
      }),
    ).toBe("quarterly-report-part-02.pdf");
  });

  it("builds deterministic page-range names for split-style outputs", () => {
    expect(
      buildPdfStudioPageRangeVariant({
        startPage: 3,
        endPage: 12,
        totalPages: 120,
      }),
    ).toBe("pages-003-012");

    expect(
      buildPdfStudioSegmentName({
        toolId: "extract-pages",
        baseName: "Board Pack",
        startPage: 7,
        endPage: 7,
        totalPages: 120,
        extension: "pdf",
      }),
    ).toBe("Board-Pack-page-007.pdf");
  });
});
