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

  it("adds the Phase 30 page-organization tools to the shared registry", () => {
    expect(getPdfStudioTool("alternate-mix").workspacePath).toBe(
      "/app/docs/pdf-studio/alternate-mix",
    );
    expect(getPdfStudioTool("extract-pages").workspacePath).toBe(
      "/app/docs/pdf-studio/extract-pages",
    );
    expect(getPdfStudioTool("rotate").publicPath).toBe("/pdf-studio/rotate");
  });

  it("registers the Phase 31 tools on the workspace surface", () => {
    expect(getPdfStudioTool("editor").workspacePath).toBe(
      "/app/docs/pdf-studio/editor",
    );
    expect(getPdfStudioTool("create-forms").workspacePath).toBe(
      "/app/docs/pdf-studio/create-forms",
    );
    expect(getPdfStudioTool("page-numbers").workspacePath).toBe(
      "/app/docs/pdf-studio/page-numbers",
    );
    expect(getPdfStudioTool("bates").workspacePath).toBe(
      "/app/docs/pdf-studio/bates",
    );
    expect(getPdfStudioTool("metadata").workspacePath).toBe(
      "/app/docs/pdf-studio/metadata",
    );
    expect(getPdfStudioTool("rename").workspacePath).toBe(
      "/app/docs/pdf-studio/rename",
    );
    expect(getPdfStudioTool("remove-annotations").workspacePath).toBe(
      "/app/docs/pdf-studio/remove-annotations",
    );
    expect(getPdfStudioTool("bookmarks").workspacePath).toBe(
      "/app/docs/pdf-studio/bookmarks",
    );
    expect(getPdfStudioTool("flatten").workspacePath).toBe(
      "/app/docs/pdf-studio/flatten",
    );
    expect(getPdfStudioTool("n-up").workspacePath).toBe(
      "/app/docs/pdf-studio/n-up",
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
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "alternate-mix",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "extract-pages",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "editor",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "create-forms",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "page-numbers",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "bates",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "metadata",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "rename",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "remove-annotations",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "bookmarks",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "flatten",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "n-up",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).toContain("rotate");
  });
});
