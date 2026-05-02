"use server";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { nextDocumentNumberTx } from "@/lib/docs";
import { consumeSequenceNumber } from "@/features/sequences/services/sequence-engine";
import { getSequenceConfig } from "@/features/sequences/services/sequence-admin";
import type { ConsumeResult } from "@/features/sequences/types";
import { formatIsoDate, toAccountingNumber } from "@/lib/accounting/utils";
import { rateLimitByOrg, RATE_LIMITS } from "@/lib/rate-limit";
import {
  canDecideApprovalForDoc,
  canRequestApprovalForDoc,
  canViewApprovalForDoc,
  canWriteBooks,
  isApprovalDocType,
  isFinanceApprovalDocType,
  type ApprovalDocType,
} from "@/lib/books-permissions";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import {
  approvePaymentRunTx,
  getFiscalPeriodReopenImpact,
  markCloseRunReopenedTx,
  postVendorBillTx,
  postVoucherTx,
  rejectPaymentRun,
  reopenFiscalPeriodTx,
} from "@/lib/accounting";
import { createNotification } from "@/lib/notifications";
import {
  advanceApprovalChain,
  createApprovalRequest,
  getApprovalDecisionContext,
  getApprovalDocumentAmount,
} from "@/lib/flow/approvals";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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
    case "vendor-bill":
      return "Vendor Bill";
    case "payment-run":
      return "Payment Run";
    case "fiscal-period-reopen":
      return "Fiscal Period Reopen";
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

const FINANCE_APPROVAL_DOC_TYPES: ApprovalDocType[] = [
  "vendor-bill",
  "payment-run",
  "fiscal-period-reopen",
] as const;

function getApprovalVisibilityWhere(
  role: string,
  userId: string,
): Prisma.ApprovalRequestWhereInput {
  if (canWriteBooks(role)) {
    return {};
  }

  if (hasPermission(role, "flow_approvals", "read")) {
    return {
      OR: [
        { docType: { notIn: FINANCE_APPROVAL_DOC_TYPES } },
        { requestedById: userId },
      ],
    };
  }

  return { requestedById: userId };
}

