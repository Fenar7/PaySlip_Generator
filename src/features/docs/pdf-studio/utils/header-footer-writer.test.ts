import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  formatBatesNumber,
  formatPageNumberLabel,
  injectHeaderFooter,
  injectPageNumbers,
  shouldStampPage,
} from "@/features/docs/pdf-studio/utils/header-footer-writer";

async function createPdf(pageCount: number) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    document.addPage([400, 600]);
  }
  return document.save();
}

describe("header footer writer", () => {
  it("applies scope and first-page rules consistently", () => {
    expect(shouldStampPage(0, "all", false)).toBe(true);
    expect(shouldStampPage(0, "all", true)).toBe(false);
    expect(shouldStampPage(0, "odd", false)).toBe(true);
    expect(shouldStampPage(1, "odd", false)).toBe(false);
    expect(shouldStampPage(1, "even", false)).toBe(true);
  });

  it("formats page numbers and Bates labels deterministically", () => {
    expect(formatPageNumberLabel("page-number-of-total", 7, 18)).toBe(
      "Page 7 of 18",
    );
    expect(
      formatBatesNumber(3, {
        prefix: "BATES-",
        suffix: "-A",
        padding: 5,
        startFrom: 10,
      }),
    ).toBe("BATES-00012-A");
  });

  it("preserves page count when applying standalone numbers and headers", async () => {
    const source = await createPdf(3);
    const numbered = await injectPageNumbers(source, {
      filename: "sample",
      format: "page-number",
      position: "bottom-center",
      startFrom: 1,
      fontSize: 10,
      fontFamily: "helvetica",
      color: "#000000",
      marginMm: 12,
      scope: "all",
      skipFirstPage: false,
    });
    const headed = await injectHeaderFooter(numbered, {
      filename: "sample",
      header: {
        left: "{filename}",
        center: "",
        right: "{page}",
        fontSize: 10,
        fontFamily: "helvetica",
        color: "#000000",
        marginMm: 12,
      },
      footer: {
        left: "",
        center: "confidential",
        right: "",
        fontSize: 10,
        fontFamily: "helvetica",
        color: "#000000",
        marginMm: 12,
      },
      scope: "odd",
      skipFirstPage: false,
    });

    const document = await PDFDocument.load(headed);
    expect(document.getPageCount()).toBe(3);
  });
});
