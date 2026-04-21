import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { embedAnnotations } from "@/features/docs/pdf-studio/utils/annotation-writer";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnH3k4AAAAASUVORK5CYII=";

describe("annotation writer", () => {
  it("embeds text and signature overlays without changing page count", async () => {
    const document = await PDFDocument.create();
    document.addPage([400, 600]);
    const source = await document.save();

    const result = await embedAnnotations(
      source,
      [
        {
          id: "text-1",
          text: "Signed",
          pageIndex: 0,
          x: 0.2,
          y: 0.2,
          fontSize: 12,
          color: "black",
        },
      ],
      [
        {
          id: "sig-1",
          dataUrl: TINY_PNG,
          pageIndex: 0,
          x: 0.2,
          y: 0.3,
          width: 0.2,
          height: 0.1,
        },
      ],
    );

    const exported = await PDFDocument.load(result);
    expect(exported.getPageCount()).toBe(1);
  });
});
