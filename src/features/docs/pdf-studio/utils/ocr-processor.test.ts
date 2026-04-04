import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recognizeMock = vi.fn();
const terminateMock = vi.fn(async () => {});
const createWorkerMock = vi.fn(async () => ({
  recognize: recognizeMock,
  terminate: terminateMock,
}));

vi.mock("tesseract.js", () => ({
  createWorker: createWorkerMock,
}));

import {
  processImageForOcr,
  resetOcrProcessorForTests,
  terminateOcrWorker,
  getOcrServiceStatus,
  normalizeOcrText,
} from "./ocr-processor";

describe("ocr-processor", () => {
  beforeEach(() => {
    resetOcrProcessorForTests();
    recognizeMock.mockReset();
    terminateMock.mockClear();
    createWorkerMock.mockReset();
    createWorkerMock.mockImplementation(async () => ({
      recognize: recognizeMock,
      terminate: terminateMock,
    }));
  });

  afterEach(async () => {
    await terminateOcrWorker();
    resetOcrProcessorForTests();
  });

  it("loads the OCR worker once and trims recognized text", async () => {
    recognizeMock.mockResolvedValue({ data: { text: "  detected text  " } });

    const blob = new Blob(["hello"], { type: "image/png" });
    await expect(processImageForOcr(blob)).resolves.toBe("detected text");
    await expect(processImageForOcr(blob)).resolves.toBe("detected text");

    expect(createWorkerMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock).toHaveBeenCalledTimes(2);
  });

  it("normalizes OCR initialization failures", async () => {
    createWorkerMock.mockRejectedValue(new Error("Failed to resolve module specifier 'tesseract.js'"));

    const blob = new Blob(["hello"], { type: "image/png" });
    await expect(processImageForOcr(blob)).rejects.toThrow(
      "OCR could not be initialized in the browser. Refresh and try again.",
    );
  });

  it("normalizes OCR recognition failures", async () => {
    recognizeMock.mockRejectedValue(new Error("worker crashed"));

    const blob = new Blob(["hello"], { type: "image/png" });
    await expect(processImageForOcr(blob)).rejects.toThrow(
      "OCR could not process this image. Try again with a clearer image.",
    );
  });

  describe("normalizeOcrText", () => {
    it("returns null for empty string", () => {
      expect(normalizeOcrText("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
      expect(normalizeOcrText("   \n\t  ")).toBeNull();
    });

    it("trims leading and trailing whitespace", () => {
      expect(normalizeOcrText("  hello world  ")).toBe("hello world");
    });

    it("collapses internal whitespace but preserves newlines", () => {
      expect(normalizeOcrText("hello   world\n\ntest")).toBe("hello world\ntest");
    });

    it("collapses multiple spaces", () => {
      expect(normalizeOcrText("hello   world")).toBe("hello world");
    });

    it("returns content for non-empty text", () => {
      expect(normalizeOcrText("OCR result")).toBe("OCR result");
    });
  });

  describe("empty OCR output rejection", () => {
    it("throws when OCR returns only whitespace", async () => {
      recognizeMock.mockResolvedValue({ data: { text: "   \n  " } });

      const blob = new Blob(["hello"], { type: "image/png" });
      await expect(processImageForOcr(blob)).rejects.toThrow(
        "OCR did not find any text in this image.",
      );
    });

    it("throws when OCR returns empty string", async () => {
      recognizeMock.mockResolvedValue({ data: { text: "" } });

      const blob = new Blob(["hello"], { type: "image/png" });
      await expect(processImageForOcr(blob)).rejects.toThrow(
        "OCR did not find any text in this image.",
      );
    });
  });

  describe("deduplication", () => {
    it("prevents concurrent duplicate calls with the same dedupeKey", async () => {
      let resolveFirst!: (val: { data: { text: string } }) => void;
      const firstPromise = new Promise<{ data: { text: string } }>((res) => {
        resolveFirst = res;
      });
      recognizeMock.mockReturnValueOnce(firstPromise);

      const blob = new Blob(["hello"], { type: "image/png" });
      const first = processImageForOcr(blob, "img-1");
      // Second call with same key should reject immediately
      await expect(processImageForOcr(blob, "img-1")).rejects.toThrow("OCR is already processing this image.");

      resolveFirst({ data: { text: "text from first" } });
      await expect(first).resolves.toBe("text from first");
    });

    it("allows calls with different dedupeKeys concurrently", async () => {
      recognizeMock.mockResolvedValue({ data: { text: "some text" } });

      const blob = new Blob(["hello"], { type: "image/png" });
      const [r1, r2] = await Promise.all([
        processImageForOcr(blob, "img-1"),
        processImageForOcr(blob, "img-2"),
      ]);
      expect(r1).toBe("some text");
      expect(r2).toBe("some text");
    });
  });

  describe("service status lifecycle", () => {
    it("starts as idle", () => {
      expect(getOcrServiceStatus()).toBe("idle");
    });

    it("becomes ready after successful initialization", async () => {
      recognizeMock.mockResolvedValue({ data: { text: "text" } });
      const blob = new Blob(["hello"], { type: "image/png" });
      await processImageForOcr(blob);
      expect(getOcrServiceStatus()).toBe("ready");
    });

    it("becomes unavailable after initialization failure", async () => {
      createWorkerMock.mockRejectedValue(new Error("network error loading worker"));

      const blob = new Blob(["hello"], { type: "image/png" });
      await expect(processImageForOcr(blob)).rejects.toThrow();
      expect(getOcrServiceStatus()).toBe("unavailable");
    });

    it("rejects immediately when service is unavailable, without retrying", async () => {
      createWorkerMock.mockRejectedValue(new Error("network error loading worker"));

      const blob = new Blob(["hello"], { type: "image/png" });
      await expect(processImageForOcr(blob)).rejects.toThrow();
      // Reset mock — no new calls should be made
      createWorkerMock.mockClear();

      await expect(processImageForOcr(blob)).rejects.toThrow("OCR is not available");
      expect(createWorkerMock).not.toHaveBeenCalled();
    });

    it("resets status after terminateOcrWorker", async () => {
      recognizeMock.mockResolvedValue({ data: { text: "text" } });
      const blob = new Blob(["hello"], { type: "image/png" });
      await processImageForOcr(blob);
      expect(getOcrServiceStatus()).toBe("ready");

      await terminateOcrWorker();
      expect(getOcrServiceStatus()).toBe("idle");
    });
  });
});
