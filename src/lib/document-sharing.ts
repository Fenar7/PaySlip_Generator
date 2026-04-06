import "server-only";

import { db } from "@/lib/db";
import { nanoid } from "nanoid";

export async function createShareLink(params: {
  orgId: string;
  docType: "invoice" | "voucher" | "salary_slip";
  docId: string;
  createdBy: string;
  expiresInHours?: number;
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

  // Check expiry
  if (shared.expiresAt && shared.expiresAt < new Date()) {
    return null;
  }

  // Increment view count
  await db.sharedDocument.update({
    where: { id: shared.id },
    data: { viewCount: { increment: 1 } },
  });

  return shared;
}

export async function revokeShareLink(
  shareToken: string,
  orgId: string,
): Promise<boolean> {
  try {
    await db.sharedDocument.deleteMany({
      where: { shareToken, orgId },
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
