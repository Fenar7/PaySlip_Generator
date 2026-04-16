"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { SharedDocumentStatus, ShareBundleStatus } from "@/generated/prisma/client";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

// ─── Share link management ────────────────────────────────────────────────────

export interface CreateShareLinkInput {
  docType: "invoice" | "voucher" | "salary_slip";
  docId: string;
  expiresInHours?: number;
  downloadAllowed?: boolean;
  recipientEmail?: string;
  recipientName?: string;
  notes?: string;
}

export interface ShareLinkData {
  id: string;
  shareToken: string;
  shareUrl: string;
  status: SharedDocumentStatus;
  expiresAt: Date | null;
  downloadAllowed: boolean;
  recipientEmail: string | null;
  recipientName: string | null;
  viewCount: number;
  downloadCount: number;
  createdAt: Date;
}

export async function createShareLink(
  input: CreateShareLinkInput
): Promise<ActionResult<ShareLinkData>> {
  const { orgId, userId } = await requireOrgContext();

  const shareToken = nanoid(24);
  const expiresAt = input.expiresInHours
    ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
    : null;

  const doc = await db.sharedDocument.create({
    data: {
      orgId,
      docType: input.docType,
      docId: input.docId,
      shareToken,
      expiresAt,
      downloadAllowed: input.downloadAllowed ?? true,
      recipientEmail: input.recipientEmail ?? null,
      recipientName: input.recipientName ?? null,
      notes: input.notes ?? null,
      createdBy: userId,
    },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "share_link.created",
    entityType: "SharedDocument",
    entityId: doc.id,
    metadata: { docType: input.docType, docId: input.docId, hasExpiry: !!expiresAt },
  });

  await db.shareAccessLog.create({
    data: { orgId, sharedDocumentId: doc.id, event: "VIEWED", recipientEmail: input.recipientEmail ?? null },
  });

  revalidatePath("/app/docs/shares");

  return {
    success: true,
    data: {
      ...doc,
      shareUrl: `${BASE_URL}/share/${input.docType}/${shareToken}`,
    },
  };
}

export async function listShareLinks(): Promise<
  ActionResult<ShareLinkData[]>
> {
  const { orgId } = await requireOrgContext();

  const docs = await db.sharedDocument.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return {
    success: true,
    data: docs.map((d) => ({
      ...d,
      shareUrl: `${BASE_URL}/share/${d.docType}/${d.shareToken}`,
    })),
  };
}

export async function revokeShareLink(
  shareId: string
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const doc = await db.sharedDocument.findFirst({
    where: { id: shareId, orgId },
    select: { id: true, status: true, shareToken: true },
  });

  if (!doc) {
    return { success: false, error: "Share link not found" };
  }

  if (doc.status === "REVOKED") {
    return { success: false, error: "Share link already revoked" };
  }

  await db.sharedDocument.update({
    where: { id: doc.id },
    data: { status: "REVOKED", revokedAt: new Date(), revokedBy: userId },
  });

  await db.shareAccessLog.create({
    data: { orgId, sharedDocumentId: doc.id, event: "REVOKED" },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "share_link.revoked",
    entityType: "SharedDocument",
    entityId: doc.id,
    metadata: {},
  });

  revalidatePath("/app/docs/shares");
  return { success: true, data: undefined };
}

export async function getShareDetail(
  shareId: string
): Promise<ActionResult<ShareLinkData & { accessLogs: Array<{ event: string; createdAt: Date; ip: string | null }> }>> {
  const { orgId } = await requireOrgContext();

  const doc = await db.sharedDocument.findFirst({
    where: { id: shareId, orgId },
    include: {
      accessLogs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { event: true, createdAt: true, ip: true },
      },
    },
  });

  if (!doc) {
    return { success: false, error: "Share link not found" };
  }

  return {
    success: true,
    data: {
      ...doc,
      shareUrl: `${BASE_URL}/share/${doc.docType}/${doc.shareToken}`,
    },
  };
}

// ─── Bundle management ────────────────────────────────────────────────────────

