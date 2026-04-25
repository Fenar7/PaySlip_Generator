import { describe, expect, it } from "vitest";
import { listPdfStudioTools } from "@/features/docs/pdf-studio/lib/tool-registry";
import {
  getPdfStudioCapabilityTier,
  getPdfStudioToolUpgradeCopy,
  isPdfStudioToolInteractiveOnPublicSurface,
} from "@/features/docs/pdf-studio/lib/plan-gates";
import { buildPdfStudioSupportCoverageLanes } from "@/features/docs/pdf-studio/lib/support";
import { generateStaticParams } from "@/app/pdf-studio/[tool]/page";

describe("pdf studio qa matrix invariants", () => {
  it("every live tool has a public route with a valid slug", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      expect(tool.publicPath).toMatch(/^\/pdf-studio\/[a-z0-9-]+$/);
    }
  });

  it("every live tool is represented in generateStaticParams", () => {
    const staticParams = generateStaticParams();
    const paramSlugs = new Set(staticParams.map((p) => p.tool));
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      const slug = tool.publicPath.split("/").pop();
      expect(paramSlugs.has(slug)).toBe(true);
    }

    expect(paramSlugs.size).toBe(allTools.length);
  });

  it("every live tool has a workspace route", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      expect(tool.workspacePath).toMatch(/^\/app\/docs\/pdf-studio\/[a-z0-9-]+$/);
    }
  });

  it("no tool is hidden or marked as soon", () => {
    const allTools = listPdfStudioTools();
    const publicTools = listPdfStudioTools("public");
    const workspaceTools = listPdfStudioTools("workspace");

    expect(publicTools.length).toBe(allTools.length);
    expect(workspaceTools.length).toBe(allTools.length);

    for (const tool of allTools) {
      expect(
        publicTools.some((t) => t.id === tool.id),
        `${tool.id} missing from public catalog`,
      ).toBe(true);
      expect(
        workspaceTools.some((t) => t.id === tool.id),
        `${tool.id} missing from workspace catalog`,
      ).toBe(true);
    }
  });

  it("public interactivity is gated only by tier, not by arbitrary rules", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      const tier = getPdfStudioCapabilityTier(tool.id);
      const interactive = isPdfStudioToolInteractiveOnPublicSurface(tool.id);

      // Invariant: free tools are interactive on public; workspace/pro are not.
      expect(interactive).toBe(tier === "free");
    }
  });

  it("upgrade copy exists for every tool and is never empty", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      const copy = getPdfStudioToolUpgradeCopy(tool.id);
      expect(typeof copy).toBe("string");
      expect(copy.length).toBeGreaterThan(0);
    }
  });

  it("support coverage lane totals equal the full tool count", () => {
    const lanes = buildPdfStudioSupportCoverageLanes();
    const total = lanes.reduce((sum, lane) => sum + lane.toolCount, 0);
    expect(total).toBe(37);
  });

  it("every tool has a defined execution mode", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      expect(["browser", "processing", "hybrid"]).toContain(tool.executionMode);
    }
  });

  it("every tool has a non-empty title, description, and output label", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      expect(tool.title.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.outputLabel.length).toBeGreaterThan(0);
    }
  });

  it("limits are defined and honest for every tool", () => {
    const allTools = listPdfStudioTools();

    for (const tool of allTools) {
      expect(tool.limits.maxFiles).toBeGreaterThan(0);
      expect(tool.limits.maxSizeMb).toBeGreaterThan(0);
      if (tool.limits.maxPages !== undefined) {
        expect(tool.limits.maxPages).toBeGreaterThan(0);
      }
    }
  });
});
