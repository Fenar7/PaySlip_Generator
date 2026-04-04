import { describe, expect, it, vi } from "vitest";
import { PDF_STUDIO_DEFAULT_SETTINGS } from "@/features/docs/pdf-studio/constants";
import type { ImageItem, PageSettings } from "@/features/docs/pdf-studio/types";

vi.mock("@/features/docs/pdf-studio/utils/image-processor", () => ({
  prepareImageDataUrl: vi.fn(async (_dataUrl: string, _rotation: number, _crop: unknown, quality: number) => {
    const approximateBytes = Math.max(100, Math.round(quality * 1000));
    const payload = "A".repeat(Math.ceil((approximateBytes * 4) / 3));
    return `data:image/jpeg;base64,${payload}`;
  }),
}));

import { estimatePdfSize, formatBytes } from "./pdf-size-estimator";

function createImage(id: string, overrides: Partial<ImageItem> = {}): ImageItem {
  return {
    id,
    name: `${id}.jpg`,
    previewUrl: "data:image/jpeg;base64,AAAA",
    rotation: 0,
    sizeBytes: 1000,
    ...overrides,
  };
}

describe("pdf-size-estimator", () => {
  it("formats bytes into readable units", () => {
    expect(formatBytes(800)).toBe("800 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });

  it("returns zero for empty image sets", async () => {
    await expect(estimatePdfSize([], PDF_STUDIO_DEFAULT_SETTINGS)).resolves.toBe(0);
  });

  it("decreases estimated size when compression quality decreases", async () => {
    const images = [createImage("one"), createImage("two")];
    const highQualitySettings: PageSettings = {
      ...PDF_STUDIO_DEFAULT_SETTINGS,
      compressionQuality: 100,
    };
    const lowQualitySettings: PageSettings = {
      ...PDF_STUDIO_DEFAULT_SETTINGS,
      compressionQuality: 10,
    };

    const high = await estimatePdfSize(images, highQualitySettings);
    const low = await estimatePdfSize(images, lowQualitySettings);

    expect(low).toBeLessThan(high);
  });

  it("adds OCR overhead when searchable PDF is enabled", async () => {
    const images = [createImage("one", { ocrText: "Detected text content for OCR" })];
    const base = await estimatePdfSize(images, PDF_STUDIO_DEFAULT_SETTINGS);
    const withOcr = await estimatePdfSize(images, {
      ...PDF_STUDIO_DEFAULT_SETTINGS,
      enableOcr: true,
    });

    expect(withOcr).toBeGreaterThan(base);
  });

  it("adds watermark overhead when an image watermark is enabled", async () => {
    const images = [createImage("one")];
    const base = await estimatePdfSize(images, PDF_STUDIO_DEFAULT_SETTINGS);
    const withImageWatermark = await estimatePdfSize(images, {
      ...PDF_STUDIO_DEFAULT_SETTINGS,
      watermark: {
        ...PDF_STUDIO_DEFAULT_SETTINGS.watermark,
        enabled: true,
        type: "image",
        image: {
          ...PDF_STUDIO_DEFAULT_SETTINGS.watermark.image!,
          previewUrl: "data:image/png;base64,AAAAAA==",
        },
      },
    });

    expect(withImageWatermark).toBeGreaterThan(base);
  });
});

