import type {
  ApprovalRequest,
  ApprovalStatus,
  FileAttachment,
} from "@/generated/prisma/client";
import { db } from "@/lib/db";

type SortDirection = "asc" | "desc";
type PolymorphicReadClient = Pick<typeof db, "approvalRequest" | "fileAttachment">;

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

function groupByKey<T>(rows: T[], getKey: (row: T) => string) {
  return rows.reduce<Map<string, T[]>>((acc, row) => {
    const key = getKey(row);
    const existing = acc.get(key);

    if (existing) {
      existing.push(row);
    } else {
      acc.set(key, [row]);
    }

    return acc;
  }, new Map());
}

export async function listAttachmentsByEntityIds(params: {
  client?: PolymorphicReadClient;
  orgId: string;
  entityType: string;
  entityIds: string[];
  sortDirection?: SortDirection;
}) {
  const client = params.client ?? db;
  const entityIds = uniqueIds(params.entityIds);

  if (entityIds.length === 0) {
    return new Map<string, FileAttachment[]>();
  }

  const attachments = await client.fileAttachment.findMany({
    where: {
      organizationId: params.orgId,
      entityType: params.entityType,
      entityId: { in: entityIds },
    },
    orderBy: [{ entityId: "asc" }, { createdAt: params.sortDirection ?? "asc" }],
  });

  return groupByKey(attachments, (attachment) => attachment.entityId);
}

export async function listApprovalRequestsByDocIds(params: {
  client?: PolymorphicReadClient;
  orgId: string;
  docType: string;
  docIds: string[];
  status?: ApprovalStatus;
  sortDirection?: SortDirection;
}) {
  const client = params.client ?? db;
  const docIds = uniqueIds(params.docIds);

  if (docIds.length === 0) {
    return new Map<string, ApprovalRequest[]>();
  }

  const approvals = await client.approvalRequest.findMany({
    where: {
      orgId: params.orgId,
      docType: params.docType,
      docId: { in: docIds },
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: [{ docId: "asc" }, { createdAt: params.sortDirection ?? "desc" }],
  });

  return groupByKey(approvals, (approval) => approval.docId);
}
