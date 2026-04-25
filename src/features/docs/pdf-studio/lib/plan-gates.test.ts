import { describe, expect, it } from "vitest";
import {
  clampPdfStudioHistoryLimit,
  getPdfStudioCapabilityTier,
  getPdfStudioHistoryEntryLimit,
  getPdfStudioResultRetentionHours,
  getPdfStudioRetentionLabel,
  getPdfStudioRetentionMessaging,
  getPdfStudioToolUpgradeCopy,
  getPdfStudioWorkspaceMinimumPlan,
  isPdfStudioToolInteractiveOnPublicSurface,
  requiresProForPdfStudioBatch,
  requiresProForPdfStudioLargeJob,
} from "@/features/docs/pdf-studio/lib/plan-gates";
import { listPdfStudioTools } from "@/features/docs/pdf-studio/lib/tool-registry";

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

  it("maps every tool to exactly one tier and no tool is unclassified", () => {
    const allTools = listPdfStudioTools();
    const tiers = allTools.map((t) => getPdfStudioCapabilityTier(t.id));

    expect(tiers.every((t) => ["free", "workspace", "pro"].includes(t))).toBe(true);
    expect(tiers.filter((t) => t === "free")).toHaveLength(17);
    expect(tiers.filter((t) => t === "workspace")).toHaveLength(14);
    expect(tiers.filter((t) => t === "pro")).toHaveLength(6);
  });

  it("keeps tier and public interactivity perfectly aligned", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      const tier = getPdfStudioCapabilityTier(tool.id);
      const interactive = isPdfStudioToolInteractiveOnPublicSurface(tool.id);

      if (tier === "free") {
        expect(interactive).toBe(true);
      } else {
        expect(interactive).toBe(false);
      }
    }
  });

  it("assigns correct workspace minimum plan per tier", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      const tier = getPdfStudioCapabilityTier(tool.id);
      const minPlan = getPdfStudioWorkspaceMinimumPlan(tool.id);

      if (tier === "pro") {
        expect(minPlan).toBe("pro");
      } else {
        expect(minPlan).toBe("starter");
      }
    }
  });

  it("requires Pro for batch on all pro-tier tools and no others", () => {
    const allTools = listPdfStudioTools();
    const proTools = allTools.filter((t) => getPdfStudioCapabilityTier(t.id) === "pro");
    const nonProTools = allTools.filter((t) => getPdfStudioCapabilityTier(t.id) !== "pro");

    for (const tool of proTools) {
      expect(requiresProForPdfStudioBatch(tool.id)).toBe(true);
    }

    for (const tool of nonProTools) {
      expect(requiresProForPdfStudioBatch(tool.id)).toBe(false);
    }
  });

  it("gates large OCR and processing jobs by page count", () => {
    // OCR: starter limit is 10 pages
    expect(requiresProForPdfStudioLargeJob("ocr", 5)).toBe(false);
    expect(requiresProForPdfStudioLargeJob("ocr", 10)).toBe(false);
    expect(requiresProForPdfStudioLargeJob("ocr", 11)).toBe(true);

    // Pro processing tool: starter limit is 40 pages
    expect(requiresProForPdfStudioLargeJob("pdf-to-word", 30)).toBe(false);
    expect(requiresProForPdfStudioLargeJob("pdf-to-word", 40)).toBe(false);
    expect(requiresProForPdfStudioLargeJob("pdf-to-word", 41)).toBe(true);

    // Non-pro tool should not be gated by page count
    expect(requiresProForPdfStudioLargeJob("merge", 100)).toBe(false);
  });

  it("provides non-empty upgrade copy for every tier-gated tool", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      const copy = getPdfStudioToolUpgradeCopy(tool.id);
      expect(typeof copy).toBe("string");
      expect(copy.length).toBeGreaterThan(0);

      if (getPdfStudioCapabilityTier(tool.id) === "pro") {
        expect(copy.toLowerCase()).toMatch(/pro|plan|workspace/);
      }
    }
  });

  it("reports honest retention windows per plan", () => {
    expect(getPdfStudioResultRetentionHours("free")).toBe(24);
    expect(getPdfStudioResultRetentionHours("starter")).toBe(24);
    expect(getPdfStudioResultRetentionHours("pro")).toBe(72);
    expect(getPdfStudioResultRetentionHours("enterprise")).toBe(168);

    expect(getPdfStudioRetentionLabel("free")).toBe("1 day");
    expect(getPdfStudioRetentionLabel("starter")).toBe("1 day");
    expect(getPdfStudioRetentionLabel("pro")).toBe("3 days");
    expect(getPdfStudioRetentionLabel("enterprise")).toBe("7 days");
  });

  it("reports honest history entry limits per plan", () => {
    expect(getPdfStudioHistoryEntryLimit("free")).toBe(0);
    expect(getPdfStudioHistoryEntryLimit("starter")).toBe(10);
    expect(getPdfStudioHistoryEntryLimit("pro")).toBe(25);
    expect(getPdfStudioHistoryEntryLimit("enterprise")).toBe(50);
  });
});
