import { describe, expect, it } from "vitest";
import {
  buildPdfLayoutBlocks,
  buildWorksheetRowsFromBlocks,
  groupPdfTextTokensIntoLines,
  type PdfTextToken,
} from "@/features/docs/pdf-studio/lib/pdf-text-layout";

function token(overrides: Partial<PdfTextToken> & Pick<PdfTextToken, "text" | "x" | "y">): PdfTextToken {
  return {
    text: overrides.text,
    x: overrides.x,
    y: overrides.y,
    top: overrides.top ?? 0,
    width: overrides.width ?? 40,
    height: overrides.height ?? 12,
    fontSize: overrides.fontSize ?? 12,
  };
}

describe("pdf text layout helpers", () => {
  it("groups nearby tokens into a single line", () => {
    const lines = groupPdfTextTokensIntoLines([
      token({ text: "Quarterly", x: 20, y: 100 }),
      token({ text: "report", x: 90, y: 99 }),
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toBe("Quarterly report");
  });

  it("builds table blocks from aligned multi-column lines", () => {
    const lines = groupPdfTextTokensIntoLines([
      token({ text: "Item", x: 20, y: 100 }),
      token({ text: "Amount", x: 180, y: 100 }),
      token({ text: "Plan", x: 20, y: 80 }),
      token({ text: "$29", x: 180, y: 80 }),
    ]);

    const blocks = buildPdfLayoutBlocks(lines);

    expect(blocks).toEqual([
      {
        kind: "table",
        rows: [
          ["Item", "Amount"],
          ["Plan", "$29"],
        ],
      },
    ]);
  });

  it("creates worksheet rows that preserve tables and paragraph blocks", () => {
    const lines = groupPdfTextTokensIntoLines([
      token({ text: "Statement", x: 20, y: 120 }),
      token({ text: "Date", x: 20, y: 90 }),
      token({ text: "Total", x: 180, y: 90 }),
      token({ text: "2026-04-21", x: 20, y: 70 }),
      token({ text: "$120.00", x: 180, y: 70 }),
    ]);

    const rows = buildWorksheetRowsFromBlocks(buildPdfLayoutBlocks(lines));

    expect(rows).toEqual([
      ["Statement"],
      [""],
      ["Date", "Total"],
      ["2026-04-21", "$120.00"],
    ]);
  });
});
