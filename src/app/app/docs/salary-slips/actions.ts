"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { nextDocumentNumber } from "@/lib/docs";
import { getSchemaDriftActionMessage, isSchemaDriftError } from "@/lib/prisma-errors";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { postSalarySlipAccrualTx, postSalarySlipPayoutTx } from "@/lib/accounting";
import { emitSalarySlipEvent } from "@/lib/document-events";
import { syncSalarySlipToIndex } from "@/lib/docs-vault";
import { checkUsageLimit } from "@/lib/usage-metering";
import { fromMinorUnits, normalizeMoney, sumMinorUnits } from "@/lib/money";

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

function normalizeSalaryComponents(
  components: SalaryComponentInput[],
  { allowPartial = false }: { allowPartial?: boolean } = {}
): { components: SalaryComponentInput[]; grossPay: number; netPay: number } {
  const normalizedComponents = components.map((component) => {
    const label = component.label.trim();
    const amount = normalizeMoney(component.amount);

    return {
      ...component,
      label,
      amount,
    };
  });

  if (allowPartial) {
    const draftComponents = normalizedComponents.filter(
      (component) => component.label.length > 0 && component.amount > 0
    );
    const grossPay = fromMinorUnits(
      sumMinorUnits(
        draftComponents
          .filter((component) => component.type === "earning")
          .map((component) => component.amount),
      ),
    );
    const totalDeductions = fromMinorUnits(
      sumMinorUnits(
        draftComponents
          .filter((component) => component.type === "deduction")
          .map((component) => component.amount),
      ),
    );

    return {
      components: draftComponents,
      grossPay,
      netPay: normalizeMoney(Math.max(grossPay - totalDeductions, 0)),
    };
  }

  if (normalizedComponents.length === 0) {
    throw new Error("Salary slips need at least one earning component.");
  }

  for (const component of normalizedComponents) {
    if (!component.label) {
      throw new Error("Salary component labels are required.");
    }

    if (component.amount < 0) {
      throw new Error("Salary component amounts cannot be negative.");
    }
  }

  const grossPay = fromMinorUnits(
    sumMinorUnits(
      normalizedComponents
        .filter((component) => component.type === "earning")
        .map((component) => component.amount),
    ),
  );
  const totalDeductions = fromMinorUnits(
    sumMinorUnits(
      normalizedComponents
        .filter((component) => component.type === "deduction")
        .map((component) => component.amount),
    ),
  );
  const netPay = normalizeMoney(grossPay - totalDeductions);

  if (grossPay <= 0) {
    throw new Error("Salary slips need at least one earning component.");
  }

  if (netPay < 0) {
    throw new Error("Net pay cannot be negative. Adjust deductions.");
  }

  return { components: normalizedComponents, grossPay, netPay };
}

async function syncSalarySlipRecordToIndex(orgId: string, slipId: string): Promise<void> {
  const salarySlip = await db.salarySlip.findFirst({
    where: { id: slipId, organizationId: orgId },
    include: { employee: true },
  });

  if (!salarySlip) {
    return;
  }

  await syncSalarySlipToIndex(orgId, {
    id: salarySlip.id,
    slipNumber: salarySlip.slipNumber,
    status: salarySlip.status,
    month: salarySlip.month,
    year: salarySlip.year,
    netPay: salarySlip.netPay,
    archivedAt: salarySlip.archivedAt,
    employee: salarySlip.employee ?? undefined,
  });
}

