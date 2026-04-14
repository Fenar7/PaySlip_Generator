"use server";

import crypto from "crypto";
import { MarketplaceTemplateStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  getAuthRoutingContext,
  isMarketplaceModeratorUser,
  requireOrgContext,
  requireRole,
} from "@/lib/auth";
import { resolveMarketplacePublisherDisplayName } from "@/lib/marketplace-template-revisions";
import { checkFeature } from "@/lib/plans/enforcement";
import { revalidatePath } from "next/cache";
import Razorpay from "razorpay";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type MarketplaceTemplateCard = {
  id: string;
  name: string;
  description: string;
  templateType: string;
  category: string[];
  price: number;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  publisherDisplayName: string;
  previewImageUrl: string;
};

type MarketplaceTemplateReview = {
  id: string;
  rating: number;
  review: string | null;
  createdAt: string;
};

type MarketplaceTemplateDetail = {
  id: string;
  name: string;
  description: string;
  templateType: string;
  category: string[];
  tags: string[];
  price: number;
  currency: string;
  version: string;
  status: MarketplaceTemplateStatus;
  publisherDisplayName: string;
  previewImageUrl: string;
  previewPdfUrl: string | null;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  reviews: MarketplaceTemplateReview[];
  rejectionReason?: string | null;
  reviewNotes?: string | null;
};

type InstalledTemplateCard = {
  purchaseId: string;
  templateId: string;
  revisionId: string;
  revisionVersion: string;
  displayName: string;
  description: string;
  templateType: string;
  publisherDisplayName: string;
  previewImageUrl: string;
  installedAt: string;
};

type TemplateDetailActor = "public" | "publisher" | "moderator";

function serializeMarketplaceTemplateCard(template: {
  id: string;
  name: string;
  description: string;
  templateType: string;
  category: string[];
  price: Prisma.Decimal | number;
  rating: Prisma.Decimal | number | null;
  ratingCount: number;
  downloadCount: number;
  publisherName: string;
  previewImageUrl: string;
  publisherOrg: { name: string } | null;
}): MarketplaceTemplateCard {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    templateType: template.templateType,
    category: template.category,
    price: Number(template.price),
    rating: Number(template.rating ?? 0),
    reviewCount: template.ratingCount,
    downloadCount: template.downloadCount,
    publisherDisplayName: resolveMarketplacePublisherDisplayName(template),
    previewImageUrl: template.previewImageUrl,
  };
}

function serializeTemplateDetail(
  template: {
    id: string;
    name: string;
    description: string;
    templateType: string;
    category: string[];
    tags: string[];
    price: Prisma.Decimal | number;
    currency: string;
    version: string;
    status: MarketplaceTemplateStatus;
    publisherName: string;
    previewImageUrl: string;
    previewPdfUrl: string | null;
    rating: Prisma.Decimal | number | null;
    ratingCount: number;
    downloadCount: number;
    rejectionReason: string | null;
    reviewNotes: string | null;
    publisherOrg: { name: string } | null;
    reviews: Array<{
      id: string;
      rating: number;
      review: string | null;
      createdAt: Date;
    }>;
  },
  actor: TemplateDetailActor,
): MarketplaceTemplateDetail {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    templateType: template.templateType,
    category: template.category,
    tags: template.tags,
    price: Number(template.price),
    currency: template.currency,
    version: template.version,
    status: template.status,
    publisherDisplayName: resolveMarketplacePublisherDisplayName(template),
    previewImageUrl: template.previewImageUrl,
    previewPdfUrl: template.previewPdfUrl ?? null,
    rating: Number(template.rating ?? 0),
    reviewCount: template.ratingCount,
    downloadCount: template.downloadCount,
    reviews: template.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      review: review.review ?? null,
      createdAt: review.createdAt.toISOString(),
    })),
    ...(actor === "public"
      ? {}
      : {
          rejectionReason: template.rejectionReason ?? null,
          reviewNotes: template.reviewNotes ?? null,
        }),
  };
}

