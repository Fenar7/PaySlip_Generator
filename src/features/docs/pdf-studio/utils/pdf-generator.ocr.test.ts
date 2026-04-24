import { describe, expect, it, vi } from "vitest";
import type { ImagePlacement } from "../types";
import {
  buildOcrTextLayout,
  drawOcrLineSafely,
  embedInvisibleOcrText,
} from "./pdf-generator";

vi.mock("pdf-lib", () => ({
  rgb: (r: number, g: number, b: number) => ({ r, g, b }),
}));

function createFont(widthFactor = 0.5) {
  return {
    widthOfTextAtSize: (text: string, size: number) => text.length * size * widthFactor,
  } as const;
}

describe("pdf-generator OCR helpers", () => {
  it("shrinks and wraps OCR text so the full text fits within the image placement", () => {
    const placement: ImagePlacement = { x: 24, y: 30, width: 120, height: 36 };
    const font = createFont();
    const text =
      "This OCR output contains enough words to require wrapping and shrinking while still preserving every word in order.";

    const layout = buildOcrTextLayout(text, font as never, placement);

    expect(layout.fontSize).toBeGreaterThanOrEqual(1);
    expect(layout.lines.length * layout.lineHeight).toBeLessThanOrEqual(placement.height);
    expect(layout.lines.join(" ").replace(/\s+/g, " ").trim()).toBe(text);
  });

  it("falls back to character drawing when a word-level draw fails", () => {
    const drawText = vi.fn((text: string) => {
      if (text === "unsafe") {
        throw new Error("unsupported");
      }
    });
    const page = { drawText } as never;
    const font = createFont();

    drawOcrLineSafely(page, "safe unsafe", 10, 20, font as never, 10, { r: 0, g: 0, b: 0 }, 400);

    expect(drawText).toHaveBeenCalledWith(
      "safe",
      expect.objectContaining({ x: 10, y: 20, opacity: 0 }),
    );
    expect(drawText).toHaveBeenCalledWith("u", expect.anything());
    expect(drawText).toHaveBeenCalledWith("n", expect.anything());
    expect(drawText).toHaveBeenCalledWith("s", expect.anything());
    expect(drawText).toHaveBeenCalledWith("a", expect.anything());
    expect(drawText).toHaveBeenCalledWith("f", expect.anything());
    expect(drawText).toHaveBeenCalledWith("e", expect.anything());
  });

  it("embeds all OCR words without truncating long text pages", async () => {
    const drawText = vi.fn();
    const page = { drawText } as never;
    const font = createFont();
    const placement: ImagePlacement = { x: 18, y: 24, width: 140, height: 28 };
    const text =
      "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron";

    await embedInvisibleOcrText(
      page,
      text,
      { widthPt: 200, heightPt: 300 },
      placement,
      font as never,
    );

    const drawnTokens = drawText.mock.calls.map(([value]) => value);
    expect(drawnTokens.join(" ").replace(/\s+/g, " ").trim()).toBe(text);
  });
});
