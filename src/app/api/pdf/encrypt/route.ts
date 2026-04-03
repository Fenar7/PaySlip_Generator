import { NextRequest, NextResponse } from "next/server";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";

export const runtime = "nodejs";

// 50MB — large PDFs with many high-res images
export const maxDuration = 60;

interface EncryptOptions {
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

  const formData = await request.formData();
  const pdfBlob = formData.get("pdf");
  const optionsStr = formData.get("options");

  if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
    return NextResponse.json({ error: "pdf is required" }, { status: 400 });
  }

  if (typeof optionsStr !== "string") {
    return NextResponse.json({ error: "options is required" }, { status: 400 });
  }

  let options: EncryptOptions;
  try {
    options = JSON.parse(optionsStr) as EncryptOptions;
  } catch {
    return NextResponse.json({ error: "Invalid options" }, { status: 400 });
  }

  if (typeof options.userPassword !== "string" || options.userPassword.length === 0) {
    return NextResponse.json({ error: "userPassword is required" }, { status: 400 });
  }

  if (options.userPassword.length > 32) {
    return NextResponse.json({ error: "Password too long" }, { status: 400 });
  }

  // Size check (50MB limit)
  if (pdfBlob.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF too large" }, { status: 413 });
  }

  try {
    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());

    const encryptedBytes = await encryptPDF(pdfBytes, options.userPassword, {
      ownerPassword: options.ownerPassword,
      algorithm: "AES-256",
      allowPrinting: options.permissions?.printing ?? true,
      allowHighQualityPrint: options.permissions?.printing ?? true,
      allowCopying: options.permissions?.copying ?? true,
      allowModifying: options.permissions?.modifying ?? true,
      allowAnnotating: true,
      allowFillingForms: true,
      allowExtraction: options.permissions?.copying ?? true,
      allowAssembly: options.permissions?.modifying ?? true,
    });

    // Verify encrypted output is a valid PDF (sanity check: %PDF header)
    if (
      encryptedBytes.length < 5 ||
      encryptedBytes[0] !== 0x25 ||
      encryptedBytes[1] !== 0x50 ||
      encryptedBytes[2] !== 0x44 ||
      encryptedBytes[3] !== 0x46
    ) {
      return NextResponse.json({ error: "Encryption produced invalid output" }, { status: 500 });
    }

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