function serializeInstalledTemplate(purchase: {
  id: string;
  templateId: string;
  revisionId: string | null;
  installedAt: Date;
  revision: {
    id: string;
    version: string;
    name: string;
    description: string;
    templateType: string;
    publisherDisplayName: string;
    previewImageUrl: string;
  } | null;
}): InstalledTemplateCard {
  if (!purchase.revisionId || !purchase.revision) {
    throw new Error(
      "Installed template data is incomplete. Run scripts/backfill-template-revisions.ts before using installed templates.",
    );
  }

  return {
    purchaseId: purchase.id,
    templateId: purchase.templateId,
    revisionId: purchase.revisionId,
    revisionVersion: purchase.revision.version,
    displayName: purchase.revision.name,
    description: purchase.revision.description,
    templateType: purchase.revision.templateType,
    publisherDisplayName: purchase.revision.publisherDisplayName,
    previewImageUrl: purchase.revision.previewImageUrl,
    installedAt: purchase.installedAt.toISOString(),
  };
}

async function getTemplateDetailActor(
  templatePublisherOrgId: string | null,
): Promise<TemplateDetailActor> {
  const authContext = await getAuthRoutingContext();

  if (!authContext.isAuthenticated) {
    return "public";
  }

  if (isMarketplaceModeratorUser(authContext.userId)) {
    return "moderator";
  }

  if (authContext.hasOrg && templatePublisherOrgId && authContext.orgId === templatePublisherOrgId) {
    return "publisher";
  }

  return "public";
}

function canViewTemplateDetail(
  status: MarketplaceTemplateStatus,
  actor: TemplateDetailActor,
): boolean {
  if (actor === "moderator" || actor === "publisher") {
    return true;
  }

  return status === "PUBLISHED";
}

// ─── Browse marketplace templates ─────────────────────────────────────────────

export async function browseTemplates(filters?: {
  category?: string;
  templateType?: string;
  search?: string;
  priceFilter?: "free" | "paid" | "all";
  sort?: "popular" | "newest" | "top-rated";
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ templates: MarketplaceTemplateCard[]; total: number }>> {
  try {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 12;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MarketplaceTemplateWhereInput = { status: "PUBLISHED" };

    if (filters?.category) {
      where.category = { has: filters.category };
    }

    if (filters?.templateType) {
      where.templateType = filters.templateType;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.priceFilter === "free") {
      where.price = 0;
    } else if (filters?.priceFilter === "paid") {
      where.price = { gt: 0 };
    }

    let orderBy: Prisma.MarketplaceTemplateOrderByWithRelationInput = { createdAt: "desc" };
    if (filters?.sort === "popular") {
      orderBy = { downloadCount: "desc" };
    } else if (filters?.sort === "top-rated") {
      orderBy = { rating: "desc" };
    }

    const [templates, total] = await Promise.all([
      db.marketplaceTemplate.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          publisherOrg: {
            select: { name: true },
          },
        },
      }),
      db.marketplaceTemplate.count({ where }),
    ]);

    return {
      success: true,
      data: {
        templates: templates.map(serializeMarketplaceTemplateCard),
        total,
      },
    };
  } catch (error) {
    console.error("browseTemplates error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to browse templates",
    };
  }
}

// ─── Get single template detail ───────────────────────────────────────────────

