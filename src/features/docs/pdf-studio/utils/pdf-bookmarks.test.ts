import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { applyPdfBookmarks } from "@/features/docs/pdf-studio/utils/pdf-bookmarks";

describe("pdf bookmarks", () => {
  it("adds an outline root and enables outline mode", async () => {
    const document = await PDFDocument.create();
    document.addPage([400, 600]);
    document.addPage([400, 600]);
    const source = await document.save();

    const result = await applyPdfBookmarks(source, [
      { id: "a", title: "Intro", pageNumber: 1, level: 0 },
      { id: "b", title: "Details", pageNumber: 2, level: 1 },
    ]);

    const exported = await PDFDocument.load(result);
    expect(exported.catalog.get(PDFName.of("Outlines"))).toBeDefined();
    expect(exported.catalog.get(PDFName.of("PageMode"))?.toString()).toContain(
      "UseOutlines",
    );
  });
});
