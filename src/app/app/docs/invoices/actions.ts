"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { nextDocumentNumber } from "@/lib/docs";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

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
      include: { customer: true },
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

// ─── Status Transitions ───────────────────────────────────────────────────────

export async function issueInvoice(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId } = await requireOrgContext();

    const existing = await db.invoice.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (existing.status !== "DRAFT") {
      return { success: false, error: "Can only issue draft invoices" };
    }

    await db.invoice.update({
      where: { id },
      data: { status: "ISSUED" },
    });

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
    const { orgId } = await requireOrgContext();

    await db.invoice.update({
      where: { id, organizationId: orgId },
      data: { status: "PAID" },
    });

    revalidatePath("/app/docs/invoices");
    revalidatePath(`/app/docs/invoices/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("markInvoicePaid error:", error);
    return { success: false, error: "Failed to mark invoice as paid" };
  }
}
