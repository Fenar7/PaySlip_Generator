import { NextRequest, NextResponse } from "next/server";
import { getOrgContext } from "@/lib/auth";
import { extractDocument } from "@/lib/ocr-extractor";
import { rateLimitByOrg, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await rateLimitByOrg(ctx.orgId, RATE_LIMITS.ocrExtract);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before retrying." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfter ?? 60),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided. Upload a file with field name 'file'." },
        { status: 400 },
      );
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.some((t) => file.type.startsWith(t.replace("/*", "")) || file.type === t)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: image/* or application/pdf.` },
        { status: 400 },
      );
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.` },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const result = await extractDocument(base64, file.type, ctx.orgId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Document extraction failed:", error);
    return NextResponse.json(
      { error: "Document extraction failed." },
      { status: 500 },
    );
  }
}
