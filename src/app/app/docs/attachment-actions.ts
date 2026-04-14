"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { isUploadedFile } from "@/lib/server/form-data";
import { getSignedUrlServer, uploadFileServer, deleteFileServer } from "@/lib/storage/upload-server";

// Using native strings for doc types
export type DocType = "invoice" | "voucher" | "salary_slip" | "quote";

type ActionResult<T = null> = { success: true; data: T } | { success: false; error: string };

function sanitizeStorageSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";
}

function generateAttachmentStoragePath(orgId: string, docType: string, docId: string, fileName: string): string {
  const safeName = sanitizeStorageSegment(fileName);
  return `docs/${docType}/${orgId}/${docId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}

async function verifyDocOwnership(orgId: string, docType: DocType, docId: string) {
  let found = false;
  switch (docType) {
    case "invoice":
      found = !!(await db.invoice.findFirst({ where: { id: docId, organizationId: orgId } }));
      break;
    case "voucher":
      found = !!(await db.voucher.findFirst({ where: { id: docId, organizationId: orgId } }));
      break;
    case "salary_slip":
      found = !!(await db.salarySlip.findFirst({ where: { id: docId, organizationId: orgId } }));
      break;
    case "quote":
      found = !!(await db.quote.findFirst({ where: { id: docId, orgId: orgId } }));
      break;
  }
  if (!found) throw new Error("Document not found or access denied.");
}

function revalidateDocPath(docType: DocType, docId: string) {
  const basePath = docType === "salary_slip" ? "salary-slips" : `${docType}s`;
  revalidatePath(`/app/docs/${basePath}/${docId}`);
}

export async function uploadDocAttachment(
  formData: FormData
): Promise<ActionResult<{ id: string; fileName: string }>> {
  try {
    const { orgId } = await requireOrgContext();
    const docId = String(formData.get("docId") ?? "").trim();
    const docType = String(formData.get("docType") ?? "").trim() as DocType;
    const file = formData.get("file");

    if (!docId || !docType) return { success: false, error: "Document ID and type are required." };
    if (!["invoice", "voucher", "salary_slip", "quote"].includes(docType)) {
      return { success: false, error: "Invalid document type." };
    }
    if (!isUploadedFile(file)) return { success: false, error: "Attachment file is required." };

    await verifyDocOwnership(orgId, docType, docId);

    const uploaded = await uploadFileServer(
      "attachments",
      generateAttachmentStoragePath(orgId, docType, docId, file.name),
      Buffer.from(await file.arrayBuffer()),
      file.type || "application/octet-stream"
    );

    const attachment = await db.fileAttachment.create({
      data: {
        organizationId: orgId,
        entityType: docType,
        entityId: docId,
        fileName: file.name,
        storageKey: uploaded.storageKey,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      },
    });

    revalidateDocPath(docType, docId);

    return { success: true, data: { id: attachment.id, fileName: file.name } };
  } catch (error) {
    console.error("uploadDocAttachment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload attachment." };
  }
}

export async function deleteDocAttachment(
  attachmentId: string,
  docType: DocType
): Promise<ActionResult> {
  try {
    const { orgId } = await requireOrgContext();
    const attachment = await db.fileAttachment.findFirst({
      where: { id: attachmentId, organizationId: orgId, entityType: docType },
    });

    if (!attachment) return { success: false, error: "Attachment not found." };

    await verifyDocOwnership(orgId, docType, attachment.entityId);

    await deleteFileServer("attachments", attachment.storageKey);
    await db.fileAttachment.delete({ where: { id: attachment.id } });

    revalidateDocPath(docType, attachment.entityId);

    return { success: true, data: null };
  } catch (error) {
    console.error("deleteDocAttachment error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete attachment." };
  }
}

export async function getDocAttachmentUrl(attachmentId: string): Promise<ActionResult<{ url: string }>> {
  try {
    const { orgId } = await requireOrgContext();
    const attachment = await db.fileAttachment.findFirst({
      where: { id: attachmentId, organizationId: orgId },
    });

    if (!attachment) return { success: false, error: "Attachment not found." };

    const url = await getSignedUrlServer("attachments", attachment.storageKey, 3600);
    return { success: true, data: { url } };
  } catch (error) {
    console.error("getDocAttachmentUrl error:", error);
    return { success: false, error: "Failed to generate download link." };
  }
}

export async function getDocAttachments(docId: string, docType: DocType) {
  const { orgId } = await requireOrgContext();
  return db.fileAttachment.findMany({
    where: { organizationId: orgId, entityType: docType, entityId: docId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
  });
}
