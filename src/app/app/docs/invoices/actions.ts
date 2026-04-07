"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { nextDocumentNumber } from "@/lib/docs";
import { getSchemaDriftActionMessage, isModelMissingTableError } from "@/lib/prisma-errors";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { reconcileInvoicePayment, validatePaymentAmount } from "@/lib/invoice-reconciliation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "VIEWED"
  | "DUE"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "DISPUTED"
  | "CANCELLED"
  | "REISSUED";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export interface InvoiceInput {
  customerId?: string;
  invoiceDate: string;
  dueDate?: string;
  notes?: string;
  formData: Record<string, unknown>;
  lineItems: InvoiceLineItemInput[];
}

// ─── Invoice Actions ──────────────────────────────────────────────────────────

export async function saveInvoice(
  input: InvoiceInput,
  status: "DRAFT" | "ISSUED" = "DRAFT"
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  try {
    const { orgId } = await requireOrgContext();

    const invoiceNumber = await nextDocumentNumber(orgId, "invoice");

    const totalAmount = input.lineItems.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice;
      const tax = subtotal * (item.taxRate / 100);
      const discount = item.discount;
      return sum + subtotal + tax - discount;
    }, 0);

    const invoice = await db.invoice.create({
      data: {
        organizationId: orgId,
        customerId: input.customerId || null,
        invoiceNumber,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate || null,
        status,
        notes: input.notes || null,
        formData: input.formData as Prisma.InputJsonValue,
        totalAmount,
        lineItems: {
          create: input.lineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discount: item.discount,
            amount:
              item.quantity * item.unitPrice * (1 + item.taxRate / 100) -
              item.discount,
            sortOrder: index,
          })),
        },
      },
    });

    revalidatePath("/app/docs/invoices");
    return { success: true, data: { id: invoice.id, invoiceNumber } };
  } catch (error) {
    if (isModelMissingTableError(error, "Invoice")) {
      console.warn(
        "saveInvoice failed because the invoice table is missing; the local database is behind the Prisma schema.",
      );
      return {
        success: false,
        error: getSchemaDriftActionMessage("save the invoice"),
      };
    }
    console.error("saveInvoice error:", error);
    return { success: false, error: "Failed to save invoice" };
  }
}

export async function updateInvoice(
  id: string,
  input: Partial<InvoiceInput>
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    let totalAmount = existing.totalAmount;
    if (input.lineItems) {
      totalAmount = input.lineItems.reduce((sum, item) => {
        const subtotal = item.quantity * item.unitPrice;
        const tax = subtotal * (item.taxRate / 100);
        return sum + subtotal + tax - item.discount;
      }, 0);
    }

    await db.invoice.update({
      where: { id },
      data: {
        customerId: input.customerId,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        notes: input.notes,
        formData: input.formData as Prisma.InputJsonValue | undefined,
        totalAmount,
      },
    });

    if (input.lineItems) {
      await db.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      await db.invoiceLineItem.createMany({
        data: input.lineItems.map((item, index) => ({
          invoiceId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          amount:
            item.quantity * item.unitPrice * (1 + item.taxRate / 100) -
            item.discount,
          sortOrder: index,
        })),
      });
    }

    revalidatePath("/app/docs/invoices");
    revalidatePath(`/app/docs/invoices/${id}`);
    return { success: true, data: { id } };
  } catch (error) {
    if (isModelMissingTableError(error, "Invoice")) {
      console.warn(
        "updateInvoice failed because the invoice table is missing; the local database is behind the Prisma schema.",
      );
      return {
        success: false,
        error: getSchemaDriftActionMessage("update the invoice"),
      };
    }
    console.error("updateInvoice error:", error);
    return { success: false, error: "Failed to update invoice" };
  }
}

export async function archiveInvoice(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    await db.invoice.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    revalidatePath("/app/docs/invoices");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("archiveInvoice error:", error);
    return { success: false, error: "Failed to archive invoice" };
  }
}

export async function duplicateInvoice(
  id: string
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  try {
    const { orgId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: { lineItems: true },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    const newNumber = await nextDocumentNumber(orgId, "invoice");

    const duplicate = await db.invoice.create({
      data: {
        organizationId: orgId,
        customerId: existing.customerId,
        invoiceNumber: newNumber,
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: existing.dueDate,
        status: "DRAFT",
        notes: existing.notes,
        formData: existing.formData as Prisma.InputJsonValue,
        totalAmount: existing.totalAmount,
        lineItems: {
          create: existing.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            discount: item.discount,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        },
      },
    });

    revalidatePath("/app/docs/invoices");
    return { success: true, data: { id: duplicate.id, invoiceNumber: newNumber } };
  } catch (error) {
    console.error("duplicateInvoice error:", error);
    return { success: false, error: "Failed to duplicate invoice" };
  }
}

export async function deleteInvoice(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (existing.status !== "DRAFT") {
      return { success: false, error: "Can only delete draft invoices" };
    }

    await db.invoice.delete({ where: { id } });

    revalidatePath("/app/docs/invoices");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteInvoice error:", error);
    return { success: false, error: "Failed to delete invoice" };
  }
}

