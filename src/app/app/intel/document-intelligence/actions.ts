"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { getOrgPlan } from "@/lib/plans/enforcement";
import {
  createExtractionReview,
  applyFieldCorrections,
  approveExtractionReview,
  promoteExtractionToDraft,
  rejectExtractionReview,
  getExtractionReviewDetail,
  listExtractionReviews,
  type FieldCorrection,
} from "@/lib/intel/extraction";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

async function assertDocumentIntelligencePlan(orgId: string): Promise<{ allowed: boolean; error?: string }> {
  const plan = await getOrgPlan(orgId);
  if (!plan.limits.documentIntelligence) {
    return { allowed: false, error: "Document Intelligence requires a Pro or Enterprise plan." };
  }
  return { allowed: true };
}

const MAX_TEXT_LENGTH = 50_000; // chars
const ALLOWED_TARGET_TYPES = ["invoice", "voucher", "vendor_bill"] as const;

export async function createExtractionJobAction(params: {
  documentTextContent: string;
  ocrJobId?: string;
  targetType?: "invoice" | "voucher" | "vendor_bill";
  fileName?: string;
}): Promise<ActionResult<{ reviewId: string }>> {
  const { orgId, userId } = await requireOrgContext();
  const gate = await assertDocumentIntelligencePlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  if (!params.documentTextContent || params.documentTextContent.trim().length < 10) {
    return { success: false, error: "Document text is too short to extract" };
  }
  if (params.documentTextContent.length > MAX_TEXT_LENGTH) {
    return { success: false, error: `Document text exceeds ${MAX_TEXT_LENGTH} character limit` };
  }
  if (params.targetType && !ALLOWED_TARGET_TYPES.includes(params.targetType)) {
    return { success: false, error: "Invalid target document type" };
  }

  const result = await createExtractionReview({
    orgId,
    userId,
    ocrJobId: params.ocrJobId,
    targetType: params.targetType,
    documentTextContent: params.documentTextContent,
    fileName: params.fileName,
  });

  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: { reviewId: result.reviewId } };
}

export async function applyFieldCorrectionsAction(
  reviewId: string,
  corrections: FieldCorrection[],
): Promise<ActionResult<void>> {
  const { orgId } = await requireOrgContext();
  const gate = await assertDocumentIntelligencePlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  if (!Array.isArray(corrections) || corrections.length === 0) {
    return { success: false, error: "No corrections provided" };
  }

  const result = await applyFieldCorrections(orgId, reviewId, corrections);
  if (!result.success) return { success: false, error: result.error! };
  return { success: true, data: undefined };
}

export async function approveExtractionReviewAction(
  reviewId: string,
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireOrgContext();
  await requireRole("admin");
  const gate = await assertDocumentIntelligencePlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const result = await approveExtractionReview(orgId, reviewId, userId);
  if (!result.success) return { success: false, error: result.error! };
  return { success: true, data: undefined };
}

export async function promoteExtractionToDraftAction(
  reviewId: string,
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireOrgContext();
  await requireRole("admin");
  const gate = await assertDocumentIntelligencePlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const result = await promoteExtractionToDraft(orgId, reviewId, userId);
  if (!result.success) return { success: false, error: result.error! };
  return { success: true, data: undefined };
}

export async function rejectExtractionReviewAction(
  reviewId: string,
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireOrgContext();
  await requireRole("admin");
  const gate = await assertDocumentIntelligencePlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const result = await rejectExtractionReview(orgId, reviewId, userId);
  if (!result.success) return { success: false, error: result.error! };
  return { success: true, data: undefined };
}

export async function getExtractionReviewDetailAction(
  reviewId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getExtractionReviewDetail>>>> {
  const { orgId } = await requireOrgContext();
  const gate = await assertDocumentIntelligencePlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const data = await getExtractionReviewDetail(orgId, reviewId);
  return { success: true, data };
}

export async function listExtractionReviewsAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof listExtractionReviews>>>
> {
  const { orgId } = await requireOrgContext();
  const gate = await assertDocumentIntelligencePlan(orgId);
  if (!gate.allowed) return { success: false, error: gate.error! };

  const data = await listExtractionReviews(orgId);
  return { success: true, data };
}
