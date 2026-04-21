import { describe, expect, it } from "vitest";
import {
  buildPdfStudioOutputName,
  buildPdfStudioPartName,
} from "@/features/docs/pdf-studio/lib/output";

describe("pdf studio output helpers", () => {
  it("normalizes output naming across the catalog", () => {
    expect(
      buildPdfStudioOutputName({
        toolId: "merge",
        baseName: " April Board Pack ",
        extension: "pdf",
      }),
    ).toBe("April-Board-Pack.pdf");

    expect(
      buildPdfStudioPartName({
        toolId: "split",
        baseName: "quarterly-report",
        part: 2,
        extension: "pdf",
      }),
    ).toBe("quarterly-report-part-02.pdf");
  });
});
