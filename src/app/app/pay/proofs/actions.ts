"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { toAccountingNumber } from "@/lib/accounting/utils";
import { revalidatePath } from "next/cache";
import { reconcileInvoicePayment } from "@/lib/invoice-reconciliation";
import { postInvoicePaymentTx } from "@/lib/accounting";
import { resolvePaymentProofUrl } from "@/features/pay/server/payment-proof-storage";
import { notifyOrgAdmins } from "@/lib/notifications";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function listProofs(params?: {
  status?: string;
  page?: number;
}): Promise<
  ActionResult<{
    proofs: Array<{
      id: string;
      invoiceNumber: string;
      customerName: string;
      amount: number;
      paymentDate: string | null;
      paymentMethod: string | null;
      reviewStatus: string;
      createdAt: string;
      fileName: string;
    }>;
    total: number;
    totalPages: number;
  }>
> {
  try {
    const { orgId } = await requireOrgContext();
    const page = params?.page || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = {
      invoice: { organizationId: orgId },
      ...(params?.status && params.status !== "ALL"
        ? { reviewStatus: params.status as "PENDING" | "ACCEPTED" | "REJECTED" }
        : {}),
    };

    const [proofs, total] = await Promise.all([
      db.invoiceProof.findMany({
        where,
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              customer: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.invoiceProof.count({ where }),
    ]);

    return {
      success: true,
        data: {
          proofs: proofs.map((p) => ({
            id: p.id,
            invoiceNumber: p.invoice.invoiceNumber,
            customerName: p.invoice.customer?.name || "—",
            amount: toAccountingNumber(p.amount),
            paymentDate: p.paymentDate,
            paymentMethod: p.paymentMethod,
            reviewStatus: p.reviewStatus,
          createdAt: p.createdAt.toISOString(),
          fileName: p.fileName,
        })),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("listProofs error:", error);
    return { success: false, error: "Failed to load proofs" };
  }
}

export async function getProofDetail(proofId: string): Promise<
  ActionResult<{
    id: string;
    fileUrl: string;
    fileName: string;
    amount: number;
    paymentDate: string | null;
    paymentMethod: string | null;
    plannedNextPaymentDate: string | null;
    reviewStatus: string;
    reviewNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
    invoice: {
      id: string;
      invoiceNumber: string;
      totalAmount: number;
      amountPaid: number;
      remainingAmount: number;
      status: string;
      customerName: string;
    };
    resultingStatus: "PAID" | "PARTIALLY_PAID";
  }>
> {
  try {
    const { orgId } = await requireOrgContext();

    const proof = await db.invoiceProof.findFirst({
      where: { id: proofId, invoice: { organizationId: orgId } },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            amountPaid: true,
            remainingAmount: true,
            status: true,
            customer: { select: { name: true } },
          },
        },
      },
    });

    if (!proof) {
      return { success: false, error: "Proof not found" };
    }

    // Effective remaining: for legacy invoices where remainingAmount hasn't been
    // reconciled yet, fall back to totalAmount - amountPaid.
    const remainingAmount = toAccountingNumber(proof.invoice.remainingAmount);
    const totalAmount = toAccountingNumber(proof.invoice.totalAmount);
    const amountPaid = toAccountingNumber(proof.invoice.amountPaid);
    const proofAmount = toAccountingNumber(proof.amount);
    const effectiveRemaining = remainingAmount > 0 ? remainingAmount : Math.max(totalAmount - amountPaid, 0);

    const resultingStatus: "PAID" | "PARTIALLY_PAID" =
      proofAmount >= effectiveRemaining ? "PAID" : "PARTIALLY_PAID";

    const fileUrl = await resolvePaymentProofUrl(proof.fileUrl);

    return {
      success: true,
      data: {
        id: proof.id,
        fileUrl,
        fileName: proof.fileName,
        amount: proofAmount,
        paymentDate: proof.paymentDate,
        paymentMethod: proof.paymentMethod,
        plannedNextPaymentDate: proof.plannedNextPaymentDate ?? null,
        reviewStatus: proof.reviewStatus,
        reviewNote: proof.reviewNote,
        createdAt: proof.createdAt.toISOString(),
        reviewedAt: proof.reviewedAt?.toISOString() ?? null,
        invoice: {
          id: proof.invoice.id,
          invoiceNumber: proof.invoice.invoiceNumber,
          totalAmount,
          amountPaid,
          remainingAmount,
          status: proof.invoice.status,
          customerName: proof.invoice.customer?.name || "—",
        },
        resultingStatus,
      },
    };
  } catch (error) {
    console.error("getProofDetail error:", error);
    return { success: false, error: "Failed to load proof" };
  }
}

export async function acceptProof(proofId: string): Promise<ActionResult<void>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    const proof = await db.invoiceProof.findFirst({
      where: { id: proofId, invoice: { organizationId: orgId } },
      include: {
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
        invoicePayment: true,
      },
    });

    if (!proof) {
      return { success: false, error: "Proof not found" };
    }

    const invoiceId = proof.invoice.id;
    const existingPaymentId = proof.invoicePayment?.id ?? null;

    if (!existingPaymentId) {
      // Legacy proof: create a SETTLED payment and link it to the proof in one transaction
      await db.$transaction(async (tx) => {
        const newPayment = await tx.invoicePayment.create({
          data: {
            invoiceId,
            orgId,
            amount: proof.amount,
            method: proof.paymentMethod ?? null,
            paidAt: proof.paymentDate ? new Date(proof.paymentDate) : new Date(),
            source: "public_proof",
            status: "SETTLED",
            reviewedByUserId: userId,
            reviewedAt: new Date(),
          },
        });

        await postInvoicePaymentTx(tx, {
          orgId,
          invoicePaymentId: newPayment.id,
          actorId: userId,
        });

        await tx.invoiceProof.update({
          where: { id: proofId },
          data: {
            invoicePaymentId: newPayment.id,
            reviewStatus: "ACCEPTED",
            reviewedById: userId,
            reviewedAt: new Date(),
          },
        });
      });
    } else {
      await db.$transaction(async (tx) => {
        await tx.invoicePayment.update({
          where: { id: existingPaymentId },
          data: { status: "SETTLED", reviewedByUserId: userId, reviewedAt: new Date() },
        });

        await postInvoicePaymentTx(tx, {
          orgId,
          invoicePaymentId: existingPaymentId,
          actorId: userId,
        });

        await tx.invoiceProof.update({
          where: { id: proofId },
          data: { reviewStatus: "ACCEPTED", reviewedById: userId, reviewedAt: new Date() },
        });
      });
    }

    await reconcileInvoicePayment(invoiceId, userId);

    await notifyOrgAdmins({
      orgId,
      type: "proof_accepted",
      title: "Payment proof accepted",
      body: `Payment proof for invoice ${proof.invoice.invoiceNumber} was accepted.`,
      link: `/app/pay/proofs/${proofId}`,
      excludeUserId: userId,
    }).catch((error) => {
      console.error("acceptProof notification error:", error);
    });

    revalidatePath("/app/pay/proofs");
    revalidatePath("/app/pay/receivables");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("acceptProof error:", error);
    return { success: false, error: "Failed to accept proof" };
  }
}

