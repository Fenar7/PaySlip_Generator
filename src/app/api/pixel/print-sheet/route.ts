import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PASSPORT_PRESETS } from "@/features/pixel/data/passport-presets";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis-client";
import { recordUsageEvent } from "@/lib/usage-metering";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB base64-decoded limit
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60;

// Paper size in mm
const PAPER_SIZES_MM: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

const MARGIN_MM = 10;
const GUTTER_MM = 2;
const WATERMARK_TEXT = "Slipwise One";

// ─── Rate limiting ─────────────────────────────────────────────────────────────

/**
 * Sliding-window rate limit using the existing RedisClient interface (get/set).
 * Uses a JSON-encoded counter+expiry stored in a single key.
 * Falls open if Redis is unavailable.
 */
async function isRateLimited(ip: string): Promise<boolean> {
  const key = `pixel:pdf:${ip}`;
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_SECONDS * 1000;

  try {
    const raw = await redis.get(key);
    if (raw !== null) {
      const record = JSON.parse(raw) as { count: number; resetAt: number };
      if (now < record.resetAt) {
        if (record.count >= RATE_LIMIT_MAX) return true;
        // Increment in-window counter
        await redis.set(
          key,
          JSON.stringify({ count: record.count + 1, resetAt: record.resetAt }),
          Math.ceil((record.resetAt - now) / 1000),
        );
        return false;
      }
    }
    // New window
    await redis.set(
      key,
      JSON.stringify({ count: 1, resetAt: now + windowMs }),
      RATE_LIMIT_WINDOW_SECONDS,
    );
    return false;
  } catch {
    return false; // Fail open
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS) },
      },
    );
  }

  // Parse body
  let body: {
    imageBase64: string;
    presetId: string;
    paperSize?: string;
    orgId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { imageBase64, presetId, paperSize = "a4", orgId } = body;

  // Validate preset
  const preset = PASSPORT_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    return NextResponse.json(
      { error: `Unknown preset: ${presetId}` },
      { status: 400 },
    );
  }

  // Validate paper size
  const paper = PAPER_SIZES_MM[paperSize];
  if (!paper) {
    return NextResponse.json(
      { error: `Unsupported paper size: ${paperSize}` },
      { status: 400 },
    );
  }

  // Validate and decode image
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ error: "imageBase64 is required." }, { status: 400 });
  }

  // Strip data URI prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBytes = Buffer.from(base64Data, "base64");

  if (imageBytes.length > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image too large. Maximum 4 MB." },
      { status: 413 },
    );
  }

  // ─── Watermark gate ────────────────────────────────────────────────────────
  // Public users (no orgId) always get the watermark.
  // Authenticated orgs with removeBranding=true suppress it.
  let suppressWatermark = false;
  if (orgId) {
    try {
      const wl = await db.orgWhiteLabel.findUnique({
        where: { orgId },
        select: { removeBranding: true },
      });
      suppressWatermark = wl?.removeBranding === true;
    } catch {
      // If DB lookup fails, keep watermark as safe default
      suppressWatermark = false;
    }
  }

  // ─── PDF generation ────────────────────────────────────────────────────────

  try {
    const pdfDoc = await PDFDocument.create();

    // Convert mm to PDF points (1 pt = 25.4/72 mm)
    const mmToPt = (mm: number) => mm * (72 / 25.4);

    const pageWidthPt = mmToPt(paper.width);
    const pageHeightPt = mmToPt(paper.height);
    const photoWidthPt = mmToPt(preset.widthMm);
    const photoHeightPt = mmToPt(preset.heightMm);
    const gutterPt = mmToPt(GUTTER_MM);
    const marginPt = mmToPt(MARGIN_MM);

    const usableWidth = pageWidthPt - 2 * marginPt;
    const usableHeight = pageHeightPt - 2 * marginPt;

    const columns = Math.max(
      1,
      Math.floor((usableWidth + gutterPt) / (photoWidthPt + gutterPt)),
    );
    const rows = Math.max(
      1,
      Math.floor((usableHeight + gutterPt) / (photoHeightPt + gutterPt)),
    );

    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

    // Embed image — try JPEG first, fall back to PNG
    let embeddedImage;
    try {
      embeddedImage = await pdfDoc.embedJpg(imageBytes);
    } catch {
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    }

    // Tile photos
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = marginPt + col * (photoWidthPt + gutterPt);
        // PDF y-axis is bottom-up; position from top
        const y =
          pageHeightPt -
          marginPt -
          (row + 1) * photoHeightPt -
          row * gutterPt;

        page.drawImage(embeddedImage, {
          x,
          y,
          width: photoWidthPt,
          height: photoHeightPt,
        });
      }
    }

    // Watermark
    if (!suppressWatermark) {
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const fontSize = 9;
      const text = `${WATERMARK_TEXT} — slipwise.one`;
      const textWidth = font.widthOfTextAtSize(text, fontSize);

      page.drawText(text, {
        x: (pageWidthPt - textWidth) / 2,
        y: marginPt / 2,
        size: fontSize,
        font,
        color: rgb(0.75, 0.75, 0.75),
        opacity: 0.8,
      });
    }

    const pdfBytes = await pdfDoc.save();

    // Log usage event (fire-and-forget, do not block response)
    if (orgId) {
      void recordUsageEvent(orgId, "PIXEL_JOB_SAVED", 1, `pdf:${presetId}:${paperSize}`).catch(
        () => {
          // Non-fatal
        },
      );
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="print-sheet-${preset.id}-${paperSize}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[pixel/print-sheet] PDF generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF. Please try again." },
      { status: 500 },
    );
  }
}