function revalidateApprovalDocumentPaths(docType: ApprovalDocType, docId: string) {
  if (docType === "vendor-bill") {
    revalidatePath("/app/books");
    revalidatePath("/app/books/vendor-bills");
    revalidatePath(`/app/books/vendor-bills/${docId}`);
    revalidatePath("/app/books/payment-runs");
    return;
  }

  if (docType === "payment-run") {
    revalidatePath("/app/books");
    revalidatePath("/app/books/payment-runs");
    revalidatePath(`/app/books/payment-runs/${docId}`);
    revalidatePath("/app/books/vendor-bills");
    return;
  }

  if (docType === "fiscal-period-reopen") {
    revalidatePath("/app/books");
    revalidatePath("/app/books/settings");
    revalidatePath("/app/books/close");
  }
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
    case "vendor-bill": {
      const bill = await db.vendorBill.findUnique({
        where: { id: docId },
        select: { billNumber: true },
      });
      return bill?.billNumber ?? docId;
    }
    case "payment-run": {
      const run = await db.paymentRun.findUnique({
        where: { id: docId },
        select: { runNumber: true },
      });
      return run?.runNumber ?? docId;
    }
    case "fiscal-period-reopen": {
      const period = await db.fiscalPeriod.findUnique({
        where: { id: docId },
        select: { label: true },
      });
      return period?.label ?? docId;
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
  const vendorBillIds = approvals
    .filter((approval) => approval.docType === "vendor-bill")
    .map((approval) => approval.docId);
  const paymentRunIds = approvals
    .filter((approval) => approval.docType === "payment-run")
    .map((approval) => approval.docId);
  const fiscalPeriodIds = approvals
    .filter((approval) => approval.docType === "fiscal-period-reopen")
    .map((approval) => approval.docId);

  const [invoices, vouchers, salarySlips, vendorBills, paymentRuns, fiscalPeriods] = await Promise.all([
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
    vendorBillIds.length > 0
      ? db.vendorBill.findMany({
          where: { id: { in: vendorBillIds } },
          select: {
            id: true,
            billNumber: true,
            totalAmount: true,
            billDate: true,
            vendor: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    paymentRunIds.length > 0
      ? db.paymentRun.findMany({
          where: { id: { in: paymentRunIds } },
          select: {
            id: true,
            runNumber: true,
            totalAmount: true,
            scheduledDate: true,
          },
        })
      : Promise.resolve([]),
    fiscalPeriodIds.length > 0
      ? db.fiscalPeriod.findMany({
          where: { id: { in: fiscalPeriodIds } },
          select: {
            id: true,
            label: true,
            endDate: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const documents = new Map<string, ApprovalDocumentSummary>();

  for (const invoice of invoices) {
    documents.set(`invoice:${invoice.id}`, {
      number: invoice.invoiceNumber,
      entityName: invoice.customer?.name ?? null,
      amount: toAccountingNumber(invoice.totalAmount),
      date: formatIsoDate(invoice.invoiceDate),
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

  for (const bill of vendorBills) {
    documents.set(`vendor-bill:${bill.id}`, {
      number: bill.billNumber,
      entityName: bill.vendor?.name ?? null,
      amount: toAccountingNumber(bill.totalAmount),
      date: formatIsoDate(bill.billDate),
    });
  }

  for (const paymentRun of paymentRuns) {
    documents.set(`payment-run:${paymentRun.id}`, {
      number: paymentRun.runNumber,
      entityName: null,
      amount: toAccountingNumber(paymentRun.totalAmount),
      date: paymentRun.scheduledDate.toISOString().slice(0, 10),
    });
  }

  for (const period of fiscalPeriods) {
    documents.set(`fiscal-period-reopen:${period.id}`, {
      number: period.label,
      entityName: "Governed period reopen",
      amount: 0,
      date: period.endDate.toISOString().slice(0, 10),
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
    const { orgId, userId, role } = await requireOrgContext();

    const rateLimit = await rateLimitByOrg(orgId, RATE_LIMITS.voucherApprove);
    if (!rateLimit.success) {
      return { success: false, error: `Rate limit exceeded for approval. Retry after ${rateLimit.retryAfter ?? 60} seconds.` };
    }

    const approval = await db.approvalRequest.findFirst({
      where: { id: requestId, orgId },
    });

    if (!approval) {
      return { success: false, error: "Approval request not found" };
    }

    if (
      !isApprovalDocType(approval.docType) ||
      !canViewApprovalForDoc({
        role,
        docType: approval.docType,
        isRequester: approval.requestedById === userId,
      })
    ) {
      return { success: false, error: "Insufficient permissions." };
    }

    const documents = await getApprovalDocumentSummaries([approval]);
    const document = documents.get(`${approval.docType}:${approval.docId}`) ?? null;
    const reopenImpact =
      approval.docType === "fiscal-period-reopen"
        ? await getFiscalPeriodReopenImpact(orgId, approval.docId)
        : null;

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
        reopenImpact,
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
    const { orgId, userId, role } = await requireOrgContext();

    const approval = await db.approvalRequest.findFirst({
      where: { id: requestId, orgId, status: { in: ["PENDING", "ESCALATED"] } },
    });

    if (!approval) {
      return { success: false, error: "Approval request not found or already decided" };
    }

    if (!isApprovalDocType(approval.docType)) {
      return { success: false, error: "Invalid document type" };
    }

    if (!canDecideApprovalForDoc(role, approval.docType)) {
      return { success: false, error: "Insufficient permissions." };
    }

    if (approval.requestedById === userId) {
      return { success: false, error: "You cannot approve your own request" };
    }

    const decisionContext = await getApprovalDecisionContext(
      {
        id: approval.id,
        orgId: approval.orgId,
        policyId: approval.policyId ?? null,
        policyRuleId: approval.policyRuleId ?? null,
        currentRuleOrder: approval.currentRuleOrder ?? 1,
        docType: approval.docType,
        docId: approval.docId,
      },
      userId,
    );

    if (!decisionContext.allowed) {
      return { success: false, error: "You are not assigned to the current approval step." };
    }

    const profile = await db.profile.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const approverName = profile?.name ?? "Unknown User";

    // Advance the chain — returns "APPROVED" | "PENDING" | "REJECTED"
    const chainResult = await advanceApprovalChain(
      requestId,
      userId,
      approverName,
      "APPROVED",
      note,
      decisionContext.delegatedFromId,
    );

    if (chainResult.status === "PENDING") {
      // Chain is not complete — request stays pending at the next rule
      revalidateApprovalDocumentPaths(approval.docType as ApprovalDocType, approval.docId);
      revalidatePath("/app/flow/approvals");
      revalidatePath(`/app/flow/approvals/${requestId}`);
      return { success: true, data: undefined };
    }

    if (approval.docType === "payment-run") {
      await db.$transaction(async (tx) => {
        await approvePaymentRunTx(tx, orgId, approval.docId, userId);
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
      });
    } else if (approval.docType === "fiscal-period-reopen") {
      const reopenReason = approval.note?.trim();
      if (!reopenReason) {
        return { success: false, error: "A reopen reason is required on the approval request." };
      }

      await db.$transaction(async (tx) => {
        await reopenFiscalPeriodTx(tx, {
          orgId,
          periodId: approval.docId,
          actorId: userId,
          reason: reopenReason,
        });
        await markCloseRunReopenedTx(tx, {
          orgId,
          fiscalPeriodId: approval.docId,
          actorId: userId,
          reason: reopenReason,
        });
        await tx.approvalRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            approverId: userId,
            approverName,
            decidedAt: new Date(),
          },
        });
      });
    } else {
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
          // Phase 5 / Sprint 5.2: assign the official number at
          // approval time via the sequence engine (or legacy fallback).
          // Phase 7/Sprint 7.1: re-read inside transaction for TOCTOU
          // safety; idempotency key (voucherId) prevents double consumption
          // on retry.
          const draft = await tx.voucher.findUnique({
            where: { id: approval.docId },
            select: { voucherNumber: true, voucherDate: true },
          });
          let voucherNumber = draft?.voucherNumber;

          if (!voucherNumber) {
            const sequenceConfig = await getSequenceConfig({
              orgId,
              documentType: "VOUCHER",
            });

            if (sequenceConfig?.sequenceId) {
              const docDate = new Date(
                `${draft?.voucherDate ?? new Date().toISOString().split("T")[0]}T00:00:00`
              );
              const result: ConsumeResult = await consumeSequenceNumber({
                sequenceId: sequenceConfig.sequenceId,
                documentDate: docDate,
                orgId,
                tx,
                idempotencyKey: approval.docId,
              });
              voucherNumber = result.formattedNumber;
              await tx.voucher.update({
                where: { id: approval.docId },
                data: {
                  voucherNumber,
                  sequenceId: sequenceConfig.sequenceId,
                  sequencePeriodId: result.periodId,
                  sequenceNumber: result.sequenceNumber,
                },
              });
            } else {
              voucherNumber = await nextDocumentNumberTx(tx, orgId, "voucher");
              await tx.voucher.update({
                where: { id: approval.docId },
                data: { voucherNumber },
              });
            }
          }
          await tx.voucher.update({ where: { id: approval.docId }, data: { status: "approved" } });
          await postVoucherTx(tx, { orgId, voucherId: approval.docId, actorId: userId });
        } else if (approval.docType === "salary-slip") {
          await tx.salarySlip.update({ where: { id: approval.docId }, data: { status: "approved" } });
        } else if (approval.docType === "vendor-bill") {
          await tx.vendorBill.update({ where: { id: approval.docId }, data: { status: "APPROVED" } });
          await postVendorBillTx(tx, { orgId, vendorBillId: approval.docId, actorId: userId });
        }
      });
    }

    const docNumber = await getDocNumber(approval.docType, approval.docId);

    await createNotification({
      userId: approval.requestedById,
      orgId,
      type: "approval_approved",
      title: "Approval Granted",
      body: `${approverName} approved your ${docTypeToLabel(approval.docType)} ${docNumber}`,
      link: `/app/flow/approvals/${requestId}`,
    });

    revalidateApprovalDocumentPaths(approval.docType as ApprovalDocType, approval.docId);
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
    const { orgId, userId, role } = await requireOrgContext();

    if (!note || note.trim().length === 0) {
      return { success: false, error: "Rejection reason is required" };
    }

    const approval = await db.approvalRequest.findFirst({
      where: { id: requestId, orgId, status: { in: ["PENDING", "ESCALATED"] } },
    });

    if (!approval) {
      return { success: false, error: "Approval request not found or already decided" };
    }

    if (!isApprovalDocType(approval.docType)) {
      return { success: false, error: "Invalid document type" };
    }

    if (!canDecideApprovalForDoc(role, approval.docType)) {
      return { success: false, error: "Insufficient permissions." };
    }

    if (approval.requestedById === userId) {
      return { success: false, error: "You cannot reject your own request" };
    }

    const decisionContext = await getApprovalDecisionContext(
      {
        id: approval.id,
        orgId: approval.orgId,
        policyId: approval.policyId ?? null,
        policyRuleId: approval.policyRuleId ?? null,
        currentRuleOrder: approval.currentRuleOrder ?? 1,
        docType: approval.docType,
        docId: approval.docId,
      },
      userId,
    );

    if (!decisionContext.allowed) {
      return { success: false, error: "You are not assigned to the current approval step." };
    }

    const profile = await db.profile.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const approverName = profile?.name ?? "Unknown User";

    // Record decision in the chain (always terminal for rejections)
    await advanceApprovalChain(
      requestId,
      userId,
      approverName,
      "REJECTED",
      note.trim(),
      decisionContext.delegatedFromId,
    );

    if (approval.docType === "payment-run") {
      await rejectPaymentRun({
        orgId,
        paymentRunId: approval.docId,
        reason: note.trim(),
        actorId: userId,
      });
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
    } else {
      await db.$transaction(async (tx) => {
        await tx.approvalRequest.update({
          where: { id: requestId },
          data: {
            status: "REJECTED",
            approverId: userId,
            approverName,
            decidedAt: new Date(),
            note:
              approval.docType === "fiscal-period-reopen"
                ? approval.note
                : note.trim(),
          },
        });

        if (isFinanceApprovalDocType(approval.docType)) {
          if (approval.docType === "vendor-bill") {
            await tx.vendorBill.update({ where: { id: approval.docId }, data: { status: "DRAFT" } });
          }
        }
      });
    }

    const docNumber = await getDocNumber(approval.docType, approval.docId);

    await createNotification({
      userId: approval.requestedById,
      orgId,
      type: "approval_rejected",
      title: "Approval Rejected",
      body: `${approverName} rejected your ${docTypeToLabel(approval.docType)} ${docNumber}: "${note.trim()}"`,
      link: `/app/flow/approvals/${requestId}`,
    });

    revalidateApprovalDocumentPaths(approval.docType as ApprovalDocType, approval.docId);
    revalidatePath("/app/flow/approvals");
    revalidatePath(`/app/flow/approvals/${requestId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("rejectRequest error:", error);
    return { success: false, error: "Failed to reject request" };
  }
}
