"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { nextDocumentNumber } from "@/lib/docs";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { postVoucherTx } from "@/lib/accounting";
import { emitVoucherEvent } from "@/lib/document-events";
import { syncVoucherToIndex } from "@/lib/docs-vault";
import { checkUsageLimit } from "@/lib/usage-metering";

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
    
    const totalAmount = input.lines.reduce((sum, line) => sum + line.amount, 0);
    
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
          totalAmount,
          lines: {
            create: input.lines.map((line, index) => ({
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
    void emitVoucherEvent(orgId, voucher.id, status === "approved" ? "approved" : "created", {
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
    void syncVoucherToIndex(orgId, {
      id: voucher.id,
      voucherNumber,
      status,
      voucherDate: input.voucherDate,
      totalAmount: voucher.totalAmount,
      type: voucher.type,
      archivedAt: null,
    });

    revalidatePath("/app/docs/vouchers");
    return { success: true, data: { id: voucher.id, voucherNumber } };
  } catch (error) {
    console.error("saveVoucher error:", error);
    return { success: false, error: "Failed to save voucher" };
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
    
    let totalAmount = existing.totalAmount;
    if (input.lines) {
      totalAmount = input.lines.reduce((sum, line) => sum + line.amount, 0);
    }

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
          totalAmount,
        },
      });

      if (input.lines) {
        await tx.voucherLine.deleteMany({ where: { voucherId: id } });
        await tx.voucherLine.createMany({
          data: input.lines.map((line, index) => ({
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
    void emitVoucherEvent(orgId, id, "updated", { actorId: userId });

    // Phase 19.1: Sync updated voucher to DocumentIndex
    const updated = await db.voucher.findUnique({
      where: { id },
      include: { vendor: true },
    });
    if (updated) {
      void syncVoucherToIndex(orgId, {
        id: updated.id,
        voucherNumber: updated.voucherNumber,
        status: updated.status,
        voucherDate: updated.voucherDate,
        totalAmount: updated.totalAmount,
        type: updated.type,
        archivedAt: updated.archivedAt,
        vendor: updated.vendor ?? undefined,
      });
    }

    revalidatePath("/app/docs/vouchers");
    revalidatePath(`/app/docs/vouchers/${id}`);
    return { success: true, data: { id } };
  } catch (error) {
    console.error("updateVoucher error:", error);
    return { success: false, error: "Failed to update voucher" };
  }
}

export async function archiveVoucher(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId } = await requireOrgContext();
    
    await db.voucher.update({
      where: { id, organizationId: orgId },
      data: { archivedAt: new Date() },
    });

    // Phase 19.2: emit normalized document event
    void emitVoucherEvent(orgId, id, "archived");

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
