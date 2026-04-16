import "server-only";

import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const TOKEN_EXPIRY_MINUTES = 30;
const MAX_FAILURES = 5;

function generateVerificationToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

// ─── Issue a new verification token ─────────────────────────────────────────

export async function issueRecipientVerification(params: {
  sharedDocumentId: string;
  recipientEmail: string;
  ip?: string;
}): Promise<void> {
  const { sharedDocumentId, recipientEmail, ip } = params;
  const { raw, hash } = generateVerificationToken();

  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

  // Expire any existing PENDING verifications for this document + email
  await db.recipientVerification.updateMany({
    where: {
      sharedDocumentId,
      recipientEmail,
      status: "PENDING",
    },
    data: { status: "EXPIRED" },
  });

  await db.recipientVerification.create({
    data: {
      sharedDocumentId,
      recipientEmail,
      tokenHash: hash,
      expiresAt,
      ip: ip ?? null,
    },
  });

  // Fetch the share document for context to include in email
  const doc = await db.sharedDocument.findUnique({
    where: { id: sharedDocumentId },
    select: { docType: true, shareToken: true },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const verifyUrl = `${baseUrl}/share/${doc?.docType ?? "doc"}/${doc?.shareToken}?verify=${raw}`;

  await sendEmail({
    to: recipientEmail,
    subject: "Verify your identity to access this document",
    html: `
      <p>You requested access to a shared document that requires identity verification.</p>
      <p>Click the link below to confirm your email and access the document. This link expires in ${TOKEN_EXPIRY_MINUTES} minutes.</p>
      <p><a href="${verifyUrl}">Verify and access document</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });
}

// ─── Verify a submitted token ────────────────────────────────────────────────

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "max_failures" | "already_verified" };

export async function verifyRecipientToken(
  rawToken: string,
  ip?: string,
): Promise<VerifyResult> {
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const record = await db.recipientVerification.findUnique({
    where: { tokenHash: hash },
  });

  if (!record) return { ok: false, reason: "invalid" };

  if (record.status === "VERIFIED") return { ok: false, reason: "already_verified" };

  if (record.status === "EXPIRED" || record.expiresAt < new Date()) {
    await db.recipientVerification.update({
      where: { id: record.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, reason: "expired" };
  }

  if (record.failureCount >= MAX_FAILURES) {
    return { ok: false, reason: "max_failures" };
  }

  if (record.status !== "PENDING") {
    return { ok: false, reason: "invalid" };
  }

  // Mark as verified
  await db.recipientVerification.update({
    where: { id: record.id },
    data: { status: "VERIFIED", verifiedAt: new Date(), ip: ip ?? null },
  });

  return { ok: true };
}

// ─── Check if a document already has a VERIFIED verification for this email ──

export async function isRecipientVerified(
  sharedDocumentId: string,
  recipientEmail: string,
): Promise<boolean> {
  const record = await db.recipientVerification.findFirst({
    where: {
      sharedDocumentId,
      recipientEmail,
      status: "VERIFIED",
    },
    select: { id: true },
  });
  return record !== null;
}

// ─── Record a failed attempt (called when visitor submits wrong token) ───────

export async function recordVerificationFailure(rawToken: string): Promise<void> {
  const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await db.recipientVerification
    .update({
      where: { tokenHash: hash },
      data: { failureCount: { increment: 1 } },
    })
    .catch(() => {});
}
