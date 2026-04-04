import { describe, it, expect } from "vitest";
import { PDF_STUDIO_DEFAULT_SETTINGS } from "@/features/docs/pdf-studio/constants";

describe("PDF Studio Constants", () => {
  it("should have default watermark settings", () => {
    expect(PDF_STUDIO_DEFAULT_SETTINGS.watermark).toEqual({
      enabled: false,
      type: 'none',
      text: {
        content: 'Confidential',
        fontSize: 24,
        color: '#999999',
        opacity: 50,
      },
      image: {
        scale: 30,
        opacity: 50,
      },
      position: 'center',
      rotation: 0,
      scope: 'all',
    });
  });

  it("should have default page number settings", () => {
    expect(PDF_STUDIO_DEFAULT_SETTINGS.pageNumbers).toEqual({
      enabled: false,
      position: 'bottom-center',
      format: 'number-of-total',
      startFrom: 1,
      skipFirstPage: false,
    });
  });

  it("should have valid watermark text opacity range", () => {
    const opacity = PDF_STUDIO_DEFAULT_SETTINGS.watermark.text?.opacity;
    expect(opacity).toBeGreaterThanOrEqual(0);
    expect(opacity).toBeLessThanOrEqual(100);
  });

  it("should have valid watermark image opacity range", () => {
    const opacity = PDF_STUDIO_DEFAULT_SETTINGS.watermark.image?.opacity;
    expect(opacity).toBeGreaterThanOrEqual(0);
    expect(opacity).toBeLessThanOrEqual(100);
  });
});