import { describe, expect, it } from "vitest";
import {
  buildPdfStudioHubMetadata,
  buildPdfStudioToolMetadata,
} from "@/features/docs/pdf-studio/lib/route-metadata";

describe("pdf studio route metadata", () => {
  it("builds canonical public metadata for the hub", () => {
    const metadata = buildPdfStudioHubMetadata("public");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio");
    expect(metadata.openGraph?.url).toBe("/pdf-studio");
  });

  it("builds canonical public metadata for tool pages", () => {
    const metadata = buildPdfStudioToolMetadata("repair", "public");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio/repair");
    expect(metadata.title).toBe("Repair PDF | PDF Studio");
    expect(metadata.description).toContain("Runs entirely in your browser");
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

    expect(metadata.alternates?.canonical).toBe("/app/docs/pdf-studio/protect");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("keeps new Phase 31 workspace-only tools non-indexable", () => {
    const metadata = buildPdfStudioToolMetadata("flatten", "workspace");

    expect(metadata.alternates?.canonical).toBe("/app/docs/pdf-studio/flatten");
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

    expect(metadata.alternates?.canonical).toBe("/app/docs/pdf-studio/pdf-to-word");
    expect(metadata.title).toBe("PDF to Word | PDF Studio");
    expect(metadata.description).toContain("Uses secure server-side processing");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