export async function getTemplateDetail(
  templateId: string,
): Promise<ActionResult<MarketplaceTemplateDetail>> {
  try {
    const template = await db.marketplaceTemplate.findUnique({
      where: { id: templateId },
      include: {
        publisherOrg: {
          select: { name: true },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            rating: true,
            review: true,
            createdAt: true,
          },
        },
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    const actor = await getTemplateDetailActor(template.publisherOrgId ?? null);

    if (!canViewTemplateDetail(template.status, actor)) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, data: serializeTemplateDetail(template, actor) };
  } catch (error) {
    console.error("getTemplateDetail error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get template",
    };
  }
}

// ─── Install free template ────────────────────────────────────────────────────

export async function installFreeTemplate(
  templateId: string,
): Promise<ActionResult<{ purchaseId: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const template = await db.marketplaceTemplate.findUnique({
      where: { id: templateId },
      include: {
        revisions: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (template.status !== "PUBLISHED") {
      return { success: false, error: "Template is not available for installation" };
    }

    if (Number(template.price) !== 0) {
      return { success: false, error: "This template requires payment" };
    }

    const latestRevision = template.revisions[0];
    if (!latestRevision) {
      return {
        success: false,
        error: "Template is not ready for installation until revision backfill completes",
      };
    }

    const existing = await db.marketplacePurchase.findUnique({
      where: {
        orgId_templateId: { orgId, templateId },
      },
      select: {
        id: true,
        revisionId: true,
        status: true,
      },
    });

    if (existing) {
      if (!existing.revisionId) {
        await db.marketplacePurchase.update({
          where: { id: existing.id },
          data: { revisionId: latestRevision.id },
        });
      }

      return { success: true, data: { purchaseId: existing.id } };
    }

    const purchase = await db.marketplacePurchase.create({
      data: {
        orgId,
        templateId,
        revisionId: latestRevision.id,
        userId,
        amount: 0,
        status: "COMPLETED",
      },
    });

    await db.marketplaceTemplate.update({
      where: { id: templateId },
      data: { downloadCount: { increment: 1 } },
    });

    revalidatePath("/app/docs/templates/marketplace");
    revalidatePath("/app/docs/templates/my-templates");

    return { success: true, data: { purchaseId: purchase.id } };
  } catch (error) {
    console.error("installFreeTemplate error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to install template",
    };
  }
}

// ─── Create Razorpay order for paid template ──────────────────────────────────

export async function createTemplatePurchaseOrder(
  templateId: string,
): Promise<ActionResult<{ orderId: string; amount: number; currency: string }>> {
  try {
    const { orgId } = await requireOrgContext();

    const template = await db.marketplaceTemplate.findUnique({
      where: { id: templateId },
      include: {
        revisions: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (template.status !== "PUBLISHED") {
      return { success: false, error: "Template is not available for purchase" };
    }

    if (Number(template.price) === 0) {
      return { success: false, error: "This template is free — use install instead" };
    }

    if (!template.revisions[0]) {
      return {
        success: false,
        error: "Template is not ready for purchase until revision backfill completes",
      };
    }

    const existing = await db.marketplacePurchase.findUnique({
      where: {
        orgId_templateId: { orgId, templateId },
      },
    });

    if (existing) {
      return { success: false, error: "Template already purchased" };
    }

    const priceInPaise = Math.round(Number(template.price) * 100);

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: priceInPaise,
      currency: "INR",
      receipt: templateId,
    });

    return {
      success: true,
      data: {
        orderId: order.id,
        amount: priceInPaise,
        currency: "INR",
      },
    };
  } catch (error) {
    console.error("createTemplatePurchaseOrder error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create order",
    };
  }
}

// ─── Verify Razorpay payment and install paid template ────────────────────────

export async function verifyTemplatePurchase(data: {
  templateId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}): Promise<ActionResult<{ purchaseId: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== data.razorpaySignature) {
      return { success: false, error: "Payment verification failed" };
    }

    const template = await db.marketplaceTemplate.findUnique({
      where: { id: data.templateId },
      include: {
        revisions: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (template.status !== "PUBLISHED") {
      return { success: false, error: "Template is not available" };
    }

    const latestRevision = template.revisions[0];
    if (!latestRevision) {
      return {
        success: false,
        error: "Template is not ready for purchase until revision backfill completes",
      };
    }

    const existing = await db.marketplacePurchase.findUnique({
      where: {
        orgId_templateId: { orgId, templateId: data.templateId },
      },
      select: {
        id: true,
        revisionId: true,
      },
    });

    if (existing) {
      if (!existing.revisionId) {
        await db.marketplacePurchase.update({
          where: { id: existing.id },
          data: { revisionId: latestRevision.id },
        });
      }

      return { success: true, data: { purchaseId: existing.id } };
    }

    const amount = Number(template.price);
    const publisherShare = Math.round(amount * 70) / 100;
    const platformShare = Math.round(amount * 30) / 100;

    const purchase = await db.$transaction(async (tx) => {
      const p = await tx.marketplacePurchase.create({
        data: {
          orgId,
          templateId: data.templateId,
          revisionId: latestRevision.id,
          userId,
          amount,
          razorpayPaymentId: data.razorpayPaymentId,
          razorpayOrderId: data.razorpayOrderId,
          status: "COMPLETED",
        },
      });

      await tx.marketplaceRevenue.create({
        data: {
          purchaseId: p.id,
          publisherOrgId: template.publisherOrgId ?? orgId,
          totalAmount: amount,
          publisherShare,
          platformShare,
        },
      });

      await tx.marketplaceTemplate.update({
        where: { id: data.templateId },
        data: { downloadCount: { increment: 1 } },
      });

      return p;
    });

    revalidatePath("/app/docs/templates/marketplace");
    revalidatePath("/app/docs/templates/my-templates");

    return { success: true, data: { purchaseId: purchase.id } };
  } catch (error) {
    console.error("verifyTemplatePurchase error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify purchase",
    };
  }
}

// ─── Submit review ────────────────────────────────────────────────────────────

export async function submitReview(
  templateId: string,
  rating: number,
  review?: string,
): Promise<ActionResult<{ reviewId: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const purchase = await db.marketplacePurchase.findUnique({
      where: {
        orgId_templateId: { orgId, templateId },
      },
    });

    if (!purchase) {
      return {
        success: false,
        error: "You must install this template before reviewing it",
      };
    }

    if (rating < 1 || rating > 5) {
      return { success: false, error: "Rating must be between 1 and 5" };
    }

    const marketplaceReview = await db.marketplaceReview.create({
      data: {
        templateId,
        userId,
        orgId,
        rating,
        review: review ?? null,
      },
    });

    const aggregate = await db.marketplaceReview.aggregate({
      where: { templateId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await db.marketplaceTemplate.update({
      where: { id: templateId },
      data: {
        rating: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count.rating,
      },
    });

    revalidatePath("/app/docs/templates/marketplace");

    return { success: true, data: { reviewId: marketplaceReview.id } };
  } catch (error) {
    console.error("submitReview error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to submit review",
    };
  }
}

// ─── Get installed templates for current org ──────────────────────────────────

export async function getInstalledTemplates(): Promise<ActionResult<InstalledTemplateCard[]>> {
  try {
    const { orgId } = await requireOrgContext();

    const purchases = await db.marketplacePurchase.findMany({
      where: { orgId, status: "COMPLETED" },
      include: {
        revision: {
          select: {
            id: true,
            version: true,
            name: true,
            description: true,
            templateType: true,
            publisherDisplayName: true,
            previewImageUrl: true,
          },
        },
      },
      orderBy: { installedAt: "desc" },
    });

    return { success: true, data: purchases.map(serializeInstalledTemplate) };
  } catch (error) {
    console.error("getInstalledTemplates error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get installed templates",
    };
  }
}

// ─── Publish template to marketplace ──────────────────────────────────────────

export async function publishTemplate(data: {
  name: string;
  description: string;
  templateType: string;
  category: string[];
  tags: string[];
  price: number;
  templateData: Record<string, unknown>;
  previewImageUrl: string;
}): Promise<ActionResult<{ templateId: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const hasFeature = await checkFeature(orgId, "templatePublish");
    if (!hasFeature) {
      return {
        success: false,
        error: "Upgrade to Pro to publish templates to the marketplace",
      };
    }

    const organization = await db.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    const template = await db.marketplaceTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        templateType: data.templateType,
        category: data.category,
        tags: data.tags,
        price: data.price,
        templateData: data.templateData as Prisma.InputJsonValue,
        previewImageUrl: data.previewImageUrl,
        publisherOrgId: orgId,
        publisherName: organization.name,
        status: "PENDING_REVIEW",
        downloadCount: 0,
        rating: 0,
        ratingCount: 0,
      },
    });

    revalidatePath("/app/docs/templates/marketplace");

    return { success: true, data: { templateId: template.id } };
  } catch (error) {
    console.error("publishTemplate error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish template",
    };
  }
}
