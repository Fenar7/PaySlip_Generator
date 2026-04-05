"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
          amount: p.amount,
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
    reviewStatus: string;
    reviewNote: string | null;
    createdAt: string;
    reviewedAt: string | null;
    invoice: {
      id: string;
      invoiceNumber: string;
      totalAmount: number;
      status: string;
      customerName: string;
    };
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
            status: true,
            customer: { select: { name: true } },
          },
        },
      },
    });

    if (!proof) {
      return { success: false, error: "Proof not found" };
    }

    return {
      success: true,
      data: {
        id: proof.id,
        fileUrl: proof.fileUrl,
        fileName: proof.fileName,
        amount: proof.amount,
        paymentDate: proof.paymentDate,
        paymentMethod: proof.paymentMethod,
        reviewStatus: proof.reviewStatus,
        reviewNote: proof.reviewNote,
        createdAt: proof.createdAt.toISOString(),
        reviewedAt: proof.reviewedAt?.toISOString() ?? null,
        invoice: {
          id: proof.invoice.id,
          invoiceNumber: proof.invoice.invoiceNumber,
          totalAmount: proof.invoice.totalAmount,
          status: proof.invoice.status,
          customerName: proof.invoice.customer?.name || "—",
        },
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
      include: { invoice: { select: { id: true, status: true } } },
    });

    if (!proof) {
      return { success: false, error: "Proof not found" };
    }

    await db.$transaction([
      db.invoiceProof.update({
        where: { id: proofId },
        data: {
          reviewStatus: "ACCEPTED",
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      }),
      db.invoice.update({
        where: { id: proof.invoice.id },
        data: { status: "PAID", paidAt: new Date() },
      }),
      db.invoiceStateEvent.create({
        data: {
          invoiceId: proof.invoice.id,
          fromStatus: proof.invoice.status,
          toStatus: "PAID",
          actorId: userId,
          reason: "Payment proof accepted",
        },
      }),
    ]);

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
      include: { invoice: { select: { id: true, status: true } } },
    });

    if (!proof) {
      return { success: false, error: "Proof not found" };
    }

    await db.$transaction([
      db.invoiceProof.update({
        where: { id: proofId },
        data: {
          reviewStatus: "REJECTED",
          reviewNote: reason,
          reviewedById: userId,
          reviewedAt: new Date(),
        },
      }),
      db.invoice.update({
        where: { id: proof.invoice.id },
        data: { status: "ISSUED" },
      }),
      db.invoiceStateEvent.create({
        data: {
          invoiceId: proof.invoice.id,
          fromStatus: proof.invoice.status,
          toStatus: "ISSUED",
          actorId: userId,
          reason: `Payment proof rejected: ${reason}`,
        },
      }),
    ]);

    revalidatePath("/app/pay/proofs");
    revalidatePath("/app/pay/receivables");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("rejectProof error:", error);
    return { success: false, error: "Failed to reject proof" };
  }
}
