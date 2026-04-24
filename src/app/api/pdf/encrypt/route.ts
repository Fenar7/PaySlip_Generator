import { NextRequest, NextResponse } from "next/server";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";

export const runtime = "nodejs";

// 50MB — large PDFs with many high-res images
export const maxDuration = 60;

/** Maximum password length shared with client-side validation. */
export const PDF_ENCRYPT_PASSWORD_MAX_LENGTH = 32;

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

/**
 * Shared error messages aligned with the client-side PdfEncryptionError vocabulary.
 * Keep these in sync with pdf-encryptor.ts and workspace UIs.
 */
function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return errorResponse("Too many requests. Please wait a moment and try again.", 429);
  }

  const formData = await request.formData();
  const pdfBlob = formData.get("pdf");
  const optionsStr = formData.get("options");

  if (!(pdfBlob && typeof pdfBlob === "object" && "size" in pdfBlob && typeof pdfBlob.size === "number") || pdfBlob.size === 0) {
    return errorResponse("pdf is required", 400);
  }

  if (typeof optionsStr !== "string") {
    return errorResponse("options is required", 400);
  }

  let options: EncryptOptions;
  try {
    options = JSON.parse(optionsStr) as EncryptOptions;
  } catch {
    return errorResponse("Invalid options", 400);
  }

  if (typeof options.userPassword !== "string" || options.userPassword.length === 0) {
    return errorResponse("Password is required", 400);
  }

  if (options.userPassword.length > PDF_ENCRYPT_PASSWORD_MAX_LENGTH) {
    return errorResponse(
      `Password must be ${PDF_ENCRYPT_PASSWORD_MAX_LENGTH} characters or fewer`,
      400,
    );
  }

  // Sprint 37.1: harden owner-password validation
  if (
    typeof options.ownerPassword === "string" &&
    options.ownerPassword.length > PDF_ENCRYPT_PASSWORD_MAX_LENGTH
  ) {
    return errorResponse(
      `Owner password must be ${PDF_ENCRYPT_PASSWORD_MAX_LENGTH} characters or fewer`,
      400,
    );
  }

  // Size check (50MB limit)
  if (pdfBlob.size > 50 * 1024 * 1024) {
    return errorResponse("PDF is too large to encrypt. Try reducing image count or quality.", 413);
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
      return errorResponse("Encryption produced invalid output", 500);
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
    return errorResponse("PDF encryption failed. Please try again.", 500);
  }
}
