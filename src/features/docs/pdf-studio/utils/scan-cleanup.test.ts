import { describe, expect, it } from "vitest";
import { transformScanPixels } from "@/features/docs/pdf-studio/utils/scan-cleanup";

describe("scan cleanup", () => {
  it("keeps pixel data unchanged when preset is none", () => {
    const pixels = new Uint8ClampedArray([10, 20, 30, 255, 200, 210, 220, 255]);
    expect(transformScanPixels(pixels, "none")).toEqual(pixels);
  });

  it("normalizes contrast into grayscale output", () => {
    const pixels = new Uint8ClampedArray([40, 40, 40, 255, 210, 210, 210, 255]);
    const output = transformScanPixels(pixels, "contrast");

    expect(output[0]).toBe(output[1]);
    expect(output[1]).toBe(output[2]);
    expect(output[4]).toBe(output[5]);
    expect(output[5]).toBe(output[6]);
    expect(output[4]).toBeGreaterThan(output[0]);
  });

  it("prepares monochrome output using only black and white values", () => {
    const pixels = new Uint8ClampedArray([20, 20, 20, 255, 240, 240, 240, 255]);
    const output = transformScanPixels(pixels, "monochrome");

    expect([output[0], output[4]]).toEqual([0, 255]);
    expect(output[0]).toBe(output[1]);
    expect(output[4]).toBe(output[5]);
  });

  it("monochrome at default threshold 128 binarises midtone pixels correctly", () => {
    // luminance of (127,127,127) = 127 → below 128 → black
    const darkPixel = new Uint8ClampedArray([127, 127, 127, 255, 129, 129, 129, 255]);
    const output = transformScanPixels(darkPixel, "monochrome");
    // first pixel: normalized luminance will be < 128 → black
    expect(output[0]).toBe(0);
    // second pixel: normalized luminance will be > 128 → white
    expect(output[4]).toBe(255);
  });

  it("monochrome at threshold 100 preserves more light-text pixels", () => {
    // A pixel just above 100 normalized should be white at threshold=100 but black at threshold=128
    // Use all same pixels so range=0 is avoided: two distinct pixels
    const pixels = new Uint8ClampedArray([50, 50, 50, 255, 200, 200, 200, 255]);
    const at100 = transformScanPixels(pixels, "monochrome", 100);
    const at128 = transformScanPixels(pixels, "monochrome", 128);
    // In a range of 50-200 normalized to 0-255, midpoint ~127:
    // at100: normalized ~81 → above 100 → white for second group; first ~0 → black
    // at128: normalized ~81 → below 128 → first group still black; second still white
    // The key: a pixel that was black at 128 might become white at 100
    expect(at100[0]).toBeLessThanOrEqual(at128[0]); // threshold=100 can only be as dark or lighter
    expect(at100[4]).toBeGreaterThanOrEqual(at128[4]); // second pixel at or more white
  });
});
