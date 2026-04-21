import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { applyPdfEditorObjects } from "@/features/docs/pdf-studio/utils/pdf-editor-writer";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnH3k4AAAAASUVORK5CYII=";

describe("pdf editor writer", () => {
  it("applies text, shape, and image overlays while preserving page count", async () => {
    const document = await PDFDocument.create();
    document.addPage([400, 600]);
    const source = await document.save();

    const result = await applyPdfEditorObjects(source, [
      {
        id: "text-1",
        type: "text",
        text: "Hello",
        pageIndex: 0,
        x: 0.2,
        y: 0.2,
        fontSize: 16,
        color: "#111111",
        fontFamily: "helvetica",
      },
      {
        id: "shape-1",
        type: "shape",
        shapeType: "rectangle",
        pageIndex: 0,
        x: 0.3,
        y: 0.3,
        width: 0.2,
        height: 0.1,
        strokeColor: "#000000",
        fillColor: "#ffffff",
        strokeWidth: 1,
      },
      {
        id: "image-1",
        type: "image",
        dataUrl: TINY_PNG,
        pageIndex: 0,
        x: 0.4,
        y: 0.4,
        width: 0.15,
        height: 0.08,
      },
    ]);

    const exported = await PDFDocument.load(result);
    expect(exported.getPageCount()).toBe(1);
  });
});
