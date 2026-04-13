"use server";

import { db } from "@/lib/db";
import { requirePortalSession } from "@/lib/portal-auth";

export async function uploadPortalAttachmentAction(
  fileName: string,
  fileSize: number,
  mimeType: string,
  storageKey: string
) {
  try {
    const { orgId } = await requirePortalSession();

    const attachment = await db.fileAttachment.create({
      data: {
        organizationId: orgId,
        fileName,
        size: fileSize,
        mimeType,
        storageKey,
        entityType: "ticket_reply",
        entityId: "temp", // Temporary until linked to a reply
      },
    });

    return { success: true, id: attachment.id };
  } catch (error) {
    console.error("[portal-attachments] uploadPortalAttachmentAction error:", error);
    return { success: false, error: "Failed to register attachment" };
  }
}
