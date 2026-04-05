"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateNextRunAt } from "@/lib/cron";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function listRecurringRules(params?: {
  status?: string;
  page?: number;
}) {
  const { orgId } = await requireOrgContext();
  const page = params?.page ?? 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    orgId,
    ...(params?.status
      ? { status: params.status as "ACTIVE" | "PAUSED" | "COMPLETED" }
      : {}),
  };

  const [rules, total] = await Promise.all([
    db.recurringInvoiceRule.findMany({
      where,
      include: {
        baseInvoice: {
          select: { id: true, invoiceNumber: true, customerId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.recurringInvoiceRule.count({ where }),
  ]);

  return {
    rules,
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}

export async function createRecurringRule(data: {
  baseInvoiceId: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  autoSend: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireOrgContext();

    const invoice = await db.invoice.findFirst({
      where: { id: data.baseInvoiceId, organizationId: orgId },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    const existing = await db.recurringInvoiceRule.findUnique({
      where: { baseInvoiceId: data.baseInvoiceId },
    });

    if (existing) {
      return {
        success: false,
        error: "A recurring rule already exists for this invoice",
      };
    }

    const rule = await db.recurringInvoiceRule.create({
      data: {
        orgId,
        baseInvoiceId: data.baseInvoiceId,
        frequency: data.frequency as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
        nextRunAt: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        autoSend: data.autoSend,
      },
    });

    revalidatePath("/app/pay/recurring");
    return { success: true, data: { id: rule.id } };
  } catch (error) {
    console.error("createRecurringRule error:", error);
    return { success: false, error: "Failed to create recurring rule" };
  }
}

export async function pauseRecurringRule(
  ruleId: string
): Promise<ActionResult<void>> {
  try {
    const { orgId } = await requireOrgContext();

    const rule = await db.recurringInvoiceRule.findFirst({
      where: { id: ruleId, orgId },
    });

    if (!rule) {
      return { success: false, error: "Rule not found" };
    }

    await db.recurringInvoiceRule.update({
      where: { id: ruleId },
      data: { status: "PAUSED" },
    });

    revalidatePath("/app/pay/recurring");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("pauseRecurringRule error:", error);
    return { success: false, error: "Failed to pause rule" };
  }
}

export async function resumeRecurringRule(
  ruleId: string
): Promise<ActionResult<void>> {
  try {
    const { orgId } = await requireOrgContext();

    const rule = await db.recurringInvoiceRule.findFirst({
      where: { id: ruleId, orgId },
    });

    if (!rule) {
      return { success: false, error: "Rule not found" };
    }

    let nextRunAt = rule.nextRunAt;
    if (nextRunAt < new Date()) {
      nextRunAt = calculateNextRunAt(new Date(), rule.frequency);
    }

    await db.recurringInvoiceRule.update({
      where: { id: ruleId },
      data: { status: "ACTIVE", nextRunAt },
    });

    revalidatePath("/app/pay/recurring");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("resumeRecurringRule error:", error);
    return { success: false, error: "Failed to resume rule" };
  }
}

export async function deleteRecurringRule(
  ruleId: string
): Promise<ActionResult<void>> {
  try {
    const { orgId } = await requireOrgContext();

    const rule = await db.recurringInvoiceRule.findFirst({
      where: { id: ruleId, orgId },
    });

    if (!rule) {
      return { success: false, error: "Rule not found" };
    }

    await db.recurringInvoiceRule.update({
      where: { id: ruleId },
      data: { status: "COMPLETED" },
    });

    revalidatePath("/app/pay/recurring");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteRecurringRule error:", error);
    return { success: false, error: "Failed to delete rule" };
  }
}

export async function listInvoicesForSelect() {
  const { orgId } = await requireOrgContext();
  return db.invoice.findMany({
    where: {
      organizationId: orgId,
      archivedAt: null,
      recurringRule: null,
    },
    select: { id: true, invoiceNumber: true, totalAmount: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
