import { describe, expect, it } from "vitest";
import {
  buildPdfStudioAcceptString,
  buildPdfStudioUploadSummary,
  classifyPdfStudioFile,
  validatePdfStudioCombinedPageCount,
  validatePdfStudioFiles,
  validatePdfStudioPageCount,
} from "@/features/docs/pdf-studio/lib/ingestion";

describe("pdf studio ingestion helpers", () => {
  it("classifies supported file families", () => {
    expect(
      classifyPdfStudioFile(new File(["pdf"], "contract.pdf", { type: "application/pdf" })),
    ).toBe("pdf");
    expect(
      classifyPdfStudioFile(new File(["img"], "scan.heic", { type: "image/heic" })),
    ).toBe("image");
    expect(
      classifyPdfStudioFile(
        new File(["doc"], "proposal.docx", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      ),
    ).toBe("office");
    expect(
      classifyPdfStudioFile(new File(["html"], "index.html", { type: "text/html" })),
    ).toBe("html");
    expect(
      classifyPdfStudioFile(
        new File(["pdf"], "scan.pdf", { type: "application/pdf" }),
        { scannedPdf: true },
      ),
    ).toBe("scanned-pdf");
  });

  it("returns consistent validation errors for file and page limits", () => {
    const tooManyFiles = Array.from({ length: 11 }, (_, index) =>
      new File(["pdf"], `part-${index + 1}.pdf`, { type: "application/pdf" }),
    );

    expect(validatePdfStudioFiles("merge", tooManyFiles)).toEqual({
      ok: false,
      error: "Merge PDFs accepts up to 10 files per run.",
      reason: "too-many-files",
    });

    expect(
      validatePdfStudioFiles("fill-sign", [
        new File(["img"], "photo.png", { type: "image/png" }),
      ]),
    ).toEqual({
      ok: false,
      error:
        "Unsupported file type for Fill & Sign. Accepted inputs: PDF.",
      reason: "unsupported-file-type",
    });

    expect(validatePdfStudioPageCount("pdf-to-image", 21)).toEqual({
      ok: false,
      error: "This PDF has 21 pages. PDF to Image supports up to 20 pages per run.",
      reason: "page-limit-exceeded",
    });
  });

  it("builds shared accept strings and upload summaries from the registry", () => {
    expect(buildPdfStudioAcceptString("merge")).toContain("application/pdf");
    expect(buildPdfStudioUploadSummary("create")).toBe(
      "images • up to 30 files • max 50MB each",
    );
  });

  it("enforces exact combined-page boundaries for page-organization tools", () => {
    expect(validatePdfStudioPageCount("merge", 200)).toEqual({ ok: true });
    expect(validatePdfStudioCombinedPageCount("alternate-mix", 200)).toEqual({
      ok: true,
    });
    expect(validatePdfStudioCombinedPageCount("alternate-mix", 201)).toEqual({
      ok: false,
      error:
        "Alternate & Mix PDFs supports up to 200 total pages per run. This selection contains 201 pages.",
      reason: "page-limit-exceeded",
    });
  });
});
