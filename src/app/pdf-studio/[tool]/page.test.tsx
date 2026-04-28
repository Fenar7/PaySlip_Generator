import { describe, expect, it } from "vitest";
import { generateStaticParams, generateMetadata } from "./page";
import {
  getPdfStudioToolBySlug,
  listPdfStudioTools,
} from "@/features/docs/pdf-studio/lib/tool-registry";

describe("PublicPdfStudioToolPage route entrypoint", () => {
  it("generates static params for every live public tool", () => {
    const params = generateStaticParams();
    const publicTools = listPdfStudioTools("public");

    expect(params).toHaveLength(publicTools.length);

    const slugs = params.map((p) => p.tool);
    for (const tool of publicTools) {
      const expectedSlug = tool.publicPath.split("/").pop();
      expect(slugs).toContain(expectedSlug);
    }
  });

  it("generates no duplicate slugs", () => {
    const params = generateStaticParams();
    const slugs = params.map((p) => p.tool);
    const uniqueSlugs = new Set(slugs);

    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it("resolves every generated slug back to the correct tool", () => {
    const params = generateStaticParams();

    for (const { tool: slug } of params) {
      const resolved = getPdfStudioToolBySlug(slug);
      expect(resolved).not.toBeNull();
      expect(resolved!.publicPath.endsWith(`/${slug}`)).toBe(true);
    }
  });

  it("resolves unknown slugs to null", () => {
    expect(getPdfStudioToolBySlug("not-a-real-tool")).toBeNull();
    expect(getPdfStudioToolBySlug("soon")).toBeNull();
    expect(getPdfStudioToolBySlug("placeholder")).toBeNull();
  });

  it("generates metadata for a known public tool", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ tool: "merge" }),
    });

    expect(metadata).toMatchObject({
      title: "Merge PDFs | PDF Studio",
    });
    expect(metadata.alternates?.canonical).toBe("/pdf-studio/merge");
  });

  it("generates metadata for a workspace-only public discovery tool", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ tool: "protect" }),
    });

    expect(metadata).toMatchObject({
      title: "Protect PDF | PDF Studio",
    });
    expect(metadata.alternates?.canonical).toBe("/pdf-studio/protect");
  });

  it("returns empty metadata for an unknown slug", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ tool: "nonexistent" }),
    });

    expect(metadata).toEqual({});
  });
});