export async function rejectProof(
  proofId: string,
  reason: string
): Promise<ActionResult<void>> {
  try {
    const { userId, orgId } = await requireOrgContext();

    const proof = await db.invoiceProof.findFirst({
      where: { id: proofId, invoice: { organizationId: orgId } },
      include: {
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
        invoicePayment: { select: { id: true } },
      },
    });

    if (!proof) {
      return { success: false, error: "Proof not found" };
    }

    await db.$transaction(async (tx) => {
      if (proof.invoicePayment) {
        await tx.invoicePayment.update({
          where: { id: proof.invoicePayment.id },
          data: {
            status: "REJECTED",
            rejectionReason: reason,
            reviewedByUserId: userId,
            reviewedAt: new Date(),
          },
        });
      }
      await tx.invoiceProof.update({
        where: { id: proofId },
        data: {
          reviewStatus: "REJECTED",
          reviewNote: reason,
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      });
    });

    // Reconcile to derive the correct status (PARTIALLY_PAID, OVERDUE, etc.)
    // rather than blindly resetting to ISSUED.
    await reconcileInvoicePayment(proof.invoice.id, userId);

    await notifyOrgAdmins({
      orgId,
      type: "proof_rejected",
      title: "Payment proof rejected",
      body: `Payment proof for invoice ${proof.invoice.invoiceNumber} was rejected.`,
      link: `/app/pay/proofs/${proofId}`,
      excludeUserId: userId,
    }).catch((error) => {
      console.error("rejectProof notification error:", error);
    });

    revalidatePath("/app/pay/proofs");
    revalidatePath("/app/pay/receivables");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("rejectProof error:", error);
    return { success: false, error: "Failed to reject proof" };
  }
}
