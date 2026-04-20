import { describe, expect, it } from "vitest";
import { createPdfStudioJobPayload } from "@/features/docs/pdf-studio/lib/job";
import {
  buildPdfStudioOutputName,
  buildPdfStudioPartName,
} from "@/features/docs/pdf-studio/lib/output";

describe("pdf studio job and output helpers", () => {
  it("builds trackable job payloads for processing-capable tools", () => {
    const payload = createPdfStudioJobPayload({
      toolId: "protect",
      surface: "public",
      files: [
        new File(["pdf"], "secured.pdf", { type: "application/pdf" }),
      ],
      executionMode: "processing",
      outputExtension: "pdf",
    });

    expect(payload.tool).toBe("protect");
    expect(payload.execution.requiresProcessing).toBe(true);
    expect(payload.inputManifest.classifications).toEqual(["pdf"]);
    expect(payload.outputManifest.extension).toBe("pdf");
  });

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