export interface CreateBundleInput {
  title: string;
  description?: string;
  expiresInHours?: number;
  downloadAllowed?: boolean;
  recipientEmail?: string;
  recipientName?: string;
  notes?: string;
  shareIds: string[];
}

export interface BundleData {
  id: string;
  token: string;
  bundleUrl: string;
  title: string;
  description: string | null;
  status: ShareBundleStatus;
  expiresAt: Date | null;
  downloadAllowed: boolean;
  recipientEmail: string | null;
  recipientName: string | null;
  viewCount: number;
  createdAt: Date;
  itemCount: number;
}

export async function createBundle(
  input: CreateBundleInput
): Promise<ActionResult<BundleData>> {
  const { orgId, userId } = await requireOrgContext();

  if (input.shareIds.length === 0) {
    return { success: false, error: "At least one share link is required" };
  }

  // Verify all share IDs belong to this org and are ACTIVE
  const shares = await db.sharedDocument.findMany({
    where: { id: { in: input.shareIds }, orgId, status: "ACTIVE" },
    select: { id: true },
  });

  if (shares.length !== input.shareIds.length) {
    return { success: false, error: "One or more share links are invalid or not active" };
  }

  const token = nanoid(32);
  const expiresAt = input.expiresInHours
    ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
    : null;

  const bundle = await db.shareBundle.create({
    data: {
      orgId,
      token,
      title: input.title,
      description: input.description ?? null,
      expiresAt,
      downloadAllowed: input.downloadAllowed ?? true,
      recipientEmail: input.recipientEmail ?? null,
      recipientName: input.recipientName ?? null,
      notes: input.notes ?? null,
      createdBy: userId,
      items: {
        create: shares.map((s, i) => ({
          sharedDocumentId: s.id,
          sortOrder: i,
        })),
      },
    },
    include: { _count: { select: { items: true } } },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "share_bundle.created",
    entityType: "ShareBundle",
    entityId: bundle.id,
    metadata: { title: input.title, itemCount: shares.length },
  });

  revalidatePath("/app/docs/shares");

  return {
    success: true,
    data: {
      id: bundle.id,
      token: bundle.token,
      bundleUrl: `${BASE_URL}/share/bundle/${token}`,
      title: bundle.title,
      description: bundle.description,
      status: bundle.status,
      expiresAt: bundle.expiresAt,
      downloadAllowed: bundle.downloadAllowed,
      recipientEmail: bundle.recipientEmail,
      recipientName: bundle.recipientName,
      viewCount: bundle.viewCount,
      createdAt: bundle.createdAt,
      itemCount: bundle._count.items,
    },
  };
}

export async function listBundles(): Promise<ActionResult<BundleData[]>> {
  const { orgId } = await requireOrgContext();

  const bundles = await db.shareBundle.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { items: true } } },
  });

  return {
    success: true,
    data: bundles.map((b) => ({
      id: b.id,
      token: b.token,
      bundleUrl: `${BASE_URL}/share/bundle/${b.token}`,
      title: b.title,
      description: b.description,
      status: b.status,
      expiresAt: b.expiresAt,
      downloadAllowed: b.downloadAllowed,
      recipientEmail: b.recipientEmail,
      recipientName: b.recipientName,
      viewCount: b.viewCount,
      createdAt: b.createdAt,
      itemCount: b._count.items,
    })),
  };
}

export async function revokeBundle(
  bundleId: string
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const bundle = await db.shareBundle.findFirst({
    where: { id: bundleId, orgId },
    select: { id: true, status: true },
  });

  if (!bundle) {
    return { success: false, error: "Bundle not found" };
  }

  if (bundle.status === "REVOKED") {
    return { success: false, error: "Bundle already revoked" };
  }

  await db.shareBundle.update({
    where: { id: bundle.id },
    data: { status: "REVOKED", revokedAt: new Date(), revokedBy: userId },
  });

  await db.shareAccessLog.create({
    data: { orgId, bundleId: bundle.id, event: "REVOKED" },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "share_bundle.revoked",
    entityType: "ShareBundle",
    entityId: bundle.id,
    metadata: {},
  });

  revalidatePath("/app/docs/shares");
  return { success: true, data: undefined };
}
