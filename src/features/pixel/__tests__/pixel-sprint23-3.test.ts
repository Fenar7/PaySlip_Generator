/**
 * Sprint 23.3 tests — Image Utility Suite & batch ZIP logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Batch ZIP helpers ──────────────────────────────────────────────────────────
// We test only the pure helper logic; the browser-level JSZip/createObjectURL
// APIs are mocked.

vi.mock("jszip", () => {
  const mockFile = vi.fn();
  const mockGenerateAsync = vi.fn().mockResolvedValue(new Blob(["zip-content"]));

  function MockJSZip() {
    return { file: mockFile, generateAsync: mockGenerateAsync };
  }

  MockJSZip._mockFile = mockFile;
  MockJSZip._mockGenerateAsync = mockGenerateAsync;

  return { default: MockJSZip };
});

// Provide minimal DOM globals used by the batch-zip module
global.URL.createObjectURL = vi.fn(() => "blob:mock");
global.URL.revokeObjectURL = vi.fn();

global.document = {
  ...global.document,
  createElement: vi.fn((tag: string) => {
    if (tag === "a") {
      return { href: "", download: "", click: vi.fn() };
    }
    return {};
  }),
} as unknown as Document;

global.atob = (s: string) => Buffer.from(s, "base64").toString("binary");

describe("batch-zip — dataUrlToUint8Array (via downloadBatchZip)", () => {
  it("throws when items array is empty", async () => {
    const { downloadBatchZip } = await import("@/lib/pixel/batch-zip");
    await expect(downloadBatchZip([], "test")).rejects.toThrow("No items to zip");
  });

  it("adds each item to the zip and triggers download", async () => {
    const JSZipMod = (await import("jszip")).default as unknown as {
      _mockFile: ReturnType<typeof vi.fn>;
      _mockGenerateAsync: ReturnType<typeof vi.fn>;
    };
    const { downloadBatchZip } = await import("@/lib/pixel/batch-zip");

    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    await downloadBatchZip(
      [
        { filename: "a.png", dataUrl },
        { filename: "b.png", dataUrl },
      ],
      "my-zip"
    );

    expect(JSZipMod._mockFile).toHaveBeenCalledTimes(2);
    expect(JSZipMod._mockFile.mock.calls[0][0]).toBe("a.png");
    expect(JSZipMod._mockFile.mock.calls[1][0]).toBe("b.png");
    expect(JSZipMod._mockGenerateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ type: "blob", compression: "DEFLATE" })
    );
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});

// ── Compress workspace pure logic ──────────────────────────────────────────────
describe("formatBytes helper", () => {
  function formatBytes(bytes: number | null): string {
    if (bytes == null) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1_048_576).toFixed(2)} MB`;
  }

  it("formats null as dash", () => expect(formatBytes(null)).toBe("—"));
  it("formats bytes", () => expect(formatBytes(512)).toBe("512 B"));
  it("formats kilobytes", () => expect(formatBytes(2048)).toBe("2.0 KB"));
  it("formats megabytes", () => expect(formatBytes(2_097_152)).toBe("2.00 MB"));
});

describe("dataUrlBytes approximation", () => {
  function dataUrlBytes(dataUrl: string): number {
    const base64 = dataUrl.split(",")[1] ?? "";
    return Math.floor((base64.length * 3) / 4);
  }

  it("returns 0 for empty base64 segment", () => {
    expect(dataUrlBytes("data:image/png;base64,")).toBe(0);
  });

  it("approximates byte count from base64 length", () => {
    // 4 base64 chars = 3 bytes
    expect(dataUrlBytes("data:image/png;base64,AAAA")).toBe(3);
    expect(dataUrlBytes("data:image/png;base64,AAAAAAAA")).toBe(6);
  });
});

// ── Public pixel routes — metadata ────────────────────────────────────────────
describe("Public pixel route page files exist", () => {
  it("resize page is importable", async () => {
    const mod = await import("@/app/pixel/resize/page");
    expect(mod.default).toBeTruthy();
    expect(mod.metadata?.title).toContain("Resizer");
  });

  it("compress page is importable", async () => {
    const mod = await import("@/app/pixel/compress/page");
    expect(mod.default).toBeTruthy();
    expect(mod.metadata?.title).toContain("Compress");
  });

  it("convert page is importable", async () => {
    const mod = await import("@/app/pixel/convert/page");
    expect(mod.default).toBeTruthy();
    expect(mod.metadata?.title).toContain("Convert");
  });

  it("adjust page is importable", async () => {
    const mod = await import("@/app/pixel/adjust/page");
    expect(mod.default).toBeTruthy();
    expect(mod.metadata?.title).toContain("Adjuster");
  });
});

// ── Pixel hub ─────────────────────────────────────────────────────────────────
describe("Public pixel hub lists all tools", () => {
  it("hub page exports metadata with updated title", async () => {
    const mod = await import("@/app/pixel/page");
    expect(mod.metadata?.title).toContain("Image Tools");
  });
});
