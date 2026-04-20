import { describe, expect, it } from "vitest";
import {
  buildPdfStudioAcceptString,
  buildPdfStudioUploadSummary,
  classifyPdfStudioFile,
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
    });

    expect(
      validatePdfStudioFiles("fill-sign", [
        new File(["img"], "photo.png", { type: "image/png" }),
      ]),
    ).toEqual({
      ok: false,
      error:
        "photo.png is not supported for Fill & Sign. Accepted inputs: PDF.",
    });

    expect(validatePdfStudioPageCount("pdf-to-image", 21)).toEqual({
      ok: false,
      error: "This PDF has 21 pages. PDF to Image supports up to 20 pages per run.",
    });
  });

  it("builds shared accept strings and upload summaries from the registry", () => {
    expect(buildPdfStudioAcceptString("merge")).toContain("application/pdf");
    expect(buildPdfStudioUploadSummary("create")).toBe(
      "images • up to 30 files • max 50MB each",
    );
  });
});
