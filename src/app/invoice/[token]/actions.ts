"use server";

import { db } from "@/lib/db";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getPublicInvoice(token: string) {
  try {
    const tokenRecord = await db.publicInvoiceToken.findUnique({
      where: { token },
      include: {
        invoice: {
          include: {
            lineItems: { orderBy: { sortOrder: "asc" } },
            customer: true,
            organization: true,
            proofs: {
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
      },
    });

    if (!tokenRecord) {
      return { success: false as const, error: "Invoice not found or link has expired" };
    }

    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
      return { success: false as const, error: "This invoice link has expired" };
    }

    const invoice = tokenRecord.invoice;
    const formData = invoice.formData as Record<string, unknown>;

    return {
      success: true as const,
      data: {
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          status: invoice.status,
          totalAmount: invoice.totalAmount,
          notes: invoice.notes,
          paidAt: invoice.paidAt?.toISOString() ?? null,
          formData,
          lineItems: invoice.lineItems.map((li) => ({
            id: li.id,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            taxRate: li.taxRate,
            discount: li.discount,
            amount: li.amount,
          })),
          customer: invoice.customer
            ? {
                name: invoice.customer.name,
                email: invoice.customer.email,
                phone: invoice.customer.phone,
              }
            : null,
          organization: {
            name: invoice.organization.name,
          },
          proofs: invoice.proofs.map((p) => ({
            id: p.id,
            amount: p.amount,
            reviewStatus: p.reviewStatus,
            createdAt: p.createdAt.toISOString(),
          })),
        },
        tokenId: tokenRecord.id,
      },
    };
  } catch (error) {
    console.error("getPublicInvoice error:", error);
    return { success: false as const, error: "Failed to load invoice" };
  }
}

export async function markAsViewed(token: string): Promise<ActionResult<void>> {
  try {
    const tokenRecord = await db.publicInvoiceToken.findUnique({
      where: { token },
      include: { invoice: { select: { id: true, status: true } } },
    });

    if (!tokenRecord) {
      return { success: false, error: "Token not found" };
    }

    await db.publicInvoiceToken.update({
      where: { id: tokenRecord.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessedAt: new Date(),
      },
    });

    if (tokenRecord.invoice.status === "ISSUED") {
      await db.$transaction([
        db.invoice.update({
          where: { id: tokenRecord.invoice.id },
          data: { status: "VIEWED" },
        }),
        db.invoiceStateEvent.create({
          data: {
            invoiceId: tokenRecord.invoice.id,
            fromStatus: "ISSUED",
            toStatus: "VIEWED",
            reason: "Invoice viewed via public link",
          },
        }),
      ]);
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("markAsViewed error:", error);
    return { success: false, error: "Failed to mark as viewed" };
  }
}

export async function uploadPaymentProof(
  token: string,
  data: {
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    note?: string;
    fileUrl: string;
    fileName: string;
  }
): Promise<ActionResult<{ proofId: string }>> {
  try {
    const tokenRecord = await db.publicInvoiceToken.findUnique({
      where: { token },
      include: {
        invoice: { select: { id: true, totalAmount: true, status: true, organizationId: true } },
      },
    });

    if (!tokenRecord) {
      return { success: false, error: "Invalid token" };
    }

    const invoice = tokenRecord.invoice;
    const isPartial = data.amount < invoice.totalAmount;

    const result = await db.$transaction(async (tx) => {
      const proof = await tx.invoiceProof.create({
        data: {
          invoiceId: invoice.id,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          amount: data.amount,
          paymentDate: data.paymentDate,
          paymentMethod: data.paymentMethod,
          uploadedByToken: tokenRecord.id,
          reviewStatus: "PENDING",
        },
      });

      await tx.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          orgId: invoice.organizationId,
          amount: data.amount,
          method: data.paymentMethod,
          note: data.note || null,
          paidAt: new Date(data.paymentDate),
          isPartial,
        },
      });

      const prevStatus = invoice.status;
      if (prevStatus !== "PARTIALLY_PAID" && prevStatus !== "PAID") {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: "PARTIALLY_PAID" },
        });

        await tx.invoiceStateEvent.create({
          data: {
            invoiceId: invoice.id,
            fromStatus: prevStatus,
            toStatus: "PARTIALLY_PAID",
            reason: "Payment proof uploaded (pending review)",
          },
        });
      }

      return proof;
    });

    return { success: true, data: { proofId: result.id } };
  } catch (error) {
    console.error("uploadPaymentProof error:", error);
    return { success: false, error: "Failed to upload payment proof" };
  }
}
