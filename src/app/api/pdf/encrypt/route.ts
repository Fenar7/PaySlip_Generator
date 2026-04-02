import { NextRequest, NextResponse } from "next/server";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";

export const runtime = "nodejs";

// 50MB — large PDFs with many high-res images
export const maxDuration = 60;

interface EncryptRequestBody {
  pdfBytes: number[];
  userPassword: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    copying?: boolean;
    modifying?: boolean;
  };
}

// Simple in-memory rate limiter (per-IP, 10 req/min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 10;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: EncryptRequestBody;
  try {
    body = (await request.json()) as EncryptRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Validate inputs
  if (!Array.isArray(body.pdfBytes) || body.pdfBytes.length === 0) {
    return NextResponse.json({ error: "pdfBytes is required" }, { status: 400 });
  }

  if (typeof body.userPassword !== "string" || body.userPassword.length === 0) {
    return NextResponse.json({ error: "userPassword is required" }, { status: 400 });
  }

  if (body.userPassword.length > 32) {
    return NextResponse.json({ error: "Password too long" }, { status: 400 });
  }

  // Validate body size limit (~50MB of JSON)
  const rawBytes = body.pdfBytes;
  if (rawBytes.length > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF too large" }, { status: 413 });
  }

  try {
    const pdfBytes = new Uint8Array(rawBytes);

    const encryptedBytes = await encryptPDF(pdfBytes, body.userPassword, {
      ownerPassword: body.ownerPassword,
      algorithm: "AES-256",
      allowPrinting: body.permissions?.printing ?? true,
      allowHighQualityPrint: body.permissions?.printing ?? true,
      allowCopying: body.permissions?.copying ?? true,
      allowModifying: body.permissions?.modifying ?? true,
      allowAnnotating: true,
      allowFillingForms: true,
      allowExtraction: body.permissions?.copying ?? true,
      allowAssembly: body.permissions?.modifying ?? true,
    });

    return new NextResponse(Buffer.from(encryptedBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    // Never expose internal error details — fail-closed
    return NextResponse.json({ error: "Encryption failed" }, { status: 500 });
  }
}
