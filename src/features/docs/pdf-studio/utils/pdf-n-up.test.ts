import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generatePdfNUpLayout } from "@/features/docs/pdf-studio/utils/pdf-n-up";

async function createPdf(pageCount: number) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) {
    document.addPage([400, 600]);
  }
  return document.save();
}

describe("pdf n-up generator", () => {
  it("creates two-up and four-up printable sheets deterministically", async () => {
    const source = await createPdf(4);

    const twoUp = await PDFDocument.load(
      await generatePdfNUpLayout(source, { layout: "2-up", sheetSize: "A4" }),
    );
    const fourUp = await PDFDocument.load(
      await generatePdfNUpLayout(source, { layout: "4-up", sheetSize: "A3" }),
    );

    expect(twoUp.getPageCount()).toBe(2);
    expect(fourUp.getPageCount()).toBe(1);
  });
});
