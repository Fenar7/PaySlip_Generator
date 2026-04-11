"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { postVoucherTx } from "@/lib/accounting";
import { createNotification, notifyOrgAdmins } from "@/lib/notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const VALID_DOC_TYPES = ["invoice", "voucher", "salary-slip"] as const;
type DocType = (typeof VALID_DOC_TYPES)[number];

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docTypeToLabel(docType: string): string {
  switch (docType) {
    case "invoice":
      return "Invoice";
    case "voucher":
      return "Voucher";
    case "salary-slip":
      return "Salary Slip";
    default:
      return docType;
  }
}

interface ApprovalDocumentSummary {
  number: string;
  entityName: string | null;
  amount: number;
  date: string;
  month?: number;
  year?: number;
}

async function getDocNumber(docType: string, docId: string): Promise<string> {
  switch (docType) {
    case "invoice": {
      const inv = await db.invoice.findUnique({
        where: { id: docId },
        select: { invoiceNumber: true },
      });
      return inv?.invoiceNumber ?? docId;
    }
    case "voucher": {
      const v = await db.voucher.findUnique({
        where: { id: docId },
        select: { voucherNumber: true },
      });
      return v?.voucherNumber ?? docId;
    }
    case "salary-slip": {
      const s = await db.salarySlip.findUnique({
        where: { id: docId },
        select: { slipNumber: true },
      });
      return s?.slipNumber ?? docId;
    }
    default:
      return docId;
  }
}

