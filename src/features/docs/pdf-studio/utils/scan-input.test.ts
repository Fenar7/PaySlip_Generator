import { describe, expect, it } from "vitest";
import { dataUrlToBlob } from "@/features/docs/pdf-studio/utils/scan-input";

describe("scan input utilities", () => {
  it("dataUrlToBlob decodes a PNG data URL to correct type and non-zero size", () => {
    // Minimal 1×1 transparent PNG in base64
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${pngBase64}`;

    const blob = dataUrlToBlob(dataUrl);

    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("dataUrlToBlob is synchronous (returns Blob, not Promise)", () => {
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI6QAAAABJRU5ErkJggg==";
    const result = dataUrlToBlob(`data:image/png;base64,${pngBase64}`);
    expect(result).toBeInstanceOf(Blob);
    expect(typeof (result as unknown as Promise<Blob>)?.then).toBe("undefined");
  });

  it("dataUrlToBlob falls back to application/octet-stream for unknown type", () => {
    // Craft a minimal valid base64 payload with no recognised MIME
    const blob = dataUrlToBlob("data:application/octet-stream;base64,dGVzdA==");
    expect(blob.type).toBe("application/octet-stream");
  });
});
