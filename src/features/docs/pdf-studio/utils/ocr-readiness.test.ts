import { describe, expect, it } from "vitest";
import {
  getOcrReadiness,
  hasAnyOcrActivity,
  isOcrStateRestorable,
  buildOcrRestoreMessage,
} from "./ocr-readiness";
import type { ImageItem } from "../types";

function makeImage(overrides: Partial<ImageItem> = {}): ImageItem {
  return {
    id: "img-1",
    previewUrl: "data:image/png;base64,abc",
    rotation: 0,
    name: "test.png",
    sizeBytes: 1024,
    ...overrides,
  };
}

describe("ocr-readiness", () => {
  describe("getOcrReadiness", () => {
    it("warns image-only when OCR is disabled", () => {
      const result = getOcrReadiness({
        images: [makeImage(), makeImage()],
        ocrEnabled: false,
      });
      expect(result.status).toBe("idle");
      expect(result.exportAction).toBe("warn-image-only");
      expect(result.searchableExportReady).toBe(false);
    });

    it("blocks when images are processing", () => {
      const images = [
        makeImage({ id: "a", ocrStatus: "processing" }),
        makeImage({ id: "b", ocrStatus: "pending" }),
      ];
      const result = getOcrReadiness({ images, ocrEnabled: true });
      expect(result.status).toBe("processing");
      expect(result.exportAction).toBe("block");
      expect(result.inProgressCount).toBe(2);
    });

    it("allows export when all OCR is complete", () => {
      const images = [
        makeImage({ id: "a", ocrStatus: "complete", ocrText: "text A", ocrConfidence: 90 }),
        makeImage({ id: "b", ocrStatus: "complete", ocrText: "text B", ocrConfidence: 85 }),
      ];
      const result = getOcrReadiness({ images, ocrEnabled: true });
      expect(result.exportAction).toBe("none");
      expect(result.searchableExportReady).toBe(true);
    });

    it("returns confirm when some pages failed", () => {
      const images = [
        makeImage({ id: "a", ocrStatus: "complete", ocrText: "text A", ocrConfidence: 90 }),
        makeImage({ id: "b", ocrStatus: "error", ocrErrorMessage: "fail" }),
      ];
      const result = getOcrReadiness({ images, ocrEnabled: true });
      expect(result.exportAction).toBe("confirm");
      expect(result.failedCount).toBe(1);
    });

    it("detects low-confidence pages", () => {
      const images = [
        makeImage({ id: "a", ocrStatus: "complete", ocrText: "text A", ocrConfidence: 50 }),
        makeImage({ id: "b", ocrStatus: "complete", ocrText: "text B", ocrConfidence: 90 }),
      ];
      const result = getOcrReadiness({ images, ocrEnabled: true, lowConfidenceThreshold: 70 });
      expect(result.lowConfidenceCount).toBe(1);
    });

    it("handles empty images array", () => {
      const result = getOcrReadiness({ images: [], ocrEnabled: true });
      expect(result.totalCount).toBe(0);
    });

    it("does not block when OCR disabled even with pending images", () => {
      const result = getOcrReadiness({
        images: [makeImage({ ocrStatus: "processing" })],
        ocrEnabled: false,
      });
      expect(result.exportAction).toBe("warn-image-only");
    });
  });

  describe("hasAnyOcrActivity", () => {
    it("false for images without OCR status", () => {
      expect(hasAnyOcrActivity([makeImage()])).toBe(false);
    });
    it("true when any image has OCR status", () => {
      expect(hasAnyOcrActivity([makeImage({ ocrStatus: "pending" })])).toBe(true);
    });
  });

  describe("isOcrStateRestorable", () => {
    it("true for completed with text", () => {
      expect(isOcrStateRestorable(makeImage({ ocrStatus: "complete", ocrText: "hello" }))).toBe(true);
    });
    it("false for processing", () => {
      expect(isOcrStateRestorable(makeImage({ ocrStatus: "processing" }))).toBe(false);
    });
  });

  describe("buildOcrRestoreMessage", () => {
    it("empty for zero counts", () => {
      expect(buildOcrRestoreMessage(0, 0)).toBe("");
    });
    it("partial restore with dropped pages", () => {
      const msg = buildOcrRestoreMessage(2, 3);
      expect(msg).toContain("2 pages have restored OCR text");
      expect(msg).toContain("3 pages need");
    });
    it("full restore", () => {
      const msg = buildOcrRestoreMessage(3, 0);
      expect(msg).toContain("OCR text restored for all 3 pages");
    });
  });
});
