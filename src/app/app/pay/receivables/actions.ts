"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { formatIsoDate, toAccountingNumber } from "@/lib/accounting/utils";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type KPIData = {
  dueThisMonth: { count: number; total: number };
  overdue: { count: number; total: number };
  partiallyPaid: { count: number; total: number };
  paidThisMonth: { count: number; total: number };
};

export async function getReceivablesKPIs(): Promise<ActionResult<KPIData>> {
  try {
    const { orgId } = await requireOrgContext();
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const firstStr = firstOfMonth.toISOString().split("T")[0];
    const lastStr = lastOfMonth.toISOString().split("T")[0];

    const [dueThisMonth, overdue, partiallyPaid, paidThisMonth] = await Promise.all([
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          dueDate: { gte: firstStr, lte: lastStr },
          status: { notIn: ["DRAFT", "CANCELLED", "PAID"] },
          archivedAt: null,
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          status: "OVERDUE",
          archivedAt: null,
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          status: "PARTIALLY_PAID",
          archivedAt: null,
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      db.invoice.aggregate({
        where: {
          organizationId: orgId,
          status: "PAID",
          paidAt: { gte: firstOfMonth, lte: lastOfMonth },
          archivedAt: null,
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
    ]);

    const dueThisMonthTotal = toAccountingNumber(dueThisMonth._sum.totalAmount ?? 0);
    const overdueTotal = toAccountingNumber(overdue._sum.totalAmount ?? 0);
    const partiallyPaidTotal = toAccountingNumber(partiallyPaid._sum.totalAmount ?? 0);
    const paidThisMonthTotal = toAccountingNumber(paidThisMonth._sum.totalAmount ?? 0);

    return {
      success: true,
      data: {
        dueThisMonth: { count: dueThisMonth._count, total: dueThisMonthTotal },
        overdue: { count: overdue._count, total: overdueTotal },
        partiallyPaid: { count: partiallyPaid._count, total: partiallyPaidTotal },
        paidThisMonth: { count: paidThisMonth._count, total: paidThisMonthTotal },
      },
    };
  } catch (error) {
    console.error("getReceivablesKPIs error:", error);
    return { success: false, error: "Failed to load KPIs" };
  }
}

export async function listReceivables(params?: {
  status?: string;
  search?: string;
  page?: number;
}): Promise<
  ActionResult<{
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      customerName: string;
      totalAmount: number;
      dueDate: string | null;
      status: string;
      publicToken: string | null;
      amountPaid: number;
      remainingAmount: number;
      lastPaymentMethod: string | null;
      nextPaymentDate: string | null;
      paymentLinkStatus: string | null;
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

    const where: Record<string, unknown> = {
      organizationId: orgId,
      status: { notIn: ["DRAFT"] },
      archivedAt: null,
    };

    if (params?.status && params.status !== "ALL") {
      where.status = params.status;
    }

    if (params?.search) {
      where.OR = [
        { invoiceNumber: { contains: params.search, mode: "insensitive" } },
        { customer: { name: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          publicTokens: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { token: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.invoice.count({ where }),
    ]);

    return {
      success: true,
        data: {
          invoices: invoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customer?.name || "—",
            totalAmount: toAccountingNumber(inv.totalAmount),
            dueDate: inv.dueDate ? formatIsoDate(inv.dueDate) : null,
            status: inv.status,
            publicToken: inv.publicTokens[0]?.token ?? null,
            amountPaid: toAccountingNumber(inv.amountPaid),
            remainingAmount: toAccountingNumber(inv.remainingAmount),
            lastPaymentMethod: inv.lastPaymentMethod,
            nextPaymentDate: inv.paymentPromiseDate ? formatIsoDate(inv.paymentPromiseDate) : null,
            paymentLinkStatus: inv.paymentLinkStatus,
          })),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("listReceivables error:", error);
    return { success: false, error: "Failed to load receivables" };
  }
}