export async function getInvoice(id: string) {
  const { orgId } = await requireOrgContext();

  return db.invoice.findFirst({
    where: { id, organizationId: orgId, archivedAt: null },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      customer: true,
    },
  });
}

export async function listInvoices(params?: {
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  limit?: number;
  includeArchived?: boolean;
}) {
  const { orgId } = await requireOrgContext();
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    organizationId: orgId,
    ...(params?.status && { status: params.status }),
    ...(params?.includeArchived !== true && { archivedAt: null }),
    ...(params?.search && {
      OR: [
        { invoiceNumber: { contains: params.search, mode: "insensitive" as const } },
        { customer: { name: { contains: params.search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { customer: true, publicTokens: true },
    }),
    db.invoice.count({ where }),
  ]);

  return {
    invoices,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── State Machine ────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["ISSUED", "CANCELLED"],
  ISSUED: ["VIEWED", "DUE", "PARTIALLY_PAID", "PAID", "OVERDUE", "DISPUTED", "CANCELLED"],
  VIEWED: ["DUE", "PARTIALLY_PAID", "PAID", "OVERDUE", "DISPUTED", "CANCELLED"],
  DUE: ["PARTIALLY_PAID", "PAID", "OVERDUE", "DISPUTED", "CANCELLED"],
  PARTIALLY_PAID: ["PAID", "OVERDUE", "DISPUTED", "CANCELLED"],
  PAID: ["DISPUTED", "REISSUED"],
  OVERDUE: ["PARTIALLY_PAID", "PAID", "DISPUTED", "CANCELLED"],
  DISPUTED: ["ISSUED", "CANCELLED"],
  CANCELLED: [],
  REISSUED: [],
};

function canTransition(from: string, to: string): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Status Transitions ───────────────────────────────────────────────────────

export async function issueInvoice(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (!canTransition(existing.status, "ISSUED")) {
      return { success: false, error: `Cannot issue invoice in ${existing.status} status` };
    }

    await db.$transaction([
      db.invoice.update({
        where: { id },
        data: { status: "ISSUED", issuedAt: new Date() },
      }),
      db.invoiceStateEvent.create({
        data: {
          invoiceId: id,
          fromStatus: existing.status,
          toStatus: "ISSUED",
          actorId: userId,
        },
      }),
      db.publicInvoiceToken.create({
        data: {
          invoiceId: id,
          orgId,
          token: crypto.randomUUID(),
        },
      }),
    ]);

    revalidatePath("/app/docs/invoices");
    revalidatePath(`/app/docs/invoices/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("issueInvoice error:", error);
    return { success: false, error: "Failed to issue invoice" };
  }
}

export async function markInvoicePaid(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true, status: true, totalAmount: true, amountPaid: true },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (existing.status === "PAID") {
      return { success: false, error: "Invoice is already paid" };
    }

    if (existing.status === "CANCELLED") {
      return { success: false, error: "Cannot mark a cancelled invoice as paid" };
    }

    if (existing.status === "DRAFT") {
      return { success: false, error: "Cannot mark a draft invoice as paid" };
    }

    // Backwards-compat: compute remaining from totalAmount - amountPaid so that
    // legacy records (where remainingAmount column still holds the default 0) work correctly.
    const remaining = Math.max(existing.totalAmount - existing.amountPaid, 0);

    if (remaining <= 0) {
      return { success: false, error: "Invoice has no remaining balance" };
    }

    await db.invoicePayment.create({
      data: {
        invoiceId: id,
        orgId,
        amount: remaining,
        method: "manual",
        source: "admin_manual",
        status: "SETTLED",
        recordedByUserId: userId,
      },
    });

    await reconcileInvoicePayment(id, userId);

    revalidatePath("/app/docs/invoices");
    revalidatePath(`/app/docs/invoices/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("markInvoicePaid error:", error);
    return { success: false, error: "Failed to mark invoice as paid" };
  }
}

interface RecordPaymentInput {
  amount: number;
  method?: string;
  paidAt?: Date;
  note?: string;
  plannedNextPaymentDate?: string; // ISO date string, only valid if amount < remaining
}

export async function recordPayment(
  invoiceId: string,
  input: RecordPaymentInput
): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (existing.status === "DRAFT" || existing.status === "REISSUED") {
      return { success: false, error: `Cannot record payment for invoice in ${existing.status} status` };
    }

    const validation = await validatePaymentAmount(invoiceId, input.amount);
    if (!validation.valid) {
      return { success: false, error: validation.error! };
    }

    const remaining = validation.remaining;

    if (input.plannedNextPaymentDate && input.amount < remaining) {
      const promiseDate = new Date(input.plannedNextPaymentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (promiseDate < today) {
        return { success: false, error: "Planned next payment date must be today or in the future" };
      }
    }

    await db.invoicePayment.create({
      data: {
        invoiceId,
        orgId,
        amount: input.amount,
        method: input.method ?? null,
        paidAt: input.paidAt ?? new Date(),
        note: input.note ?? null,
        source: "admin_manual",
        status: "SETTLED",
        recordedByUserId: userId,
        plannedNextPaymentDate:
          input.amount < remaining ? (input.plannedNextPaymentDate ?? null) : null,
      },
    });

    await reconcileInvoicePayment(invoiceId, userId);

    revalidatePath("/app/docs/invoices");
    revalidatePath(`/app/docs/invoices/${invoiceId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("recordPayment error:", error);
    return { success: false, error: "Failed to record payment" };
  }
}

export async function markOverdue(invoiceId: string): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (!canTransition(existing.status, "OVERDUE")) {
      return { success: false, error: `Cannot mark invoice as overdue from ${existing.status} status` };
    }

    await db.$transaction([
      db.invoice.update({
        where: { id: invoiceId },
        data: { status: "OVERDUE", overdueAt: new Date() },
      }),
      db.invoiceStateEvent.create({
        data: {
          invoiceId,
          fromStatus: existing.status,
          toStatus: "OVERDUE",
          actorId: userId,
        },
      }),
    ]);

    revalidatePath("/app/docs/invoices");
    revalidatePath(`/app/docs/invoices/${invoiceId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("markOverdue error:", error);
    return { success: false, error: "Failed to mark invoice as overdue" };
  }
}

export async function disputeInvoice(
  invoiceId: string,
  reason: string
): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (!canTransition(existing.status, "DISPUTED")) {
      return { success: false, error: `Cannot dispute invoice in ${existing.status} status` };
    }

    await db.$transaction([
      db.invoice.update({
        where: { id: invoiceId },
        data: { status: "DISPUTED" },
      }),
      db.invoiceStateEvent.create({
        data: {
          invoiceId,
          fromStatus: existing.status,
          toStatus: "DISPUTED",
          actorId: userId,
          reason,
        },
      }),
    ]);

    revalidatePath("/app/docs/invoices");
    revalidatePath(`/app/docs/invoices/${invoiceId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("disputeInvoice error:", error);
    return { success: false, error: "Failed to dispute invoice" };
  }
}

export async function cancelInvoice(
  invoiceId: string,
  reason: string
): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (!canTransition(existing.status, "CANCELLED")) {
      return { success: false, error: `Cannot cancel invoice in ${existing.status} status` };
    }

    await db.$transaction([
      db.invoice.update({
        where: { id: invoiceId },
        data: { status: "CANCELLED" },
      }),
      db.invoiceStateEvent.create({
        data: {
          invoiceId,
          fromStatus: existing.status,
          toStatus: "CANCELLED",
          actorId: userId,
          reason,
        },
      }),
    ]);

    revalidatePath("/app/docs/invoices");
    revalidatePath(`/app/docs/invoices/${invoiceId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("cancelInvoice error:", error);
    return { success: false, error: "Failed to cancel invoice" };
  }
}

export async function reissueInvoice(
  invoiceId: string,
  reason: string
): Promise<ActionResult<{ id: string; invoiceNumber: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: { lineItems: true },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (!canTransition(existing.status, "REISSUED")) {
      return { success: false, error: `Cannot reissue invoice in ${existing.status} status` };
    }

    const newNumber = await nextDocumentNumber(orgId, "invoice");

    const result = await db.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          organizationId: orgId,
          customerId: existing.customerId,
          invoiceNumber: newNumber,
          invoiceDate: new Date().toISOString().split("T")[0],
          dueDate: existing.dueDate,
          status: "DRAFT",
          notes: existing.notes,
          formData: existing.formData as Prisma.InputJsonValue,
          totalAmount: existing.totalAmount,
          originalId: invoiceId,
          lineItems: {
            create: existing.lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              discount: item.discount,
              amount: item.amount,
              sortOrder: item.sortOrder,
            })),
          },
        },
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: "REISSUED", reissueReason: reason },
      });

      await tx.invoiceStateEvent.create({
        data: {
          invoiceId,
          fromStatus: existing.status,
          toStatus: "REISSUED",
          actorId: userId,
          reason,
          metadata: { newInvoiceId: newInvoice.id, newInvoiceNumber: newNumber } as Prisma.InputJsonValue,
        },
      });

      return newInvoice;
    });

    revalidatePath("/app/docs/invoices");
    revalidatePath(`/app/docs/invoices/${invoiceId}`);
    return { success: true, data: { id: result.id, invoiceNumber: newNumber } };
  } catch (error) {
    console.error("reissueInvoice error:", error);
    return { success: false, error: "Failed to reissue invoice" };
  }
}

// ─── Timeline & Tokens ───────────────────────────────────────────────────────

export async function getInvoiceTimeline(invoiceId: string) {
  const { orgId } = await requireOrgContext();

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    select: { id: true },
  });

  if (!invoice) return [];

  return db.invoiceStateEvent.findMany({
    where: { invoiceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPublicToken(invoiceId: string) {
  const { orgId } = await requireOrgContext();

  return db.publicInvoiceToken.findFirst({
    where: { invoiceId, orgId },
    orderBy: { createdAt: "desc" },
  });
}
