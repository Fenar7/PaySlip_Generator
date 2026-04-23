import { describe, expect, it } from "vitest";
import {
  clampPdfStudioHistoryLimit,
  getPdfStudioRetentionMessaging,
} from "@/features/docs/pdf-studio/lib/plan-gates";

describe("pdf studio plan gates", () => {
  it("clamps history requests to the active plan window", () => {
    expect(clampPdfStudioHistoryLimit("starter", 999)).toBe(10);
    expect(clampPdfStudioHistoryLimit("pro", 999)).toBe(25);
    expect(clampPdfStudioHistoryLimit("enterprise", 999)).toBe(50);
    expect(clampPdfStudioHistoryLimit("free", 10)).toBe(0);
  });

  it("builds retention copy from the plan retention window", () => {
    expect(getPdfStudioRetentionMessaging("pro")).toEqual({
      retentionLabel: "3 days",
      planNotice:
        "Completed downloads and batch bundles stay available for 3 days on your current plan.",
      completionNotice:
        "Download links and batch bundles stay available for 3 days after the conversion finishes.",
    });
  });
});
