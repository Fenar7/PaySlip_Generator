"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Get pending review queue ──────────────────────────────────────────────────

export async function getReviewQueue(): Promise<ActionResult<Record<string, unknown>[]>> {
  try {
    await requireRole("admin");

    const templates = await db.marketplaceTemplate.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: {
        publisherOrg: {
          select: { name: true },
        },
      },
    });

    return { success: true, data: templates };
  } catch (error) {
    console.error("getReviewQueue error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load review queue",
    };
  }
}

// ─── Get single template for review ───────────────────────────────────────────

export async function getTemplateForReview(
  templateId: string
): Promise<ActionResult<Record<string, unknown>>> {
  try {
    await requireRole("admin");

    const template = await db.marketplaceTemplate.findUnique({
      where: { id: templateId },
      include: {
        publisherOrg: true,
        revisions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, data: template };
  } catch (error) {
    console.error("getTemplateForReview error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get template",
    };
  }
}

// ─── Governance Actions ───────────────────────────────────────────────────────

export async function approveTemplate(templateId: string): Promise<ActionResult<boolean>> {
  try {
    const { userId } = await requireRole("admin");

    return await db.$transaction(async (tx) => {
      const template = await tx.marketplaceTemplate.findUnique({ where: { id: templateId } });
      if (!template) throw new Error("Template not found");

      const now = new Date();

      // Create a stable revision for this version
      const revision = await tx.marketplaceTemplateRevision.create({
        data: {
          templateId,
          version: template.version,
          templateData: template.templateData as object,
          previewImageUrl: template.previewImageUrl,
          previewPdfUrl: template.previewPdfUrl,
          status: "PUBLISHED",
          createdBy: template.publisherOrgId,
          reviewedBy: userId,
          reviewedAt: now,
          publishedAt: now,
        },
      });

      // Update the main template
      await tx.marketplaceTemplate.update({
        where: { id: templateId },
        data: {
          status: "PUBLISHED",
          reviewedBy: userId,
          reviewedAt: now,
          publishedAt: now,
          rejectionReason: null,
        },
      });

      revalidatePath("/app/docs/templates/review");
      revalidatePath(`/app/docs/templates/review/${templateId}`);
      revalidatePath("/app/docs/templates/marketplace");

      return { success: true, data: true };
    });
  } catch (error) {
    console.error("approveTemplate error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve template",
    };
  }
}

export async function rejectTemplate(
  templateId: string,
  reason: string,
  notes?: string
): Promise<ActionResult<boolean>> {
  try {
    const { userId } = await requireRole("admin");

    await db.marketplaceTemplate.update({
      where: { id: templateId },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        reviewNotes: notes,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    revalidatePath("/app/docs/templates/review");
    revalidatePath(`/app/docs/templates/review/${templateId}`);

    return { success: true, data: true };
  } catch (error) {
    console.error("rejectTemplate error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reject template",
    };
  }
}

export async function archiveTemplate(templateId: string): Promise<ActionResult<boolean>> {
  try {
    const { userId } = await requireRole("admin");

    await db.marketplaceTemplate.update({
      where: { id: templateId },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    revalidatePath("/app/docs/templates/review");
    revalidatePath(`/app/docs/templates/review/${templateId}`);
    revalidatePath("/app/docs/templates/marketplace");

    return { success: true, data: true };
  } catch (error) {
    console.error("archiveTemplate error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive template",
    };
  }
}
