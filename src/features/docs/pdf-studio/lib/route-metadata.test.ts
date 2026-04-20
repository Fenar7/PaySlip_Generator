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

  it("marks workspace pages as non-indexable while sharing canonical targets", () => {
    const metadata = buildPdfStudioToolMetadata("protect", "workspace");

    expect(metadata.alternates?.canonical).toBe("/pdf-studio/protect");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
