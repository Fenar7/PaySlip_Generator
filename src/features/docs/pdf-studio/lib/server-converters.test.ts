import { describe, expect, it } from "vitest";
import { runServerConversion } from "@/features/docs/pdf-studio/lib/server-converters";

describe("pdf studio server conversions", () => {
  it("rejects remote URL mode for HTML to PDF jobs", async () => {
    await expect(
      runServerConversion({
        toolId: "html-to-pdf",
        sourceUrl: "https://example.com/report",
      }),
    ).rejects.toThrow("Remote URL rendering is disabled");
  });

  it("returns actionable errors when required source files are missing", async () => {
    await expect(
      runServerConversion({
        toolId: "pdf-to-word",
      }),
    ).rejects.toThrow("Missing PDF source file.");
  });
});
