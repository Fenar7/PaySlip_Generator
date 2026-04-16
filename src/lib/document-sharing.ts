import "server-only";

import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { headers } from "next/headers";

export async function createShareLink(params: {
  orgId: string;
  docType: "invoice" | "voucher" | "salary_slip";
  docId: string;
  createdBy: string;
  expiresInHours?: number;
  downloadAllowed?: boolean;
  recipientEmail?: string;
  recipientName?: string;
}): Promise<{ shareToken: string; shareUrl: string }> {
  const shareToken = nanoid(24);
  const expiresAt = params.expiresInHours
    ? new Date(Date.now() + params.expiresInHours * 60 * 60 * 1000)
    : null;

  await db.sharedDocument.create({
    data: {
      orgId: params.orgId,
      docType: params.docType,
      docId: params.docId,
      shareToken,
      expiresAt,
      downloadAllowed: params.downloadAllowed ?? true,
      recipientEmail: params.recipientEmail ?? null,
      recipientName: params.recipientName ?? null,
      createdBy: params.createdBy,
    },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  return {
    shareToken,
    shareUrl: `${baseUrl}/share/${params.docType}/${shareToken}`,
  };
}

export async function getSharedDocument(shareToken: string) {
  const shared = await db.sharedDocument.findUnique({
    where: { shareToken },
  });

  if (!shared) return null;

  // Reject on any non-ACTIVE status
  if (shared.status !== "ACTIVE") {
    return null;
  }

  // Check expiry — also mark as EXPIRED in DB so status is consistent
  if (shared.expiresAt && shared.expiresAt < new Date()) {
    await db.sharedDocument.update({
      where: { id: shared.id },
      data: { status: "EXPIRED" },
    });
    return null;
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? null;
  const ua = hdrs.get("user-agent") ?? null;

  await Promise.all([
    db.sharedDocument.update({
      where: { id: shared.id },
      data: { viewCount: { increment: 1 } },
    }),
    db.shareAccessLog.create({
      data: { orgId: shared.orgId, sharedDocumentId: shared.id, event: "VIEWED", ip, userAgent: ua },
    }),
  ]);

  return shared;
}

export async function revokeShareLink(
  shareToken: string,
  orgId: string,
): Promise<boolean> {
  try {
    const doc = await db.sharedDocument.findFirst({
      where: { shareToken, orgId },
      select: { id: true },
    });
    if (!doc) return false;

    await db.sharedDocument.update({
      where: { id: doc.id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    await db.shareAccessLog.create({
      data: { orgId, sharedDocumentId: doc.id, event: "REVOKED" },
    });

    return true;
  } catch {
    return false;
  }
}

export async function getOrgSharedDocuments(orgId: string) {
  return db.sharedDocument.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
}

