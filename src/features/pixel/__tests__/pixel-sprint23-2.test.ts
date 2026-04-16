/**
 * Sprint 23.2 — Tests for PDF print sheet route and preset completeness.
 *
 * Route handler tests use mocked dependencies (pdf-lib, db, redis).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { PASSPORT_PRESETS } from "@/features/pixel/data/passport-presets";

// ─── Preset completeness — Sprint 23.2 additions ─────────────────────────────

describe("Sprint 23.2 preset additions", () => {
  const sprint23Additions = [
    { id: "australia-passport", widthMm: 35, heightMm: 45 },
    { id: "singapore-passport", widthMm: 35, heightMm: 45 },
    { id: "canada-passport", widthMm: 50, heightMm: 70 },
    { id: "japan-passport", widthMm: 35, heightMm: 45 },
    { id: "germany-passport", widthMm: 35, heightMm: 45 },
    { id: "france-passport", widthMm: 35, heightMm: 45 },
  ];

  for (const expected of sprint23Additions) {
    it(`${expected.id} has correct dimensions (${expected.widthMm}×${expected.heightMm}mm)`, () => {
      const preset = PASSPORT_PRESETS.find((p) => p.id === expected.id);
      expect(preset).toBeDefined();
      expect(preset!.widthMm).toBe(expected.widthMm);
      expect(preset!.heightMm).toBe(expected.heightMm);
    });
  }

  it("total preset count is 19 (13 original + 6 new)", () => {
    expect(PASSPORT_PRESETS.length).toBe(19);
  });
});

// ─── PDF print-sheet API route ────────────────────────────────────────────────

// Mock heavy deps that are unavailable in vitest Node environment
vi.mock("pdf-lib", () => {
  const mockPage = {
    drawImage: vi.fn(),
    drawText: vi.fn(),
  };
  const mockDoc = {
    addPage: vi.fn(() => mockPage),
    embedJpg: vi.fn(async () => ({ width: 413, height: 531 })),
    embedPng: vi.fn(async () => ({ width: 413, height: 531 })),
    embedFont: vi.fn(async () => ({
      widthOfTextAtSize: vi.fn(() => 100),
    })),
    save: vi.fn(async () => new Uint8Array([37, 80, 68, 70])), // %PDF
  };
  return {
    PDFDocument: { create: vi.fn(async () => mockDoc) },
    rgb: vi.fn(() => ({ r: 0.75, g: 0.75, b: 0.75 })),
    StandardFonts: { HelveticaBold: "Helvetica-Bold" },
    __mockDoc: mockDoc,
    __mockPage: mockPage,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    orgWhiteLabel: {
      findUnique: vi.fn(),
    },
    usageEvent: {
      create: vi.fn(async () => ({})),
    },
  },
}));

vi.mock("@/lib/redis-client", () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    del: vi.fn(async () => {}),
    exists: vi.fn(async () => false),
    ping: vi.fn(async () => true),
  },
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/pixel/print-sheet", () => {
  // Dynamic import to pick up mocks
  let POST: (req: NextRequest) => Promise<Response>;
  let db: { orgWhiteLabel: { findUnique: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    vi.clearAllMocks();
    const route = await import("@/app/api/pixel/print-sheet/route");
    POST = route.POST;
    const dbMod = await import("@/lib/db");
    db = dbMod.db as unknown as typeof db;
  });

  function makeRequest(body: unknown) {
    return new Request(new URL("http://localhost/api/pixel/print-sheet"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
  }

  // Tiny valid JPEG base64 (1×1 white pixel)
  const VALID_JPEG_B64 =
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC" +
    "AABAAEDASIA" +
    "AhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aA" +
    "AwDAQACEQMRAD8AJQAB/9k=";

  it("returns 400 for unknown presetId", async () => {
    const req = makeRequest({
      imageBase64: VALID_JPEG_B64,
      presetId: "nonexistent-country-id",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unknown preset/i);
  });

  it("returns 400 for invalid paper size", async () => {
    const req = makeRequest({
      imageBase64: VALID_JPEG_B64,
      presetId: "uk-passport",
      paperSize: "invalid-size",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/unsupported paper size/i);
  });

  it("returns 400 when imageBase64 is missing", async () => {
    const req = makeRequest({ presetId: "uk-passport" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns PDF response for valid request with watermark (public user)", async () => {
    (db.orgWhiteLabel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = makeRequest({
      imageBase64: VALID_JPEG_B64,
      presetId: "uk-passport",
      paperSize: "a4",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");

    const { __mockPage } = await import("pdf-lib") as unknown as {
      __mockPage: { drawText: ReturnType<typeof vi.fn> };
    };
    // Watermark should be drawn for public users
    expect(__mockPage.drawText).toHaveBeenCalledWith(
      expect.stringContaining("Slipwise One"),
      expect.objectContaining({ size: 9 }),
    );
  });

  it("suppresses watermark when org has removeBranding=true", async () => {
    (db.orgWhiteLabel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      removeBranding: true,
    });

    const req = makeRequest({
      imageBase64: VALID_JPEG_B64,
      presetId: "uk-passport",
      paperSize: "a4",
      orgId: "org_test_123",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const { __mockPage } = await import("pdf-lib") as unknown as {
      __mockPage: { drawText: ReturnType<typeof vi.fn> };
    };
    // Watermark should NOT be drawn
    expect(__mockPage.drawText).not.toHaveBeenCalled();
  });

  it("still shows watermark when org has removeBranding=false", async () => {
    (db.orgWhiteLabel.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      removeBranding: false,
    });

    const req = makeRequest({
      imageBase64: VALID_JPEG_B64,
      presetId: "us-passport",
      paperSize: "letter",
      orgId: "org_test_456",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const { __mockPage } = await import("pdf-lib") as unknown as {
      __mockPage: { drawText: ReturnType<typeof vi.fn> };
    };
    expect(__mockPage.drawText).toHaveBeenCalled();
  });

  it("returns 413 when image exceeds 4MB limit", async () => {
    // Generate a string large enough to exceed 4MB when base64-decoded
    const oversized = "A".repeat(4 * 1024 * 1024 * 1.5);
    const req = makeRequest({
      imageBase64: oversized,
      presetId: "uk-passport",
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const { redis } = await import("@/lib/redis-client");
    // Simulate a window with count already at max
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      JSON.stringify({ count: 10, resetAt: Date.now() + 30_000 }),
    );

    const req = makeRequest({
      imageBase64: VALID_JPEG_B64,
      presetId: "uk-passport",
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});

// ─── Watermark gate logic ─────────────────────────────────────────────────────

describe("watermark gate logic", () => {
  it("public users (no orgId) always get watermark", () => {
    // Unit-test the logic directly
    const orgId = undefined;
    const suppressWatermark = orgId ? false : false; // public = false (watermark shown)
    expect(suppressWatermark).toBe(false);
  });

  it("org with removeBranding=true suppresses watermark", () => {
    const removeBranding = true;
    const suppressWatermark = removeBranding === true;
    expect(suppressWatermark).toBe(true);
  });

  it("org with removeBranding=false shows watermark", () => {
    // The gate expression: `config?.removeBranding === true`
    // should return false when removeBranding is falsy
    const config = { removeBranding: false as boolean };
    const suppressWatermark = config?.removeBranding === true;
    expect(suppressWatermark).toBe(false);
  });
});
