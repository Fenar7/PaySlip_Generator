"use server";

import { db } from "@/lib/db";
import { MarketplaceTemplateStatus } from "@/generated/prisma/client";
import { requireMarketplaceModerator } from "@/lib/auth";
import {
  buildMarketplaceRevisionSnapshot,
  resolveMarketplacePublisherDisplayName,
} from "@/lib/marketplace-template-revisions";
import { revalidatePath } from "next/cache";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type ReviewQueueItem = {
  id: string;
  name: string;
  templateType: string;
  status: MarketplaceTemplateStatus;
  submittedAt: string;
  publisherDisplayName: string;
};

type ReviewTemplateDetail = {
  id: string;
  name: string;
  description: string;
  status: MarketplaceTemplateStatus;
  templateType: string;
  publisherDisplayName: string;
  price: number;
  currency: string;
  version: string;
  category: string[];
  tags: string[];
  previewImageUrl: string;
  previewPdfUrl: string | null;
  rejectionReason: string | null;
};

function formatTemplateStatus(status: MarketplaceTemplateStatus): string {
  return status.toLowerCase().replaceAll("_", " ");
}

// ─── Get pending review queue ──────────────────────────────────────────────────

export async function getReviewQueue(): Promise<ActionResult<ReviewQueueItem[]>> {
  try {
    await requireMarketplaceModerator();

    const templates = await db.marketplaceTemplate.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: {
        publisherOrg: {
          select: { name: true },
        },
      },
    });

    return {
      success: true,
      data: templates.map((template) => ({
        id: template.id,
        name: template.name,
        templateType: template.templateType,
        status: template.status,
        submittedAt: template.createdAt.toISOString(),
        publisherDisplayName: resolveMarketplacePublisherDisplayName(template),
      })),
    };
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
): Promise<ActionResult<ReviewTemplateDetail>> {
  try {
    await requireMarketplaceModerator();

    const template = await db.marketplaceTemplate.findUnique({
      where: { id: templateId },
      include: {
        publisherOrg: {
          select: { name: true },
        },
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    return {
      success: true,
      data: {
        id: template.id,
        name: template.name,
        description: template.description,
        status: template.status,
        templateType: template.templateType,
        publisherDisplayName: resolveMarketplacePublisherDisplayName(template),
        price: Number(template.price),
        currency: template.currency,
        version: template.version,
        category: template.category,
        tags: template.tags,
        previewImageUrl: template.previewImageUrl,
        previewPdfUrl: template.previewPdfUrl ?? null,
        rejectionReason: template.rejectionReason ?? null,
      },
    };
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
    const { userId } = await requireMarketplaceModerator();

    const result = await db.$transaction(async (tx): Promise<ActionResult<boolean>> => {
      const template = await tx.marketplaceTemplate.findUnique({
        where: { id: templateId },
        include: {
          publisherOrg: {
            select: { name: true },
          },
        },
      });
      if (!template) throw new Error("Template not found");

      if (template.status === "PUBLISHED") {
        return { success: true, data: true };
      }

      if (template.status !== "PENDING_REVIEW") {
        return {
          success: false,
          error: `Cannot approve a template from ${formatTemplateStatus(template.status)}`,
        };
      }

      const now = new Date();

      const claimed = await tx.marketplaceTemplate.updateMany({
        where: { id: templateId, status: "PENDING_REVIEW" },
        data: {
          status: "PUBLISHED",
          reviewedByUserId: userId,
          reviewedAt: now,
          publishedAt: now,
          rejectionReason: null,
          reviewNotes: null,
        },
      });

      if (claimed.count === 0) {
        const current = await tx.marketplaceTemplate.findUnique({
          where: { id: templateId },
          select: { status: true },
        });

        if (current?.status === "PUBLISHED") {
          return { success: true, data: true };
        }

        return {
          success: false,
          error: current
            ? `Cannot approve a template from ${formatTemplateStatus(current.status)}`
            : "Template not found",
        };
      }

      const revision = await tx.marketplaceTemplateRevision.create({
        data: {
          templateId,
          ...buildMarketplaceRevisionSnapshot({
            name: template.name,
            description: template.description,
            templateType: template.templateType,
            version: template.version,
            templateData: template.templateData,
            previewImageUrl: template.previewImageUrl,
            previewPdfUrl: template.previewPdfUrl ?? null,
            status: "PUBLISHED",
            publisherOrgId: template.publisherOrgId ?? null,
            publisherName: template.publisherName,
            publisherOrg: template.publisherOrg,
            reviewedByUserId: userId,
            reviewedAt: now,
            publishedAt: now,
          }),
        },
      });

      if (!revision) {
        throw new Error("Failed to create published revision");
      }

      return { success: true, data: true };
    });

    if (result.success) {
      revalidatePath("/app/docs/templates/review");
      revalidatePath(`/app/docs/templates/review/${templateId}`);
      revalidatePath("/app/docs/templates/marketplace");
    }

    return result;
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
    const { userId } = await requireMarketplaceModerator();
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      return { success: false, error: "Rejection reason is required" };
    }

    const reviewedAt = new Date();
    const result = await db.marketplaceTemplate.updateMany({
      where: { id: templateId, status: "PENDING_REVIEW" },
      data: {
        status: "REJECTED",
        rejectionReason: normalizedReason,
        reviewNotes: notes?.trim() || null,
        reviewedByUserId: userId,
        reviewedAt,
        publishedAt: null,
        archivedAt: null,
      },
    });

    if (result.count === 0) {
      const current = await db.marketplaceTemplate.findUnique({
        where: { id: templateId },
        select: { status: true },
      });

      return {
        success: false,
        error: current
          ? `Cannot reject a template from ${formatTemplateStatus(current.status)}`
          : "Template not found",
      };
    }

    revalidatePath("/app/docs/templates/review");
    revalidatePath(`/app/docs/templates/review/${templateId}`);
    revalidatePath("/app/docs/templates/marketplace");

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
    const { userId } = await requireMarketplaceModerator();
    const reviewedAt = new Date();

    const result = await db.marketplaceTemplate.updateMany({
      where: {
        id: templateId,
        status: { in: ["PUBLISHED", "REJECTED"] },
      },
      data: {
        status: "ARCHIVED",
        archivedAt: reviewedAt,
        reviewedByUserId: userId,
        reviewedAt,
      },
    });

    if (result.count === 0) {
      const current = await db.marketplaceTemplate.findUnique({
        where: { id: templateId },
        select: { status: true },
      });

      if (current?.status === "ARCHIVED") {
        return { success: true, data: true };
      }

      return {
        success: false,
        error: current
          ? `Cannot archive a template from ${formatTemplateStatus(current.status)}`
          : "Template not found",
      };
    }

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
