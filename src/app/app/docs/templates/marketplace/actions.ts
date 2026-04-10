"use server";

import crypto from "crypto";
import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { revalidatePath } from "next/cache";
import Razorpay from "razorpay";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Browse marketplace templates ─────────────────────────────────────────────

export async function browseTemplates(filters?: {
  category?: string;
  templateType?: string;
  search?: string;
  priceFilter?: "free" | "paid" | "all";
  sort?: "popular" | "newest" | "top-rated";
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ templates: Record<string, unknown>[]; total: number }>> {
  try {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 12;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { status: "PUBLISHED" };

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

    let orderBy: Record<string, string> = { createdAt: "desc" };
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
      }),
      db.marketplaceTemplate.count({ where }),
    ]);

    return { success: true, data: { templates, total } };
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
  templateId: string
): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const template = await db.marketplaceTemplate.findUnique({
      where: { id: templateId },
      include: { reviews: true },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    return { success: true, data: template };
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
  templateId: string
): Promise<ActionResult<{ purchaseId: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const template = await db.marketplaceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (template.status !== "PUBLISHED") {
      return { success: false, error: "Template is not available for installation" };
    }

    if (template.price !== 0) {
      return { success: false, error: "This template requires payment" };
    }

    // Idempotent: return existing purchase if already installed
    const existing = await db.marketplacePurchase.findUnique({
      where: {
        organizationId_templateId: {
          organizationId: orgId,
          templateId,
        },
      },
    });

    if (existing) {
      return { success: true, data: { purchaseId: existing.id } };
    }

    const purchase = await db.marketplacePurchase.create({
      data: {
        organizationId: orgId,
        templateId,
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
  templateId: string
): Promise<ActionResult<{ orderId: string; amount: number; currency: string }>> {
  try {
    const { orgId } = await requireOrgContext();

    const template = await db.marketplaceTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (template.status !== "PUBLISHED") {
      return { success: false, error: "Template is not available for purchase" };
    }

    if (template.price === 0) {
      return { success: false, error: "This template is free — use install instead" };
    }

    // Idempotent: return existing purchase if already installed
    const existing = await db.marketplacePurchase.findUnique({
      where: {
        organizationId_templateId: {
          organizationId: orgId,
          templateId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Template already purchased" };
    }

    const priceInPaise = Math.round(template.price * 100);

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

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== data.razorpaySignature) {
      return { success: false, error: "Payment verification failed" };
    }

    const template = await db.marketplaceTemplate.findUnique({
      where: { id: data.templateId },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    if (template.status !== "PUBLISHED") {
      return { success: false, error: "Template is not available" };
    }

    // Idempotent: return existing purchase if already installed
    const existing = await db.marketplacePurchase.findUnique({
      where: {
        organizationId_templateId: {
          organizationId: orgId,
          templateId: data.templateId,
        },
      },
    });

    if (existing) {
      return { success: true, data: { purchaseId: existing.id } };
    }

    const amount = template.price;
    const publisherShare = Math.round(amount * 70) / 100;
    const platformShare = Math.round(amount * 30) / 100;

    const purchase = await db.$transaction(async (tx) => {
      const p = await tx.marketplacePurchase.create({
        data: {
          organizationId: orgId,
          templateId: data.templateId,
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
          templateId: data.templateId,
          publisherId: template.publisherId,
          amount,
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
  review?: string
): Promise<ActionResult<{ reviewId: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    // Verify the org has purchased this template
    const purchase = await db.marketplacePurchase.findUnique({
      where: {
        organizationId_templateId: {
          organizationId: orgId,
          templateId,
        },
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
        organizationId: orgId,
        rating,
        review: review ?? null,
      },
    });

    // Update average rating on the template
    const aggregate = await db.marketplaceReview.aggregate({
      where: { templateId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await db.marketplaceTemplate.update({
      where: { id: templateId },
      data: {
        rating: aggregate._avg.rating ?? 0,
        reviewCount: aggregate._count.rating,
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

export async function getInstalledTemplates(): Promise<ActionResult<Record<string, unknown>[]>> {
  try {
    const { orgId } = await requireOrgContext();

    const purchases = await db.marketplacePurchase.findMany({
      where: { organizationId: orgId, status: "COMPLETED" },
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: purchases };
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
    const { orgId, userId } = await requireRole("admin");

    const hasFeature = await checkFeature(orgId, "templateMarketplace");
    if (!hasFeature) {
      return {
        success: false,
        error: "Upgrade to Pro to publish templates to the marketplace",
      };
    }

    const template = await db.marketplaceTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        templateType: data.templateType,
        category: data.category,
        tags: data.tags,
        price: data.price,
        templateData: data.templateData,
        previewImageUrl: data.previewImageUrl,
        publisherId: orgId,
        publisherUserId: userId,
        status: "PENDING_REVIEW",
        downloadCount: 0,
        rating: 0,
        reviewCount: 0,
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
