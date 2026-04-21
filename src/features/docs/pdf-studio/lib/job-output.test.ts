import { describe, expect, it } from "vitest";
import {
  buildPdfStudioPageRangeVariant,
  buildPdfStudioOutputName,
  buildPdfStudioPartName,
  buildPdfStudioSegmentName,
} from "@/features/docs/pdf-studio/lib/output";
import { buildRenamedPdfFilename } from "@/features/docs/pdf-studio/utils/pdf-rename";

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

    expect(
      buildPdfStudioOutputName({
        toolId: "editor",
        baseName: "Board Pack",
        extension: "pdf",
      }),
    ).toBe("Board-Pack.pdf");

    expect(
      buildPdfStudioOutputName({
        toolId: "flatten",
        baseName: "Offer Letter",
        extension: "pdf",
      }),
    ).toBe("Offer-Letter.pdf");
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

  it("builds deterministic rename and finishing output names", () => {
    expect(
      buildPdfStudioOutputName({
        toolId: "bates",
        baseName: "Matter 2026",
        extension: "pdf",
      }),
    ).toBe("Matter-2026.pdf");

    expect(
      buildPdfStudioOutputName({
        toolId: "n-up",
        baseName: "Board Pack",
        variant: "4-up",
        extension: "pdf",
      }),
    ).toBe("Board-Pack-4-up.pdf");

    expect(
      buildRenamedPdfFilename("Client Closing Binder.pdf", {
        prefix: "final-",
        suffix: "-signed",
        replaceSpacesWith: "-",
        caseStyle: "lower",
      }),
    ).toBe("final-client-closing-binder-signed.pdf");
  });

  it("builds deterministic Phase 32 export names across browser and processing tools", () => {
    expect(
      buildPdfStudioOutputName({
        toolId: "watermark",
        baseName: "Draft Contract",
        extension: "pdf",
      }),
    ).toBe("Draft-Contract.pdf");

    expect(
      buildPdfStudioOutputName({
        toolId: "grayscale",
        baseName: "Client Deck",
        variant: "batch-02",
        extension: "pdf",
      }),
    ).toBe("Client-Deck-batch-02.pdf");

    expect(
      buildPdfStudioOutputName({
        toolId: "pdf-to-image",
        baseName: "Board Packet",
        variant: "page-01-png",
        extension: "png",
      }),
    ).toBe("Board-Packet-page-01-png.png");

    expect(
      buildPdfStudioOutputName({
        toolId: "pdf-to-text",
        baseName: "Signed Scan",
        extension: "txt",
      }),
    ).toBe("Signed-Scan.txt");

    expect(
      buildPdfStudioOutputName({
        toolId: "pdf-to-word",
        baseName: "Matter File",
        extension: "docx",
      }),
    ).toBe("Matter-File.docx");

    expect(
      buildPdfStudioOutputName({
        toolId: "word-to-pdf",
        baseName: "Engagement Letter",
        extension: "pdf",
      }),
    ).toBe("Engagement-Letter.pdf");

    expect(
      buildPdfStudioOutputName({
        toolId: "html-to-pdf",
        baseName: "Invoice Portal",
        extension: "pdf",
      }),
    ).toBe("Invoice-Portal.pdf");
  });
});
