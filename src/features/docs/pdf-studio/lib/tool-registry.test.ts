import { describe, expect, it } from "vitest";
import {
  getPdfStudioTool,
  listPdfStudioToolsByCategory,
} from "@/features/docs/pdf-studio/lib/tool-registry";

describe("pdf studio tool registry", () => {
  it("surfaces the previously hidden live tools", () => {
    expect(getPdfStudioTool("fill-sign").workspacePath).toBe(
      "/app/docs/pdf-studio/fill-sign",
    );
    expect(getPdfStudioTool("protect").workspacePath).toBe(
      "/app/docs/pdf-studio/protect",
    );
    expect(getPdfStudioTool("header-footer").workspacePath).toBe(
      "/app/docs/pdf-studio/header-footer",
    );
    expect(getPdfStudioTool("repair").workspacePath).toBe(
      "/app/docs/pdf-studio/repair",
    );
  });

  it("keeps workspace and public hub categories aligned", () => {
    const workspaceCatalog = listPdfStudioToolsByCategory("workspace").map(
      (category) => ({
        label: category.label,
        tools: category.tools.map((tool) => tool.id),
      }),
    );
    const publicCatalog = listPdfStudioToolsByCategory("public").map(
      (category) => ({
        label: category.label,
        tools: category.tools.map((tool) => tool.id),
      }),
    );

    expect(publicCatalog.map((category) => category.label)).toEqual(
      workspaceCatalog.map((category) => category.label),
    );
    expect(
      publicCatalog.every((category, index) =>
        category.tools.every((toolId) =>
          workspaceCatalog[index].tools.includes(toolId),
        ),
      ),
    ).toBe(true);
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "protect",
    );
  });
});
