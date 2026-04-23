"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { nextDocumentNumber } from "@/lib/docs";
import { getSchemaDriftActionMessage, isSchemaDriftError } from "@/lib/prisma-errors";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { postVoucherTx } from "@/lib/accounting";
import { emitVoucherEvent } from "@/lib/document-events";
import { syncVoucherToIndex } from "@/lib/docs-vault";
import { checkUsageLimit } from "@/lib/usage-metering";
import { fromMinorUnits, normalizeMoney, sumMinorUnits } from "@/lib/money";

export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export interface VoucherLineInput {
  description: string;
  date?: string;
  time?: string;
  amount: number;
  category?: string;
}

export interface VoucherInput {
  vendorId?: string;
  voucherDate: string;
  type: "payment" | "receipt";
  isMultiLine?: boolean;
  status?: "draft" | "approved";
  formData: Record<string, unknown>;
  lines: VoucherLineInput[];
}

function normalizeVoucherLines(lines: VoucherLineInput[]): { lines: VoucherLineInput[]; totalAmount: number } {
  if (lines.length === 0) {
    throw new Error("Vouchers need at least one line item.");
  }

  const normalizedLines = lines.map((line) => {
    const description = line.description.trim();
    const amount = normalizeMoney(line.amount);

    if (!description) {
      throw new Error("Voucher line descriptions are required.");
    }

    if (amount <= 0) {
      throw new Error("Voucher line amounts must be greater than zero.");
    }

    return {
      ...line,
      description,
      amount,
      category: line.category?.trim() || undefined,
      date: line.date || undefined,
      time: line.time || undefined,
    };
  });

  return {
    lines: normalizedLines,
    totalAmount: fromMinorUnits(sumMinorUnits(normalizedLines.map((line) => line.amount))),
  };
}

async function syncVoucherRecordToIndex(orgId: string, voucherId: string): Promise<void> {
  const voucher = await db.voucher.findFirst({
    where: { id: voucherId, organizationId: orgId },
    include: { vendor: true },
  });

  if (!voucher) {
    return;
  }

  await syncVoucherToIndex(orgId, {
    id: voucher.id,
    voucherNumber: voucher.voucherNumber,
    status: voucher.status,
    voucherDate: voucher.voucherDate,
    totalAmount: voucher.totalAmount,
    type: voucher.type,
    archivedAt: voucher.archivedAt,
    vendor: voucher.vendor ?? undefined,
  });
}

export async function saveVoucher(
  input: VoucherInput,
  status: "draft" | "approved" = "draft"
): Promise<ActionResult<{ id: string; voucherNumber: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();

    const limitCheck = await checkUsageLimit(orgId, "VOUCHER");
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `Voucher limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to create more vouchers.`,
      };
    }
    
    const voucherNumber = await nextDocumentNumber(orgId, "voucher");
    
    const normalizedVoucher = normalizeVoucherLines(input.lines);
    
    const voucher = await db.$transaction(async (tx) => {
      const created = await tx.voucher.create({
        data: {
          organizationId: orgId,
          vendorId: input.vendorId || null,
          voucherNumber,
          voucherDate: input.voucherDate,
          type: input.type,
          status,
          isMultiLine: input.isMultiLine ?? false,
          formData: input.formData as Prisma.InputJsonValue,
          totalAmount: normalizedVoucher.totalAmount,
          lines: {
            create: normalizedVoucher.lines.map((line, index) => ({
              description: line.description,
              date: line.date || null,
              time: line.time || null,
              amount: line.amount,
              category: line.category || null,
              sortOrder: index,
            })),
          },
        },
      });

      if (status === "approved") {
        await postVoucherTx(tx, {
          orgId,
          voucherId: created.id,
          actorId: userId,
        });
      }

      return created;
    });
    
    // Phase 19.2: emit normalized document event
    await emitVoucherEvent(orgId, voucher.id, status === "approved" ? "approved" : "created", {
      actorId: userId,
      metadata: { voucherNumber },
    });

    // Sprint 25.1: fire voucher.created workflow trigger
    const { fireWorkflowTrigger } = await import("@/lib/flow/workflow-engine");
    void fireWorkflowTrigger({
      triggerType: "voucher.created",
      orgId,
      sourceModule: "vouchers",
      sourceEntityType: "Voucher",
      sourceEntityId: voucher.id,
      actorId: userId,
      payload: { voucherNumber, status, totalAmount: voucher.totalAmount, type: voucher.type },
    });

    // Phase 19.1: Sync to DocumentIndex
    await syncVoucherRecordToIndex(orgId, voucher.id);

    revalidatePath("/app/docs/vouchers");
    return { success: true, data: { id: voucher.id, voucherNumber } };
  } catch (error) {
    if (isSchemaDriftError(error, "Voucher")) {
      console.warn(
        "saveVoucher failed because the local database schema is behind the Prisma schema.",
      );
      return {
        success: false,
        error: getSchemaDriftActionMessage("save the voucher"),
      };
    }
    console.error("saveVoucher error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to save voucher" };
  }
}

