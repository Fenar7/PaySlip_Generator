import { describe, expect, it } from "vitest";
import {
  buildPdfStudioHubMetadata,
  buildPdfStudioHubStructuredData,
  buildPdfStudioToolMetadata,
  buildPdfStudioToolStructuredData,
} from "@/features/docs/pdf-studio/lib/route-metadata";

describe("pdf studio route metadata", () => {
  it("builds canonical public metadata for the hub", () => {
    const metadata = buildPdfStudioHubMetadata("public");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio");
    expect(metadata.openGraph?.url).toBe("/pdf-studio");
  });

  it("builds structured data for the public hub", () => {
    const structuredData = buildPdfStudioHubStructuredData();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.slipwise.app";

    expect(structuredData["@type"]).toBe("CollectionPage");
    expect(structuredData.url).toBe(`${baseUrl}/pdf-studio`);
    expect(
      structuredData.mainEntity.itemListElement.some(
        (entry: { name?: string; url?: string }) =>
          entry.name === "Repair PDF" &&
          entry.url === `${baseUrl}/pdf-studio/repair`,
      ),
    ).toBe(true);
  });

  it("builds canonical public metadata for tool pages", () => {
    const metadata = buildPdfStudioToolMetadata("repair", "public");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio/repair");
    expect(metadata.title).toBe("Repair PDF | PDF Studio");
    expect(metadata.description).toContain("Pro access");
  });

  it("builds structured data for public tool landing pages", () => {
    const structuredData = buildPdfStudioToolStructuredData("repair");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.slipwise.app";

    expect(structuredData["@type"]).toBe("WebPage");
    expect(structuredData.url).toBe(`${baseUrl}/pdf-studio/repair`);
    expect(structuredData.description).toContain("Pro access");
  });

  it("uses public canonicals for new Phase 30 public-ready tools", () => {
    const metadata = buildPdfStudioToolMetadata("rotate", "public");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio/rotate");
    expect(metadata.title).toBe("Rotate Pages | PDF Studio");
  });

  it("builds public metadata for extract-pages", () => {
    const metadata = buildPdfStudioToolMetadata("extract-pages", "public");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio/extract-pages");
    expect(metadata.title).toBe("Extract Pages | PDF Studio");
    expect(metadata.description).toContain("Runs entirely in your browser");
  });

  it("marks workspace pages as non-indexable while sharing canonical targets", () => {
    const metadata = buildPdfStudioToolMetadata("protect", "workspace");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio/protect");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("keeps new Phase 31 workspace-only tools non-indexable", () => {
    const metadata = buildPdfStudioToolMetadata("flatten", "workspace");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio/flatten");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe("Flatten PDF | PDF Studio");
  });

  it("uses public canonicals and browser execution copy for new Phase 32 public tools", () => {
    const metadata = buildPdfStudioToolMetadata("watermark", "public");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio/watermark");
    expect(metadata.title).toBe("Add Watermark | PDF Studio");
    expect(metadata.description).toContain("Runs entirely in your browser");
  });

  it("keeps server-backed Phase 32 tools workspace-only and non-indexable", () => {
    const metadata = buildPdfStudioToolMetadata("pdf-to-word", "workspace");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio/pdf-to-word");
    expect(metadata.title).toBe("PDF to Word | PDF Studio");
    expect(metadata.description).toContain("Uses secure server-side processing");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
