import { describe, expect, it } from "vitest";
import {
  getPdfStudioToolBySlug,
  getPdfStudioTool,
  isPdfStudioToolAvailableOnSurface,
  listPdfStudioTools,
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

  it("lists extract-pages on the public catalog and resolves its public slug", () => {
    const publicTools = listPdfStudioTools("public").map((tool) => tool.id);
    const extractedPagesTool = getPdfStudioToolBySlug("extract-pages");

    expect(publicTools).toContain("extract-pages");
    expect(extractedPagesTool?.id).toBe("extract-pages");
    expect(
      extractedPagesTool
        ? isPdfStudioToolAvailableOnSurface(extractedPagesTool, "public")
        : false,
    ).toBe(true);
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

  it("registers the Phase 32 security and conversion tools with honest exposure", () => {
    expect(getPdfStudioTool("watermark")).toMatchObject({
      workspacePath: "/app/docs/pdf-studio/watermark",
      publicPath: "/pdf-studio/watermark",
      executionMode: "browser",
    });
    expect(getPdfStudioTool("jpg-to-pdf")).toMatchObject({
      workspacePath: "/app/docs/pdf-studio/jpg-to-pdf",
      publicPath: "/pdf-studio/jpg-to-pdf",
      executionMode: "browser",
    });
    expect(getPdfStudioTool("pdf-to-text")).toMatchObject({
      workspacePath: "/app/docs/pdf-studio/pdf-to-text",
      publicPath: "/pdf-studio/pdf-to-text",
      executionMode: "browser",
      outputLabel: "TXT",
    });
    expect(getPdfStudioTool("ocr")).toMatchObject({
      workspacePath: "/app/docs/pdf-studio/ocr",
      publicPath: "/pdf-studio/ocr",
      executionMode: "browser",
      outputLabel: "Searchable PDF / TXT",
    });
    expect(getPdfStudioTool("deskew")).toMatchObject({
      workspacePath: "/app/docs/pdf-studio/deskew",
      publicPath: "/pdf-studio/deskew",
      executionMode: "browser",
      outputLabel: "PDF / PNG",
    });
    expect(getPdfStudioTool("unlock")).toMatchObject({
      workspacePath: "/app/docs/pdf-studio/unlock",
      availability: {
        workspace: "available",
        public: "workspace-only",
      },
      outputLabel: "Image-only PDF",
    });
    expect(getPdfStudioTool("repair")).toMatchObject({
      outputLabel: "PDF / Log",
    });
    expect(getPdfStudioTool("grayscale")).toMatchObject({
      workspacePath: "/app/docs/pdf-studio/grayscale",
      availability: {
        workspace: "available",
        public: "workspace-only",
      },
      outputLabel: "PDF / ZIP",
    });
    expect(getPdfStudioTool("pdf-to-word")).toMatchObject({
      workspacePath: "/app/docs/pdf-studio/pdf-to-word",
      executionMode: "processing",
      availability: {
        workspace: "available",
        public: "workspace-only",
      },
    });
    expect(getPdfStudioTool("word-to-pdf")).toMatchObject({
      workspacePath: "/app/docs/pdf-studio/word-to-pdf",
      executionMode: "processing",
      availability: {
        workspace: "available",
        public: "workspace-only",
      },
    });
    expect(getPdfStudioTool("html-to-pdf")).toMatchObject({
      workspacePath: "/app/docs/pdf-studio/html-to-pdf",
      executionMode: "processing",
      availability: {
        workspace: "available",
        public: "workspace-only",
      },
    });
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
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "unlock",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "grayscale",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "pdf-to-word",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "pdf-to-excel",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "pdf-to-ppt",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "word-to-pdf",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).not.toContain(
      "html-to-pdf",
    );
    expect(publicCatalog.flatMap((category) => category.tools)).toContain("watermark");
    expect(publicCatalog.flatMap((category) => category.tools)).toContain("jpg-to-pdf");
    expect(publicCatalog.flatMap((category) => category.tools)).toContain("pdf-to-text");
    expect(publicCatalog.flatMap((category) => category.tools)).toContain("ocr");
    expect(publicCatalog.flatMap((category) => category.tools)).toContain("deskew");
    expect(publicCatalog.flatMap((category) => category.tools)).toContain("rotate");
    expect(publicCatalog.flatMap((category) => category.tools)).toContain(
      "extract-pages",
    );
  });
});
