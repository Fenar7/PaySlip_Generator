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
});
