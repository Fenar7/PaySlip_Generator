"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import {
  createArrangement,
  recordInstallmentPayment,
  cancelArrangement,
  listArrangements,
} from "@/lib/payment-arrangements";
import { revalidatePath } from "next/cache";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const ARRANGEMENTS_PATH = "/app/pay/arrangements";

// ─── 1. List Arrangements ───────────────────────────────────────────────────

export async function listArrangementsAction(
  status?: string,
): Promise<
  ActionResult<
    Array<{
      id: string;
      invoiceNumber: string;
      customerName: string;
      totalArranged: number;
      installmentCount: number;
      paidCount: number;
      status: string;
      createdAt: Date;
    }>
  >
> {
  try {
    const { orgId } = await requireOrgContext();

    const arrangements = await listArrangements(orgId, status);

    return {
      success: true,
      data: arrangements.map((a) => ({
        id: a.id,
        invoiceNumber: a.invoice.invoiceNumber,
        customerName: a.customer.name,
        totalArranged: a.totalArranged,
        installmentCount: a.installmentCount,
        paidCount: a.installments.filter((i) => i.status === "PAID").length,
        status: a.status,
        createdAt: a.createdAt,
      })),
    };
  } catch (error) {
    console.error("listArrangementsAction error:", error);
    return { success: false, error: "Failed to load arrangements" };
  }
}

// ─── 2. Get Arrangement ─────────────────────────────────────────────────────

export async function getArrangementAction(arrangementId: string): Promise<
  ActionResult<{
    id: string;
    orgId: string;
    invoiceId: string;
    invoiceNumber: string;
    invoiceTotalAmount: number;
    invoiceRemainingAmount: number;
    invoiceStatus: string;
    customerName: string;
    customerEmail: string | null;
    totalArranged: number;
    installmentCount: number;
    status: string;
    notes: string | null;
    createdByName: string | null;
    createdAt: Date;
    installments: Array<{
      id: string;
      installmentNumber: number;
      dueDate: Date;
      amount: number;
      status: string;
      paidAt: Date | null;
      paymentMethod: string | null;
      paymentReference: string | null;
    }>;
  }>
> {
  try {
    const { orgId } = await requireOrgContext();

    const arrangement = await db.paymentArrangement.findUnique({
      where: { id: arrangementId },
      include: {
        customer: { select: { name: true, email: true } },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            remainingAmount: true,
            status: true,
          },
        },
        creator: { select: { name: true } },
        installments: {
          orderBy: { installmentNumber: "asc" },
          include: {
            invoicePayment: {
              select: {
                method: true,
                externalReferenceId: true,
              },
            },
          },
        },
      },
    });

    if (!arrangement || arrangement.orgId !== orgId) {
      return { success: false, error: "Arrangement not found" };
    }

    return {
      success: true,
      data: {
        id: arrangement.id,
        orgId: arrangement.orgId,
        invoiceId: arrangement.invoice.id,
        invoiceNumber: arrangement.invoice.invoiceNumber,
        invoiceTotalAmount: arrangement.invoice.totalAmount,
        invoiceRemainingAmount: arrangement.invoice.remainingAmount,
        invoiceStatus: arrangement.invoice.status,
        customerName: arrangement.customer.name,
        customerEmail: arrangement.customer.email,
        totalArranged: arrangement.totalArranged,
        installmentCount: arrangement.installmentCount,
        status: arrangement.status,
        notes: arrangement.notes,
        createdByName: arrangement.creator.name,
        createdAt: arrangement.createdAt,
        installments: arrangement.installments.map((i) => ({
          id: i.id,
          installmentNumber: i.installmentNumber,
          dueDate: i.dueDate,
          amount: i.amount,
          status: i.status,
          paidAt: i.paidAt,
          paymentMethod: i.invoicePayment?.method ?? null,
          paymentReference: i.invoicePayment?.externalReferenceId ?? null,
        })),
      },
    };
  } catch (error) {
    console.error("getArrangementAction error:", error);
    return { success: false, error: "Failed to load arrangement" };
  }
}

// ─── 3. Create Arrangement ──────────────────────────────────────────────────

export async function createArrangementAction(data: {
  invoiceId: string;
  totalArranged: number;
  installmentCount: number;
  notes?: string;
  installments: Array<{ dueDate: string; amount: number }>;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    // Plan check
    const hasFeature = await checkFeature(orgId, "paymentArrangements");
    if (!hasFeature) {
      return {
        success: false,
        error: "Payment arrangements require the Starter plan or higher",
      };
    }

    // Fetch invoice to get customerId
    const invoice = await db.invoice.findUnique({
      where: { id: data.invoiceId },
      select: { customerId: true },
    });

    if (!invoice || !invoice.customerId) {
      return { success: false, error: "Invoice not found or has no customer" };
    }

    const arrangement = await createArrangement({
      orgId,
      invoiceId: data.invoiceId,
      customerId: invoice.customerId,
      totalArranged: data.totalArranged,
      installmentCount: data.installmentCount,
      notes: data.notes,
      createdBy: userId,
      installments: data.installments.map((i) => ({
        dueDate: new Date(i.dueDate),
        amount: i.amount,
      })),
    });

    revalidatePath(ARRANGEMENTS_PATH);
    return { success: true, data: { id: arrangement.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create arrangement";
    console.error("createArrangementAction error:", error);
    return { success: false, error: message };
  }
}

// ─── 4. Record Payment ──────────────────────────────────────────────────────

export async function recordPaymentAction(
  installmentId: string,
  data: { amount: number; paymentMethod: string; reference?: string },
): Promise<ActionResult<{ paymentId: string }>> {
  try {
    const { userId } = await requireRole("admin");

    const payment = await recordInstallmentPayment(installmentId, data, userId);

    revalidatePath(ARRANGEMENTS_PATH);
    return { success: true, data: { paymentId: payment.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record payment";
    console.error("recordPaymentAction error:", error);
    return { success: false, error: message };
  }
}

// ─── 5. Cancel Arrangement ──────────────────────────────────────────────────

export async function cancelArrangementAction(
  arrangementId: string,
  reason?: string,
): Promise<ActionResult<{ cancelled: boolean }>> {
  try {
    const { userId } = await requireRole("admin");

    await cancelArrangement(arrangementId, userId, reason);

    revalidatePath(ARRANGEMENTS_PATH);
    return { success: true, data: { cancelled: true } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel arrangement";
    console.error("cancelArrangementAction error:", error);
    return { success: false, error: message };
  }
}

// ─── 6. List Eligible Invoices (for create form) ────────────────────────────

export async function listEligibleInvoicesAction(): Promise<
  ActionResult<
    Array<{
      id: string;
      invoiceNumber: string;
      customerName: string;
      customerId: string;
      totalAmount: number;
      remainingAmount: number;
    }>
  >
> {
  try {
    const { orgId } = await requireOrgContext();

    const invoices = await db.invoice.findMany({
      where: {
        organizationId: orgId,
        remainingAmount: { gt: 0 },
        status: { notIn: ["DRAFT", "CANCELLED", "PAID"] },
        arrangement: null,
        archivedAt: null,
        customerId: { not: null },
      },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return {
      success: true,
      data: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name || "—",
        customerId: inv.customerId!,
        totalAmount: inv.totalAmount,
        remainingAmount: inv.remainingAmount,
      })),
    };
  } catch (error) {
    console.error("listEligibleInvoicesAction error:", error);
    return { success: false, error: "Failed to load invoices" };
  }
}
