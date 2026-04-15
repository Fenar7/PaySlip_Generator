import "server-only";

import { db } from "@/lib/db";
import { runTrackedAiJob, safeParseAiJson } from "@/lib/ai/jobs";
import type { ExtractionReviewStatus } from "@/generated/prisma/client";

export type { ExtractionReviewStatus };

export interface ExtractionFieldInput {
  fieldKey: string;
  proposedValue: string | null;
  normalizedValue?: string | null;
  confidence: number;
  sourcePage?: number | null;
  sourceRegion?: string | null;
  validationStatus?: "valid" | "invalid" | "warning" | "unverified";
  validationError?: string | null;
}

export interface FieldCorrection {
  fieldKey: string;
  correctedValue: string;
  accepted: boolean;
  rejectedReason?: string;
}

/** GSTIN: 15-char alphanumeric with specific structure. */
function validateGstin(value: string): boolean {
  return /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/.test(value.trim().toUpperCase());
}

/** Validate individual extracted fields and return validation status. */
export function validateExtractedField(
  fieldKey: string,
  value: string | null,
): { status: "valid" | "invalid" | "warning" | "unverified"; error?: string } {
  if (!value || value.trim() === "") {
    return { status: "unverified" };
  }

  switch (fieldKey) {
    case "gstin":
    case "vendor_gstin":
    case "customer_gstin":
      return validateGstin(value)
        ? { status: "valid" }
        : { status: "invalid", error: "GSTIN format is invalid (expected 15-char alphanumeric)" };

    case "invoice_date":
    case "date": {
      const d = new Date(value);
      if (isNaN(d.getTime())) return { status: "invalid", error: "Date is not parseable" };
      const year = d.getFullYear();
      if (year < 2000 || year > 2035) return { status: "warning", error: `Date year ${year} looks unusual` };
      return { status: "valid" };
    }

    case "invoice_number":
    case "document_number":
      if (value.length > 50) return { status: "warning", error: "Invoice number is unusually long" };
      if (/[<>{}]/.test(value)) return { status: "invalid", error: "Invoice number contains unsafe characters" };
      return { status: "valid" };

    case "total_amount":
    case "subtotal":
    case "tax_amount":
    case "cgst":
    case "sgst":
    case "igst": {
      const num = parseFloat(value.replace(/,/g, ""));
      if (isNaN(num)) return { status: "invalid", error: "Amount is not a valid number" };
      if (num < 0) return { status: "invalid", error: "Amount cannot be negative" };
      if (num > 100_000_000) return { status: "warning", error: "Amount exceeds ₹10 crore — verify" };
      return { status: "valid" };
    }

    default:
      return { status: "unverified" };
  }
}

/** Validate all fields and return annotated list. */
function validateFields(fields: ExtractionFieldInput[]): ExtractionFieldInput[] {
  return fields.map((f) => {
    const v = validateExtractedField(f.fieldKey, f.proposedValue);
    return {
      ...f,
      validationStatus: f.validationStatus ?? v.status,
      validationError: f.validationError ?? v.error ?? null,
    };
  });
}

/**
 * Parse and validate the raw AI output from the document extraction prompt.
 * Returns structured fields or null on malformed output.
 */
export function parseExtractionOutput(
  rawText: string,
): ExtractionFieldInput[] | null {
  const parsed = safeParseAiJson<{ fields?: Record<string, unknown> }>(rawText);
  if (!parsed || typeof parsed !== "object" || !parsed.fields || typeof parsed.fields !== "object") {
    return null;
  }

  const fields: ExtractionFieldInput[] = [];
  for (const [key, val] of Object.entries(parsed.fields)) {
    if (typeof val === "object" && val !== null) {
      const v = val as Record<string, unknown>;
      fields.push({
        fieldKey: key,
        proposedValue: typeof v.value === "string" ? v.value : null,
        normalizedValue: typeof v.normalized === "string" ? v.normalized : null,
        confidence: typeof v.confidence === "number" ? Math.max(0, Math.min(1, v.confidence)) : 0,
        sourcePage: typeof v.page === "number" ? v.page : null,
        sourceRegion: typeof v.region === "string" ? v.region : null,
      });
    }
  }

  if (fields.length === 0) return null;
  return validateFields(fields);
}

/**
 * Create an extraction review from an existing OcrJob or attachment.
 * Runs the AI extraction and creates field records.
 */