async function getApprovalDocumentSummaries(
  approvals: Array<{ docType: string; docId: string }>
): Promise<Map<string, ApprovalDocumentSummary>> {
  const invoiceIds = approvals
    .filter((approval) => approval.docType === "invoice")
    .map((approval) => approval.docId);
  const voucherIds = approvals
    .filter((approval) => approval.docType === "voucher")
    .map((approval) => approval.docId);
  const salarySlipIds = approvals
    .filter((approval) => approval.docType === "salary-slip")
    .map((approval) => approval.docId);

  const [invoices, vouchers, salarySlips] = await Promise.all([
    invoiceIds.length > 0
      ? db.invoice.findMany({
          where: { id: { in: invoiceIds } },
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            invoiceDate: true,
            customer: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    voucherIds.length > 0
      ? db.voucher.findMany({
          where: { id: { in: voucherIds } },
          select: {
            id: true,
            voucherNumber: true,
            totalAmount: true,
            voucherDate: true,
            vendor: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    salarySlipIds.length > 0
      ? db.salarySlip.findMany({
          where: { id: { in: salarySlipIds } },
          select: {
            id: true,
            slipNumber: true,
            netPay: true,
            month: true,
            year: true,
            employee: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const documents = new Map<string, ApprovalDocumentSummary>();

  for (const invoice of invoices) {
    documents.set(`invoice:${invoice.id}`, {
      number: invoice.invoiceNumber,
      entityName: invoice.customer?.name ?? null,
      amount: invoice.totalAmount,
      date: invoice.invoiceDate,
    });
  }

  for (const voucher of vouchers) {
    documents.set(`voucher:${voucher.id}`, {
      number: voucher.voucherNumber,
      entityName: voucher.vendor?.name ?? null,
      amount: voucher.totalAmount,
      date: voucher.voucherDate,
    });
  }

  for (const salarySlip of salarySlips) {
    documents.set(`salary-slip:${salarySlip.id}`, {
      number: salarySlip.slipNumber,
      entityName: salarySlip.employee?.name ?? null,
      amount: salarySlip.netPay,
      date: `${salarySlip.month}/${salarySlip.year}`,
      month: salarySlip.month,
      year: salarySlip.year,
    });
  }

  return documents;
}

// ─── Request Approval ─────────────────────────────────────────────────────────

export async function requestApproval(
  docType: string,
  docId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    if (!VALID_DOC_TYPES.includes(docType as DocType)) {
      return { success: false, error: "Invalid document type" };
    }

    // Verify the document exists and belongs to the org
    let docExists = false;
    switch (docType) {
      case "invoice":
        docExists = !!(await db.invoice.findFirst({
          where: { id: docId, organizationId: orgId },
          select: { id: true },
        }));
        break;
      case "voucher":
        docExists = !!(await db.voucher.findFirst({
          where: { id: docId, organizationId: orgId },
          select: { id: true },
        }));
        break;
      case "salary-slip":
        docExists = !!(await db.salarySlip.findFirst({
          where: { id: docId, organizationId: orgId },
          select: { id: true },
        }));
        break;
    }

    if (!docExists) {
      return { success: false, error: "Document not found" };
    }

    // Get requester name from Profile
    const profile = await db.profile.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const requesterName = profile?.name ?? "Unknown User";
    const docNumber = await getDocNumber(docType, docId);

    const approval = await db.approvalRequest.create({
      data: {
        docType,
        docId,
        orgId,
        requestedById: userId,
        requestedByName: requesterName,
        status: "PENDING",
      },
    });

    // Notify org admins/owners
    await notifyOrgAdmins({
      orgId,
      type: "approval_requested",
      title: "Approval Requested",
      body: `${requesterName} requested approval for ${docTypeToLabel(docType)} ${docNumber}`,
      link: `/app/flow/approvals/${approval.id}`,
      excludeUserId: userId,
    });

    revalidatePath("/app/flow/approvals");
    return { success: true, data: { id: approval.id } };
  } catch (error) {
    console.error("requestApproval error:", error);
    return { success: false, error: "Failed to request approval" };
  }
}

// ─── List Approvals ───────────────────────────────────────────────────────────

export interface ApprovalListResult {
  approvals: Array<{
    id: string;
    docType: string;
    docId: string;
    docNumber: string;
    requestedByName: string | null;
    status: string;
    createdAt: Date;
    decidedAt: Date | null;
    approverName: string | null;
  }>;
  total: number;
  counts: { all: number; pending: number; approved: number; rejected: number };
}

export async function listApprovals(
  params?: { status?: string; page?: number }
): Promise<ActionResult<ApprovalListResult>> {
  try {
    const { orgId } = await requireOrgContext();
    const page = params?.page ?? 0;

    const statusFilter =
      params?.status && ["PENDING", "APPROVED", "REJECTED"].includes(params.status)
        ? { status: params.status as "PENDING" | "APPROVED" | "REJECTED" }
        : {};

    const where = { orgId, ...statusFilter };

    const [approvals, total, pending, approved, rejected] = await Promise.all([
      db.approvalRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: page * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.approvalRequest.count({ where }),
      db.approvalRequest.count({ where: { orgId, status: "PENDING" } }),
      db.approvalRequest.count({ where: { orgId, status: "APPROVED" } }),
      db.approvalRequest.count({ where: { orgId, status: "REJECTED" } }),
    ]);

    const documents = await getApprovalDocumentSummaries(approvals);

    const mapped = approvals.map((a) => {
      const document = documents.get(`${a.docType}:${a.docId}`);
      const docNumber = document?.number ?? a.docId.slice(0, 8);

      return {
        id: a.id,
        docType: a.docType,
        docId: a.docId,
        docNumber,
        requestedByName: a.requestedByName,
        status: a.status,
        createdAt: a.createdAt,
        decidedAt: a.decidedAt,
        approverName: a.approverName,
      };
    });

    return {
      success: true,
      data: {
        approvals: mapped,
        total,
        counts: {
          all: pending + approved + rejected,
          pending,
          approved,
          rejected,
        },
      },
    };
  } catch (error) {
    console.error("listApprovals error:", error);
    return { success: false, error: "Failed to list approvals" };
  }
}

// ─── Get Approval Detail ──────────────────────────────────────────────────────

export interface ApprovalDetail {
  id: string;
  docType: string;
  docId: string;
  orgId: string;
  requestedById: string;
  requestedByName: string | null;
  approverId: string | null;
  approverName: string | null;
  status: string;
  note: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  document: {
    number: string;
    entityName: string | null;
    amount: number;
    date: string;
    month?: number;
    year?: number;
  } | null;
}

export async function getApprovalDetail(
  requestId: string
): Promise<ActionResult<ApprovalDetail>> {
  try {
    const { orgId } = await requireOrgContext();

    const approval = await db.approvalRequest.findFirst({
      where: { id: requestId, orgId },
    });

    if (!approval) {
      return { success: false, error: "Approval request not found" };
    }

    const documents = await getApprovalDocumentSummaries([approval]);
    const document = documents.get(`${approval.docType}:${approval.docId}`) ?? null;

    return {
      success: true,
      data: {
        id: approval.id,
        docType: approval.docType,
        docId: approval.docId,
        orgId: approval.orgId,
        requestedById: approval.requestedById,
        requestedByName: approval.requestedByName,
        approverId: approval.approverId,
        approverName: approval.approverName,
        status: approval.status,
        note: approval.note,
        createdAt: approval.createdAt,
        decidedAt: approval.decidedAt,
        document,
      },
    };
  } catch (error) {
    console.error("getApprovalDetail error:", error);
    return { success: false, error: "Failed to get approval details" };
  }
}

// ─── Approve Request ──────────────────────────────────────────────────────────

export async function approveRequest(
  requestId: string,
  note?: string
): Promise<ActionResult<undefined>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const approval = await db.approvalRequest.findFirst({
      where: { id: requestId, orgId, status: "PENDING" },
    });

    if (!approval) {
      return { success: false, error: "Approval request not found or already decided" };
    }

    if (approval.requestedById === userId) {
      return { success: false, error: "You cannot approve your own request" };
    }

    const profile = await db.profile.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const approverName = profile?.name ?? "Unknown User";

    await db.$transaction(async (tx) => {
      await tx.approvalRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          approverId: userId,
          approverName,
          decidedAt: new Date(),
          note: note ?? null,
        },
      });

      if (approval.docType === "voucher") {
        await tx.voucher.update({
          where: { id: approval.docId },
          data: { status: "approved" },
        });

        await postVoucherTx(tx, {
          orgId,
          voucherId: approval.docId,
          actorId: userId,
        });
      } else if (approval.docType === "salary-slip") {
        await tx.salarySlip.update({
          where: { id: approval.docId },
          data: { status: "approved" },
        });
      }
    });

    const docNumber = await getDocNumber(approval.docType, approval.docId);

    // Notify requester
    await createNotification({
      userId: approval.requestedById,
      orgId,
      type: "approval_approved",
      title: "Approval Granted",
      body: `${approverName} approved your ${docTypeToLabel(approval.docType)} ${docNumber}`,
      link: `/app/flow/approvals/${requestId}`,
    });

    revalidatePath("/app/flow/approvals");
    revalidatePath(`/app/flow/approvals/${requestId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("approveRequest error:", error);
    return { success: false, error: "Failed to approve request" };
  }
}

// ─── Reject Request ───────────────────────────────────────────────────────────

export async function rejectRequest(
  requestId: string,
  note: string
): Promise<ActionResult<undefined>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    if (!note || note.trim().length === 0) {
      return { success: false, error: "Rejection reason is required" };
    }

    const approval = await db.approvalRequest.findFirst({
      where: { id: requestId, orgId, status: "PENDING" },
    });

    if (!approval) {
      return { success: false, error: "Approval request not found or already decided" };
    }

    if (approval.requestedById === userId) {
      return { success: false, error: "You cannot reject your own request" };
    }

    const profile = await db.profile.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const approverName = profile?.name ?? "Unknown User";

    await db.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        approverId: userId,
        approverName,
        decidedAt: new Date(),
        note: note.trim(),
      },
    });

    const docNumber = await getDocNumber(approval.docType, approval.docId);

    // Notify requester
    await createNotification({
      userId: approval.requestedById,
      orgId,
      type: "approval_rejected",
      title: "Approval Rejected",
      body: `${approverName} rejected your ${docTypeToLabel(approval.docType)} ${docNumber}: "${note.trim()}"`,
      link: `/app/flow/approvals/${requestId}`,
    });

    revalidatePath("/app/flow/approvals");
    revalidatePath(`/app/flow/approvals/${requestId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("rejectRequest error:", error);
    return { success: false, error: "Failed to reject request" };
  }
}