export async function updateVoucher(
  id: string,
  input: Partial<VoucherInput>
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireOrgContext();
    
    const existing = await db.voucher.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true,
        status: true,
        accountingStatus: true,
        totalAmount: true,
      },
    });
    
    if (!existing) {
      return { success: false, error: "Voucher not found" };
    }

    if (existing.accountingStatus === "POSTED") {
      return { success: false, error: "Posted vouchers cannot be edited. Reverse and recreate instead." };
    }
    
    const normalizedVoucher = input.lines ? normalizeVoucherLines(input.lines) : null;

    await db.$transaction(async (tx) => {
      await tx.voucher.update({
        where: { id },
        data: {
          vendorId: input.vendorId,
          voucherDate: input.voucherDate,
          type: input.type,
          isMultiLine: input.isMultiLine,
          ...(input.status && { status: input.status }),
          formData: input.formData as Prisma.InputJsonValue | undefined,
          totalAmount: normalizedVoucher?.totalAmount ?? existing.totalAmount,
        },
      });

      if (normalizedVoucher) {
        await tx.voucherLine.deleteMany({ where: { voucherId: id } });
        await tx.voucherLine.createMany({
          data: normalizedVoucher.lines.map((line, index) => ({
            voucherId: id,
            description: line.description,
            date: line.date || null,
            time: line.time || null,
            amount: line.amount,
            category: line.category || null,
            sortOrder: index,
          })),
        });
      }

      const nextStatus = input.status ?? existing.status;
      if (nextStatus === "approved") {
        await postVoucherTx(tx, {
          orgId,
          voucherId: id,
          actorId: userId,
        });
      }
    });
    
    // Phase 19.2: emit normalized document event
    await emitVoucherEvent(orgId, id, "updated", { actorId: userId });
    await syncVoucherRecordToIndex(orgId, id);

    revalidatePath("/app/docs/vouchers");
    revalidatePath(`/app/docs/vouchers/${id}`);
    return { success: true, data: { id } };
  } catch (error) {
    if (isSchemaDriftError(error, "Voucher")) {
      console.warn(
        "updateVoucher failed because the local database schema is behind the Prisma schema.",
      );
      return {
        success: false,
        error: getSchemaDriftActionMessage("update the voucher"),
      };
    }
    console.error("updateVoucher error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update voucher" };
  }
}

export async function archiveVoucher(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId, userId } = await requireOrgContext();
    
    await db.voucher.update({
      where: { id, organizationId: orgId },
      data: { archivedAt: new Date() },
    });

    // Phase 19.2: emit normalized document event
    await emitVoucherEvent(orgId, id, "archived", { actorId: userId });
    await syncVoucherRecordToIndex(orgId, id);

    revalidatePath("/app/docs/vouchers");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("archiveVoucher error:", error);
    return { success: false, error: "Failed to archive voucher" };
  }
}

export async function duplicateVoucher(id: string): Promise<ActionResult<{ id: string; voucherNumber: string }>> {
  try {
    const { orgId } = await requireOrgContext();

    const limitCheck = await checkUsageLimit(orgId, "VOUCHER");
    if (!limitCheck.allowed) {
      return {
        success: false,
        error: `Voucher limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan to create more vouchers.`,
      };
    }
    
    const existing = await db.voucher.findFirst({
      where: { id, organizationId: orgId },
      include: { lines: true },
    });
    
    if (!existing) {
      return { success: false, error: "Voucher not found" };
    }
    
    const newNumber = await nextDocumentNumber(orgId, "voucher");
    
    const duplicate = await db.voucher.create({
      data: {
        organizationId: orgId,
        vendorId: existing.vendorId,
        voucherNumber: newNumber,
        voucherDate: new Date().toISOString().split("T")[0],
        type: existing.type,
        status: "draft",
        isMultiLine: existing.isMultiLine,
        formData: existing.formData as Prisma.InputJsonValue,
        totalAmount: existing.totalAmount,
        lines: {
          create: existing.lines.map((line) => ({
            description: line.description,
            date: line.date,
            time: line.time,
            amount: line.amount,
            category: line.category,
            sortOrder: line.sortOrder,
          })),
        },
      },
    });
    
    // Phase 19.2: emit normalized document events
    void emitVoucherEvent(orgId, duplicate.id, "created", {
      metadata: { duplicatedFrom: id, voucherNumber: newNumber },
    });
    void emitVoucherEvent(orgId, id, "duplicated", {
      metadata: { newVoucherId: duplicate.id, newVoucherNumber: newNumber },
    });

    revalidatePath("/app/docs/vouchers");
    return { success: true, data: { id: duplicate.id, voucherNumber: newNumber } };
  } catch (error) {
    console.error("duplicateVoucher error:", error);
    return { success: false, error: "Failed to duplicate voucher" };
  }
}

export async function getVoucher(id: string) {
  const { orgId } = await requireOrgContext();
  
  return db.voucher.findFirst({
    where: { id, organizationId: orgId, archivedAt: null },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      vendor: true,
    },
  });
}

export async function listVouchers(params?: {
  type?: "payment" | "receipt";
  status?: string;
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
    ...(params?.type && { type: params.type }),
    ...(params?.status && { status: params.status }),
    ...(params?.search && {
      OR: [
        { voucherNumber: { contains: params.search, mode: "insensitive" as const } },
        { vendor: { name: { contains: params.search, mode: "insensitive" as const } } },
      ],
    }),
  };
  
  const [vouchers, total] = await Promise.all([
    db.voucher.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { vendor: true },
    }),
    db.voucher.count({ where }),
  ]);
  
  return {
    vouchers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