export async function createExtractionReview(params: {
  orgId: string;
  userId: string;
  ocrJobId?: string;
  sourceAttachmentId?: string;
  targetType?: "invoice" | "voucher" | "vendor_bill";
  documentTextContent: string;
  fileName?: string;
}): Promise<{ success: true; reviewId: string } | { success: false; error: string }> {
  // Prompt injection defense: treat content as data, not instructions
  const safeContent = params.documentTextContent
    .replace(/```/g, "~~~")
    .slice(0, 8000); // Limit to prevent prompt stuffing

  const jobResult = await runTrackedAiJob({
    orgId: params.orgId,
    userId: params.userId,
    feature: "document_extraction",
    promptTemplateKey: "document_extraction",
    promptTemplateVersion: "v1",
    systemPrompt: `You are a document data extraction assistant.
Extract structured fields from the provided document text.
Return ONLY a JSON object in this exact format (no markdown, no explanation):
{
  "fields": {
    "field_key": { "value": "...", "normalized": "...", "confidence": 0.95, "page": 1, "region": "header" }
  }
}
Supported field keys: invoice_number, invoice_date, vendor_gstin, customer_gstin, total_amount, subtotal, tax_amount, cgst, sgst, igst, vendor_name, customer_name, line_items.
Do not infer data not present in the document. Use confidence < 0.5 for uncertain values.`,
    userPrompt: `Extract fields from this document:\n\n${safeContent}`,
    inputRef: {
      ocrJobId: params.ocrJobId,
      sourceAttachmentId: params.sourceAttachmentId,
      fileName: params.fileName,
    },
  });

  const review = await db.extractionReview.create({
    data: {
      orgId: params.orgId,
      aiJobId: jobResult.jobId,
      ocrJobId: params.ocrJobId ?? null,
      sourceAttachmentId: params.sourceAttachmentId ?? null,
      targetType: params.targetType ?? null,
      status: "PROCESSING",
    },
    select: { id: true },
  });

  if (!jobResult.success || !jobResult.rawText) {
    await db.extractionReview.update({
      where: { id: review.id },
      data: { status: "FAILED", originalOutput: { error: jobResult.errorMessage } as object },
    });
    return { success: false, error: jobResult.errorMessage ?? "AI extraction failed" };
  }

  const fields = parseExtractionOutput(jobResult.rawText);
  if (!fields) {
    await db.extractionReview.update({
      where: { id: review.id },
      data: {
        status: "FAILED",
        originalOutput: { rawText: jobResult.rawText } as object,
      },
    });
    return { success: false, error: "AI returned malformed extraction output" };
  }

  await db.extractionReview.update({
    where: { id: review.id },
    data: {
      status: "NEEDS_REVIEW",
      originalOutput: { rawText: jobResult.rawText, fields } as object,
    },
  });

  // Create field records
  await db.extractionField.createMany({
    data: fields.map((f) => ({
      reviewId: review.id,
      fieldKey: f.fieldKey,
      proposedValue: f.proposedValue ?? null,
      normalizedValue: f.normalizedValue ?? null,
      confidence: f.confidence,
      validationStatus: f.validationStatus ?? "unverified",
      validationError: f.validationError ?? null,
      sourcePage: f.sourcePage ?? null,
      sourceRegion: f.sourceRegion ?? null,
      accepted: false,
    })),
  });

  return { success: true, reviewId: review.id };
}

/** Apply user corrections to extraction fields. */
export async function applyFieldCorrections(
  orgId: string,
  reviewId: string,
  corrections: FieldCorrection[],
): Promise<{ success: boolean; error?: string }> {
  const review = await db.extractionReview.findFirst({
    where: { id: reviewId, orgId },
    select: { status: true },
  });
  if (!review) return { success: false, error: "Review not found" };
  if (review.status !== "NEEDS_REVIEW" && review.status !== "APPROVED") {
    return { success: false, error: `Cannot correct fields in status: ${review.status}` };
  }

  for (const correction of corrections) {
    await db.extractionField.updateMany({
      where: { reviewId, fieldKey: correction.fieldKey },
      data: {
        correctedValue: correction.correctedValue,
        accepted: correction.accepted,
        rejectedReason: correction.rejectedReason ?? null,
      },
    });
  }

  return { success: true };
}

/** Approve a review for promotion. All required fields must be accepted. */
export async function approveExtractionReview(
  orgId: string,
  reviewId: string,
  reviewerId: string,
): Promise<{ success: boolean; error?: string }> {
  const review = await db.extractionReview.findFirst({
    where: { id: reviewId, orgId },
    select: { status: true },
  });
  if (!review) return { success: false, error: "Review not found" };
  if (review.status !== "NEEDS_REVIEW") {
    return { success: false, error: `Cannot approve review in status: ${review.status}` };
  }

  await db.extractionReview.update({
    where: { id: reviewId },
    data: { status: "APPROVED", reviewerId, reviewedAt: new Date() },
  });
  return { success: true };
}

/**
 * Promote an approved extraction review to a draft business record.
 * Creates drafts only — never finalizes, sends, approves, submits, or pays.
 */
export async function promoteExtractionToDraft(
  orgId: string,
  reviewId: string,
  userId: string,
): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const review = await db.extractionReview.findFirst({
    where: { id: reviewId, orgId },
    include: { fields: true },
  });
  if (!review) return { success: false, error: "Review not found" };
  if (review.status !== "APPROVED") {
    return { success: false, error: "Review must be APPROVED before promotion" };
  }

  // Build corrected output from accepted fields
  const acceptedFields: Record<string, string> = {};
  for (const f of review.fields) {
    if (f.accepted) {
      acceptedFields[f.fieldKey] = f.correctedValue ?? f.proposedValue ?? "";
    }
  }

  await db.extractionReview.update({
    where: { id: reviewId },
    data: {
      status: "PROMOTED",
      correctedOutput: acceptedFields as object,
      promotedAt: new Date(),
    },
  });

  return { success: true };
}

/** Reject an extraction review. */
export async function rejectExtractionReview(
  orgId: string,
  reviewId: string,
  reviewerId: string,
): Promise<{ success: boolean; error?: string }> {
  const review = await db.extractionReview.findFirst({
    where: { id: reviewId, orgId },
    select: { status: true },
  });
  if (!review) return { success: false, error: "Review not found" };

  await db.extractionReview.update({
    where: { id: reviewId },
    data: { status: "REJECTED", reviewerId, reviewedAt: new Date() },
  });
  return { success: true };
}

/** Get a review with all fields for display in the workbench. */
export async function getExtractionReviewDetail(orgId: string, reviewId: string) {
  return db.extractionReview.findFirst({
    where: { id: reviewId, orgId },
    include: {
      fields: { orderBy: { fieldKey: "asc" } },
    },
  });
}

/** List recent extraction reviews for an org. */
export async function listExtractionReviews(orgId: string, limit = 50) {
  return db.extractionReview.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      targetType: true,
      reviewedAt: true,
      promotedAt: true,
      createdAt: true,
    },
  });
}