export async function saveSalarySlip(
  input: SalarySlipInput,
  status: "draft" | "released" = "draft"
): Promise<ActionResult<{ id: string; slipNumber: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const limitCheck = await checkUsageLimit(orgId, "SALARY_SLIP");
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `Salary slip limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to create more salary slips.`,
      };
    }
    
    const slipNumber = await nextDocumentNumber(orgId, "salarySlip");
    
    const normalizedSalary = normalizeSalaryComponents(input.components, {
      allowPartial: status === "draft",
    });
    
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
          grossPay: normalizedSalary.grossPay,
          netPay: normalizedSalary.netPay,
          ...(normalizedSalary.components.length > 0
            ? {
                components: {
                  create: normalizedSalary.components.map((comp, index) => ({
                    label: comp.label,
                    amount: comp.amount,
                    type: comp.type,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
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
    
    // Phase 19.2: emit normalized document event
    await emitSalarySlipEvent(orgId, salarySlip.id, status === "released" ? "released" : "created", {
      actorId: userId,
      metadata: { slipNumber },
    });

    // Phase 19.1: Sync to DocumentIndex
    await syncSalarySlipRecordToIndex(orgId, salarySlip.id);

    revalidatePath("/app/docs/salary-slips");
    return { success: true, data: { id: salarySlip.id, slipNumber } };
  } catch (error) {
    if (isSchemaDriftError(error, "SalarySlip")) {
      console.warn(
        "saveSalarySlip failed because the local database schema is behind the Prisma schema.",
      );
      return {
        success: false,
        error: getSchemaDriftActionMessage("save the salary slip"),
      };
    }
    console.error("saveSalarySlip error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to save salary slip" };
  }
}

export async function updateSalarySlip(
  id: string,
  input: Partial<SalarySlipInput>
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();
    
    const existing = await db.salarySlip.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        grossPay: true,
        netPay: true,
        status: true,
        accountingStatus: true,
      },
    });
    
    if (!existing) {
      return { success: false, error: "Salary slip not found" };
    }
    
    if (existing.accountingStatus === "POSTED" || existing.status === "released") {
      return {
        success: false,
        error: "Released salary slips are immutable. Create a corrective payout entry instead.",
      };
    }
    
    const normalizedSalary = input.components
      ? normalizeSalaryComponents(input.components, {
          allowPartial: existing.status === "draft",
        })
      : null;

    await db.$transaction(async (tx) => {
      await tx.salarySlip.update({
        where: { id },
        data: {
          employeeId: input.employeeId,
          month: input.month,
          year: input.year,
          formData: input.formData as Prisma.InputJsonValue | undefined,
          grossPay: normalizedSalary?.grossPay ?? existing.grossPay,
          netPay: normalizedSalary?.netPay ?? existing.netPay,
        },
      });

      if (normalizedSalary) {
        await tx.salaryComponent.deleteMany({ where: { salarySlipId: id } });
        if (normalizedSalary.components.length > 0) {
          await tx.salaryComponent.createMany({
            data: normalizedSalary.components.map((comp, index) => ({
              salarySlipId: id,
              label: comp.label,
              amount: comp.amount,
              type: comp.type,
              sortOrder: index,
            })),
          });
        }
      }
    });
    
    await emitSalarySlipEvent(orgId, id, "updated", { actorId: userId });
    await syncSalarySlipRecordToIndex(orgId, id);

    revalidatePath("/app/docs/salary-slips");
    revalidatePath(`/app/docs/salary-slips/${id}`);
    return { success: true, data: { id } };
  } catch (error) {
    if (isSchemaDriftError(error, "SalarySlip")) {
      console.warn(
        "updateSalarySlip failed because the local database schema is behind the Prisma schema.",
      );
      return {
        success: false,
        error: getSchemaDriftActionMessage("update the salary slip"),
      };
    }
    console.error("updateSalarySlip error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update salary slip" };
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
    
    // Phase 19.2: emit normalized document event
    await emitSalarySlipEvent(orgId, id, "released", { actorId: userId });
    await syncSalarySlipRecordToIndex(orgId, id);

    revalidatePath("/app/docs/salary-slips");
    revalidatePath(`/app/docs/salary-slips/${id}`);
    return { success: true, data: undefined };
  } catch (error) {
    if (isSchemaDriftError(error, "SalarySlip")) {
      console.warn(
        "releaseSalarySlip failed because the local database schema is behind the Prisma schema.",
      );
      return {
        success: false,
        error: getSchemaDriftActionMessage("release the salary slip"),
      };
    }
    console.error("releaseSalarySlip error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to release salary slip" };
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

    // Phase 19.2: emit normalized document event
    await emitSalarySlipEvent(orgId, id, "paid", { actorId: userId });
    await syncSalarySlipRecordToIndex(orgId, id);

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
    const { orgId, userId } = await requireOrgContext();
    
    await db.salarySlip.update({
      where: { id, organizationId: orgId },
      data: { archivedAt: new Date() },
    });

    // Phase 19.2: emit normalized document event
    await emitSalarySlipEvent(orgId, id, "archived", { actorId: userId });
    await syncSalarySlipRecordToIndex(orgId, id);

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

    const limitCheck = await checkUsageLimit(orgId, "SALARY_SLIP");
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `Salary slip limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to create more salary slips.`,
      };
    }
    
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
    
    // Phase 19.2: emit normalized document events
    void emitSalarySlipEvent(orgId, duplicate.id, "created", {
      metadata: { duplicatedFrom: id, slipNumber: newNumber },
    });
    void emitSalarySlipEvent(orgId, id, "duplicated", {
      metadata: { newSlipId: duplicate.id, newSlipNumber: newNumber },
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
