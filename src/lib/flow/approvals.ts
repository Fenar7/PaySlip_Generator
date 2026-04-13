import { db } from "@/lib/db";
import { notifyOrgAdmins } from "@/lib/notifications";

export async function createApprovalRequest(params: {
  docType: string;
  docId: string;
  orgId: string;
  requestedById: string;
  requestedByName: string;
  docNumber: string;
}) {
  const approval = await db.approvalRequest.create({
    data: {
      docType: params.docType,
      docId: params.docId,
      orgId: params.orgId,
      requestedById: params.requestedById,
      requestedByName: params.requestedByName,
      status: "PENDING",
    },
  });

  // Notify org admins/owners
  await notifyOrgAdmins({
    orgId: params.orgId,
    type: "approval_requested",
    title: "Approval Requested",
    body: `${params.requestedByName} requested approval for ${params.docType} ${params.docNumber}`,
    link: `/app/flow/approvals/${approval.id}`,
    excludeUserId: params.requestedById === "system" ? undefined : params.requestedById,
  });

  return approval;
}
