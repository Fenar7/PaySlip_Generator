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
          amountPaid: invoice.amountPaid,
          remainingAmount: invoice.remainingAmount,
          paymentPromiseDate: invoice.paymentPromiseDate ?? null,
          notes: invoice.notes,
          paidAt: invoice.paidAt?.toISOString() ?? null,
          razorpayPaymentLinkUrl: invoice.razorpayPaymentLinkUrl ?? null,
          paymentLinkStatus: invoice.paymentLinkStatus ?? null,
          paymentLinkExpiresAt: invoice.paymentLinkExpiresAt?.toISOString() ?? null,
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
