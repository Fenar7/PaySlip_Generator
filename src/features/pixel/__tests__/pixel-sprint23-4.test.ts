/**
 * Sprint 23.4 tests — OCR hardening + PDF image extraction utility.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Top-level mock so vi.mock is hoisted correctly
vi.mock("@/lib/db", () => ({
  db: {
    ocrJob: {
      create: vi.fn().mockResolvedValue({ id: "job-1" }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

// ── OCR extractor — per-field confidence and timeout ──────────────────────────

describe("parseFieldConfidence", () => {
  it("returns zero confidence for all fields when input is null", async () => {
    const { extractDocument } = await import("@/lib/ocr-extractor");

    // No API key → returns zero confidence
    delete process.env.OPENAI_API_KEY;
    const result = await extractDocument("base64data", "image/jpeg", "org-1");

    expect(result.fieldConfidence.vendorName).toBe(0);
    expect(result.fieldConfidence.amount).toBe(0);
    expect(result.fieldConfidence.invoiceDate).toBe(0);
    expect(result.confidence).toBe(0);
  });
});

describe("OCR extractor — timeout handling", () => {
  it("timedOut flag defaults to undefined on success-path stub", async () => {
    const { extractDocument } = await import("@/lib/ocr-extractor");
    delete process.env.OPENAI_API_KEY;

    const result = await extractDocument("base64data", "image/jpeg", "org-2");
    // No-API-key path never times out
    expect(result.timedOut).toBeUndefined();
  });
});

// ── PDF image extractor — pure logic ──────────────────────────────────────────

describe("pdf-image-extractor module contract", () => {
  it("exports extractImagesFromPdf function", async () => {
    const mod = await import(
      "@/features/docs/pdf-studio/utils/pdf-image-extractor"
    );
    expect(typeof mod.extractImagesFromPdf).toBe("function");
  });
});

// ── Extract Images workspace page ─────────────────────────────────────────────

describe("Extract Images route", () => {
  it("page module is importable and has default export", async () => {
    const mod = await import(
      "@/app/app/docs/pdf-studio/extract-images/page"
    );
    expect(mod.default).toBeTruthy();
    expect(mod.metadata?.title).toContain("Extract");
  });
});

// ── OCR route — maxDuration is set ───────────────────────────────────────────

describe("OCR API route configuration", () => {
  it("has maxDuration set to 60 seconds on the route", async () => {
    const mod = await import("@/app/api/ai/extract-document/route");
    // maxDuration is a static Vercel route export
    expect((mod as unknown as { maxDuration: number }).maxDuration).toBe(60);
  });
});

// ── FieldConfidence type shape ─────────────────────────────────────────────────

describe("ExtractedDocument type includes fieldConfidence", () => {
  it("fieldConfidence fields are defined on the zero-confidence result", async () => {
    const { extractDocument } = await import("@/lib/ocr-extractor");
    delete process.env.OPENAI_API_KEY;
    const result = await extractDocument("b64", "image/png", "org-3");

    const fc = result.fieldConfidence;
    expect(typeof fc.vendorName).toBe("number");
    expect(typeof fc.vendorGST).toBe("number");
    expect(typeof fc.amount).toBe("number");
    expect(typeof fc.taxAmount).toBe("number");
    expect(typeof fc.invoiceDate).toBe("number");
    expect(typeof fc.invoiceNumber).toBe("number");
  });
});
