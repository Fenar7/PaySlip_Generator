"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { SopDocumentStatus, Prisma } from "@/generated/prisma/client";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

async function uniqueSlug(orgId: string, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let i = 1;
  while (true) {
    const existing = await db.sopDocument.findUnique({ where: { orgId_slug: { orgId, slug } } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${baseSlug}-${i++}`;
  }
}

// ─── List SOPs ────────────────────────────────────────────────────────────────

export async function listSopDocuments(filters?: {
  category?: string;
  status?: SopDocumentStatus;
  search?: string;
}) {
  const { orgId, userId, role } = await requireOrgContext();
  const isEditor = role === "admin" || role === "co_owner";

  const where: Prisma.SopDocumentWhereInput = {
    orgId,
    ...(filters?.category ? { category: filters.category } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    // Non-editors only see published SOPs + their own drafts
    ...(!isEditor
      ? {
          OR: [
            { status: SopDocumentStatus.PUBLISHED },
            { createdByUserId: userId, status: SopDocumentStatus.DRAFT },
          ],
        }
      : { archivedAt: null }),
    ...(filters?.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { content: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return db.sopDocument.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      excerpt: true,
      status: true,
      isPinned: true,
      sortOrder: true,
      publishedAt: true,
      createdByUserId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ─── Get SOP ──────────────────────────────────────────────────────────────────

export async function getSopDocument(idOrSlug: string) {
  const { orgId, userId, role } = await requireOrgContext();
  const isEditor = role === "admin" || role === "co_owner";

  const sop = await db.sopDocument.findFirst({
    where: {
      orgId,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
  });

  if (!sop) return null;
  if (sop.archivedAt && !isEditor) return null;
  if (sop.status === SopDocumentStatus.DRAFT && sop.createdByUserId !== userId && !isEditor) return null;

  return sop;
}

// ─── Create SOP ───────────────────────────────────────────────────────────────

export async function createSopDocument(data: {
  title: string;
  content: string;
  category?: string;
  excerpt?: string;
  isPinned?: boolean;
}): Promise<ActionResult<{ id: string; slug: string }>> {
  const { orgId, userId } = await requireRole("admin");

  const baseSlug = generateSlug(data.title);
  const slug = await uniqueSlug(orgId, baseSlug);

  const sop = await db.sopDocument.create({
    data: {
      orgId,
      title: data.title,
      slug,
      content: data.content,
      category: data.category,
      excerpt: data.excerpt ?? data.content.slice(0, 200),
      isPinned: data.isPinned ?? false,
      status: SopDocumentStatus.DRAFT,
      createdByUserId: userId,
    },
  });

  return { success: true, data: { id: sop.id, slug: sop.slug } };
}

// ─── Update SOP ───────────────────────────────────────────────────────────────

export async function updateSopDocument(
  id: string,
  data: {
    title?: string;
    content?: string;
    category?: string;
    excerpt?: string;
    isPinned?: boolean;
    sortOrder?: number;
  }
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const sop = await db.sopDocument.findUnique({ where: { id } });
  if (!sop || sop.orgId !== orgId) {
    return { success: false, error: "SOP not found." };
  }

  let newSlug: string | undefined;
  if (data.title && data.title !== sop.title) {
    const base = generateSlug(data.title);
    newSlug = await uniqueSlug(orgId, base, id);
  }

  await db.sopDocument.update({
    where: { id },
    data: {
      ...data,
      ...(newSlug ? { slug: newSlug } : {}),
      lastEditedByUserId: userId,
    },
  });

  return { success: true, data: undefined };
}

// ─── Publish SOP ──────────────────────────────────────────────────────────────

export async function publishSopDocument(id: string): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const sop = await db.sopDocument.findUnique({ where: { id } });
  if (!sop || sop.orgId !== orgId) {
    return { success: false, error: "SOP not found." };
  }
  if (!sop.content || sop.content.trim().length < 10) {
    return { success: false, error: "SOP must have content before publishing." };
  }

  await db.sopDocument.update({
    where: { id },
    data: {
      status: SopDocumentStatus.PUBLISHED,
      publishedAt: new Date(),
      publishedByUserId: userId,
    },
  });

  return { success: true, data: undefined };
}

// ─── Archive SOP ──────────────────────────────────────────────────────────────

export async function archiveSopDocument(id: string): Promise<ActionResult<void>> {
  const { orgId } = await requireRole("admin");

  const sop = await db.sopDocument.findUnique({ where: { id } });
  if (!sop || sop.orgId !== orgId) {
    return { success: false, error: "SOP not found." };
  }

  await db.sopDocument.update({
    where: { id },
    data: { status: SopDocumentStatus.ARCHIVED, archivedAt: new Date() },
  });

  return { success: true, data: undefined };
}

// ─── Delete SOP ───────────────────────────────────────────────────────────────

export async function deleteSopDocument(id: string): Promise<ActionResult<void>> {
  const { orgId } = await requireRole("admin");

  const sop = await db.sopDocument.findUnique({ where: { id } });
  if (!sop || sop.orgId !== orgId) {
    return { success: false, error: "SOP not found." };
  }

  await db.sopDocument.delete({ where: { id } });
  return { success: true, data: undefined };
}

// ─── List SOP Categories ──────────────────────────────────────────────────────

export async function listSopCategories(): Promise<string[]> {
  const { orgId } = await requireOrgContext();

  const result = await db.sopDocument.findMany({
    where: { orgId, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return result.map((r) => r.category!).filter(Boolean);
}
