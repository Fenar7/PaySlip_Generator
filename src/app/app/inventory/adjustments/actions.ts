"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import {
  StockAdjustmentStatus,
  StockAdjustmentReason,
  StockEventType,
  Prisma,
} from "@/generated/prisma/client";
import { recordStockEventTx } from "@/lib/inventory/stock-events";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateStockAdjustmentData {
  warehouseId: string;
  reason: StockAdjustmentReason;
  notes?: string;
  lines: Array<{
    inventoryItemId: string;
    quantityChange: number;
    unitCost?: number;
    reason?: string;
  }>;
}

export interface StockAdjustmentFilters {
  status?: StockAdjustmentStatus;
  warehouseId?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function generateAdjustmentNumber(): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ADJ-${yyyymm}-${rand}`;
}

// ─── 1. List ─────────────────────────────────────────────────────────────────

export async function listStockAdjustments(
  filters: StockAdjustmentFilters = {},
): Promise<ActionResult<Prisma.StockAdjustmentGetPayload<{
  include: {
    lines: { include: { inventoryItem: { select: { id: true; name: true; sku: true } } } };
    warehouse: { select: { id: true; name: true; code: true } };
  };
}>[]>> {
  try {
    const { orgId } = await requireOrgContext();

    const adjustments = await db.stockAdjustment.findMany({
      where: {
        orgId,
        ...(filters.status !== undefined && { status: filters.status }),
        ...(filters.warehouseId !== undefined && { warehouseId: filters.warehouseId }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        lines: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } },
          },
        },
        warehouse: { select: { id: true, name: true, code: true } },
      },
    });

    return { success: true, data: adjustments };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 2. Create ───────────────────────────────────────────────────────────────

export async function createStockAdjustment(
  data: CreateStockAdjustmentData,
): Promise<ActionResult<{ id: string; adjustmentNumber: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    if (!data.lines || data.lines.length === 0) {
      return { success: false, error: "At least one adjustment line is required" };
    }

    const warehouse = await db.warehouse.findUnique({
      where: { id: data.warehouseId },
      select: { id: true, orgId: true, isActive: true },
    });

    if (!warehouse || warehouse.orgId !== orgId) {
      return { success: false, error: "Warehouse not found" };
    }

    if (!warehouse.isActive) {
      return { success: false, error: "Cannot create adjustment for an inactive warehouse" };
    }

    const adjustment = await db.stockAdjustment.create({
      data: {
        orgId,
        adjustmentNumber: generateAdjustmentNumber(),
        warehouseId: data.warehouseId,
        reason: data.reason,
        notes: data.notes,
        status: StockAdjustmentStatus.DRAFT,
        createdByUserId: userId,
        lines: {
          create: data.lines.map((line) => ({
            inventoryItemId: line.inventoryItemId,
            quantityChange: line.quantityChange,
            unitCost: line.unitCost !== undefined
              ? new Prisma.Decimal(line.unitCost)
              : new Prisma.Decimal(0),
            reason: line.reason,
          })),
        },
      },
      select: { id: true, adjustmentNumber: true },
    });

    return { success: true, data: adjustment };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 3. Submit for Approval ───────────────────────────────────────────────────

export async function submitAdjustmentForApproval(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const adjustment = await db.stockAdjustment.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!adjustment || adjustment.orgId !== orgId) {
      return { success: false, error: "Stock adjustment not found" };
    }

    if (adjustment.status !== StockAdjustmentStatus.DRAFT) {
      return {
        success: false,
        error: `Cannot submit adjustment in status "${adjustment.status}". Must be DRAFT.`,
      };
    }

    await db.stockAdjustment.update({
      where: { id },
      data: { status: StockAdjustmentStatus.PENDING_APPROVAL },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 4. Approve ──────────────────────────────────────────────────────────────

export async function approveStockAdjustment(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const adjustment = await db.stockAdjustment.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!adjustment || adjustment.orgId !== orgId) {
      return { success: false, error: "Stock adjustment not found" };
    }

    if (adjustment.status !== StockAdjustmentStatus.PENDING_APPROVAL) {
      return {
        success: false,
        error: `Cannot approve adjustment in status "${adjustment.status}". Must be PENDING_APPROVAL.`,
      };
    }

    await db.stockAdjustment.update({
      where: { id },
      data: {
        status: StockAdjustmentStatus.APPROVED,
        approvedByUserId: userId,
        approvedAt: new Date(),
      },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 5. Post ─────────────────────────────────────────────────────────────────

export async function postStockAdjustment(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const adjustment = await db.stockAdjustment.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!adjustment || adjustment.orgId !== orgId) {
      return { success: false, error: "Stock adjustment not found" };
    }

    if (adjustment.status !== StockAdjustmentStatus.APPROVED) {
      return {
        success: false,
        error: `Cannot post adjustment in status "${adjustment.status}". Must be APPROVED.`,
      };
    }

    await db.$transaction(async (tx) => {
      for (const line of adjustment.lines) {
        const eventType =
          line.quantityChange >= 0
            ? StockEventType.ADJUSTMENT_IN
            : StockEventType.ADJUSTMENT_OUT;

        await recordStockEventTx(tx, {
          orgId,
          inventoryItemId: line.inventoryItemId,
          warehouseId: adjustment.warehouseId,
          eventType,
          quantity: Math.abs(line.quantityChange),
          unitCost: Number(line.unitCost),
          referenceType: "StockAdjustment",
          referenceId: adjustment.id,
          note: line.reason ?? adjustment.notes ?? undefined,
          createdByUserId: userId,
        });
      }

      await tx.stockAdjustment.update({
        where: { id },
        data: { status: StockAdjustmentStatus.POSTED },
      });
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 6. Cancel ───────────────────────────────────────────────────────────────

export async function cancelStockAdjustment(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const adjustment = await db.stockAdjustment.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!adjustment || adjustment.orgId !== orgId) {
      return { success: false, error: "Stock adjustment not found" };
    }

    const cancellable: StockAdjustmentStatus[] = [
      StockAdjustmentStatus.DRAFT,
      StockAdjustmentStatus.PENDING_APPROVAL,
    ];

    if (!cancellable.includes(adjustment.status)) {
      return {
        success: false,
        error: `Cannot cancel adjustment in status "${adjustment.status}". Must be DRAFT or PENDING_APPROVAL.`,
      };
    }

    await db.stockAdjustment.update({
      where: { id },
      data: { status: StockAdjustmentStatus.CANCELLED },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
