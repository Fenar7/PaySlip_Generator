"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { nextDocumentNumber } from "@/lib/docs";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { postSalarySlipAccrualTx, postSalarySlipPayoutTx } from "@/lib/accounting";

export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface SalaryComponentInput {
  label: string;
  amount: number;
  type: "earning" | "deduction";
}

export interface SalarySlipInput {
  employeeId?: string;
  month: number;
  year: number;
  formData: Record<string, unknown>;
  components: SalaryComponentInput[];
}

export async function saveSalarySlip(
  input: SalarySlipInput,
  status: "draft" | "released" = "draft"
): Promise<ActionResult<{ id: string; slipNumber: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();
    
    const slipNumber = await nextDocumentNumber(orgId, "salarySlip");
    
    const earnings = input.components
      .filter((c) => c.type === "earning")
      .reduce((sum, c) => sum + c.amount, 0);
    const deductions = input.components
      .filter((c) => c.type === "deduction")
      .reduce((sum, c) => sum + c.amount, 0);
    
    const salarySlip = await db.$transaction(async (tx) => {
      const created = await tx.salarySlip.create({
        data: {
          organizationId: orgId,
          employeeId: input.employeeId || null,
          slipNumber,
          month: input.month,
          year: input.year,
          status,
          formData: input.formData as Prisma.InputJsonValue,
          grossPay: earnings,
          netPay: earnings - deductions,
          components: {
            create: input.components.map((comp, index) => ({
              label: comp.label,
              amount: comp.amount,
              type: comp.type,
              sortOrder: index,
            })),
          },
        },
      });

      if (status === "released") {
        await postSalarySlipAccrualTx(tx, {
          orgId,
          salarySlipId: created.id,
          actorId: userId,
        });
      }

      return created;
    });
    
    revalidatePath("/app/docs/salary-slips");
    return { success: true, data: { id: salarySlip.id, slipNumber } };
  } catch (error) {
    console.error("saveSalarySlip error:", error);
    return { success: false, error: "Failed to save salary slip" };
  }
}

export async function updateSalarySlip(
  id: string,
  input: Partial<SalarySlipInput>
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireOrgContext();
    
    const existing = await db.salarySlip.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        grossPay: true,
        netPay: true,
        accountingStatus: true,
      },
    });
    
    if (!existing) {
      return { success: false, error: "Salary slip not found" };
    }
    
    if (existing.accountingStatus === "POSTED") {
      return { success: false, error: "Released salary slips cannot be edited. Create a new payout or a reversing entry instead." };
    }
    
    let grossPay = existing.grossPay;
    let netPay = existing.netPay;
    
    if (input.components) {
      const earnings = input.components
        .filter((c) => c.type === "earning")
        .reduce((sum, c) => sum + c.amount, 0);
      const deductions = input.components
        .filter((c) => c.type === "deduction")
        .reduce((sum, c) => sum + c.amount, 0);
      grossPay = earnings;
      netPay = earnings - deductions;
    }
    
    await db.salarySlip.update({
      where: { id },
      data: {
        employeeId: input.employeeId,
        month: input.month,
        year: input.year,
        formData: input.formData as Prisma.InputJsonValue | undefined,
        grossPay,
        netPay,
      },
    });
    
    if (input.components) {
      await db.salaryComponent.deleteMany({ where: { salarySlipId: id } });
      await db.salaryComponent.createMany({
        data: input.components.map((comp, index) => ({
          salarySlipId: id,
          label: comp.label,
          amount: comp.amount,
          type: comp.type,
          sortOrder: index,
        })),
      });
    }
    
    revalidatePath("/app/docs/salary-slips");
    revalidatePath(`/app/docs/salary-slips/${id}`);
    return { success: true, data: { id } };
  } catch (error) {
    console.error("updateSalarySlip error:", error);
    return { success: false, error: "Failed to update salary slip" };
  }
}

export async function releaseSalarySlip(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();
    
    await db.$transaction(async (tx) => {
      await tx.salarySlip.update({
        where: { id, organizationId: orgId },
        data: { status: "released" },
      });

      await postSalarySlipAccrualTx(tx, {
        orgId,
        salarySlipId: id,
        actorId: userId,
      });
    });
    
    revalidatePath("/app/docs/salary-slips");
    revalidatePath(`/app/docs/salary-slips/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("releaseSalarySlip error:", error);
    return { success: false, error: "Failed to release salary slip" };
  }
}

export async function payoutSalarySlip(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    await db.$transaction(async (tx) => {
      await postSalarySlipPayoutTx(tx, {
        orgId,
        salarySlipId: id,
        actorId: userId,
      });
    });

    revalidatePath("/app/docs/salary-slips");
    revalidatePath(`/app/docs/salary-slips/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("payoutSalarySlip error:", error);
    return { success: false, error: "Failed to post salary payout" };
  }
}

export async function archiveSalarySlip(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId } = await requireOrgContext();
    
    await db.salarySlip.update({
      where: { id, organizationId: orgId },
      data: { archivedAt: new Date() },
    });
    
    revalidatePath("/app/docs/salary-slips");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("archiveSalarySlip error:", error);
    return { success: false, error: "Failed to archive salary slip" };
  }
}

export async function duplicateSalarySlip(id: string): Promise<ActionResult<{ id: string; slipNumber: string }>> {
  try {
    const { orgId } = await requireOrgContext();
    
    const existing = await db.salarySlip.findFirst({
      where: { id, organizationId: orgId },
      include: { components: true },
    });
    
    if (!existing) {
      return { success: false, error: "Salary slip not found" };
    }
    
    const newNumber = await nextDocumentNumber(orgId, "salarySlip");
    const now = new Date();
    
    const duplicate = await db.salarySlip.create({
      data: {
        organizationId: orgId,
        employeeId: existing.employeeId,
        slipNumber: newNumber,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        status: "draft",
        formData: existing.formData as Prisma.InputJsonValue,
        grossPay: existing.grossPay,
        netPay: existing.netPay,
        components: {
          create: existing.components.map((comp) => ({
            label: comp.label,
            amount: comp.amount,
            type: comp.type,
            sortOrder: comp.sortOrder,
          })),
        },
      },
    });
    
    revalidatePath("/app/docs/salary-slips");
    return { success: true, data: { id: duplicate.id, slipNumber: newNumber } };
  } catch (error) {
    console.error("duplicateSalarySlip error:", error);
    return { success: false, error: "Failed to duplicate salary slip" };
  }
}

export async function getSalarySlip(id: string) {
  const { orgId } = await requireOrgContext();
  
  return db.salarySlip.findFirst({
    where: { id, organizationId: orgId, archivedAt: null },
    include: {
      components: { orderBy: { sortOrder: "asc" } },
      employee: true,
    },
  });
}

export async function listSalarySlips(params?: {
  status?: string;
  employeeId?: string;
  year?: number;
  month?: number;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { orgId } = await requireOrgContext();
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const skip = (page - 1) * limit;
  
  const where = {
    organizationId: orgId,
    archivedAt: null,
    ...(params?.status && { status: params.status }),
    ...(params?.employeeId && { employeeId: params.employeeId }),
    ...(params?.year && { year: params.year }),
    ...(params?.month && { month: params.month }),
    ...(params?.search && {
      OR: [
        { slipNumber: { contains: params.search, mode: "insensitive" as const } },
        { employee: { name: { contains: params.search, mode: "insensitive" as const } } },
      ],
    }),
  };
  
  const [salarySlips, total] = await Promise.all([
    db.salarySlip.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { employee: true },
    }),
    db.salarySlip.count({ where }),
  ]);
  
  return {
    salarySlips,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
