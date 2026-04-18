"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import {
  StockTransferStatus,
  StockEventType,
  Prisma,
} from "@/generated/prisma/client";
import { recordStockEventTx } from "@/lib/inventory/stock-events";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateStockTransferData {
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string;
  lines: Array<{
    inventoryItemId: string;
    quantity: number;
  }>;
}

export interface StockTransferFilters {
  status?: StockTransferStatus;
  fromWarehouseId?: string;
  toWarehouseId?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function generateTransferNumber(): string {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRF-${yyyymm}-${rand}`;
}

// ─── 1. List ─────────────────────────────────────────────────────────────────

export async function listStockTransfers(
  filters: StockTransferFilters = {},
): Promise<ActionResult<Prisma.StockTransferGetPayload<{
  include: {
    lines: { include: { inventoryItem: { select: { id: true; name: true; sku: true } } } };
    fromWarehouse: { select: { id: true; name: true; code: true } };
    toWarehouse: { select: { id: true; name: true; code: true } };
  };
}>[]>> {
  try {
    const { orgId } = await requireOrgContext();

    const transfers = await db.stockTransfer.findMany({
      where: {
        orgId,
        ...(filters.status !== undefined && { status: filters.status }),
        ...(filters.fromWarehouseId !== undefined && { fromWarehouseId: filters.fromWarehouseId }),
        ...(filters.toWarehouseId !== undefined && { toWarehouseId: filters.toWarehouseId }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        lines: {
          include: {
            inventoryItem: { select: { id: true, name: true, sku: true } },
          },
        },
        fromWarehouse: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, code: true } },
      },
    });

    return { success: true, data: transfers };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 2. Create ───────────────────────────────────────────────────────────────

export async function createStockTransfer(
  data: CreateStockTransferData,
): Promise<ActionResult<{ id: string; transferNumber: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    if (data.fromWarehouseId === data.toWarehouseId) {
      return {
        success: false,
        error: "Source and destination warehouse must be different",
      };
    }

    if (!data.lines || data.lines.length === 0) {
      return { success: false, error: "At least one transfer line is required" };
    }

    const [fromWarehouse, toWarehouse] = await Promise.all([
      db.warehouse.findUnique({
        where: { id: data.fromWarehouseId },
        select: { id: true, orgId: true, isActive: true },
      }),
      db.warehouse.findUnique({
        where: { id: data.toWarehouseId },
        select: { id: true, orgId: true, isActive: true },
      }),
    ]);

    if (!fromWarehouse || fromWarehouse.orgId !== orgId) {
      return { success: false, error: "Source warehouse not found" };
    }

    if (!toWarehouse || toWarehouse.orgId !== orgId) {
      return { success: false, error: "Destination warehouse not found" };
    }

    if (!fromWarehouse.isActive) {
      return { success: false, error: "Source warehouse is inactive" };
    }

    if (!toWarehouse.isActive) {
      return { success: false, error: "Destination warehouse is inactive" };
    }

    const invalidLine = data.lines.find((l) => l.quantity <= 0);
    if (invalidLine) {
      return { success: false, error: "All transfer quantities must be greater than zero" };
    }

    const transfer = await db.stockTransfer.create({
      data: {
        orgId,
        transferNumber: generateTransferNumber(),
        fromWarehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        notes: data.notes,
        status: StockTransferStatus.DRAFT,
        initiatedByUserId: userId,
        lines: {
          create: data.lines.map((line) => ({
            inventoryItemId: line.inventoryItemId,
            quantity: line.quantity,
          })),
        },
      },
      select: { id: true, transferNumber: true },
    });

    return { success: true, data: transfer };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 3. Approve (DRAFT -> IN_TRANSIT) ────────────────────────────────────────

export async function approveStockTransfer(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const transfer = await db.stockTransfer.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!transfer || transfer.orgId !== orgId) {
      return { success: false, error: "Stock transfer not found" };
    }

    if (transfer.status !== StockTransferStatus.DRAFT) {
      return {
        success: false,
        error: `Cannot approve transfer in status "${transfer.status}". Must be DRAFT.`,
      };
    }

    await db.stockTransfer.update({
      where: { id },
      data: {
        status: StockTransferStatus.IN_TRANSIT,
        approvedByUserId: userId,
        approvedAt: new Date(),
      },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 4. Complete (IN_TRANSIT -> COMPLETED) ────────────────────────────────────

export async function completeStockTransfer(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const transfer = await db.stockTransfer.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!transfer || transfer.orgId !== orgId) {
      return { success: false, error: "Stock transfer not found" };
    }

    if (transfer.status !== StockTransferStatus.IN_TRANSIT) {
      return {
        success: false,
        error: `Cannot complete transfer in status "${transfer.status}". Must be IN_TRANSIT.`,
      };
    }

    await db.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        await recordStockEventTx(tx, {
          orgId,
          inventoryItemId: line.inventoryItemId,
          warehouseId: transfer.fromWarehouseId,
          eventType: StockEventType.TRANSFER_OUT,
          quantity: line.quantity,
          unitCost: 0,
          referenceType: "StockTransfer",
          referenceId: transfer.id,
          note: transfer.notes ?? undefined,
          createdByUserId: userId,
        });

        await recordStockEventTx(tx, {
          orgId,
          inventoryItemId: line.inventoryItemId,
          warehouseId: transfer.toWarehouseId,
          eventType: StockEventType.TRANSFER_IN,
          quantity: line.quantity,
          unitCost: 0,
          referenceType: "StockTransfer",
          referenceId: transfer.id,
          note: transfer.notes ?? undefined,
          createdByUserId: userId,
        });
      }

      await tx.stockTransfer.update({
        where: { id },
        data: {
          status: StockTransferStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 5. Cancel ───────────────────────────────────────────────────────────────

export async function cancelStockTransfer(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const transfer = await db.stockTransfer.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!transfer || transfer.orgId !== orgId) {
      return { success: false, error: "Stock transfer not found" };
    }

    if (transfer.status !== StockTransferStatus.DRAFT) {
      return {
        success: false,
        error: `Cannot cancel transfer in status "${transfer.status}". Only DRAFT transfers can be cancelled.`,
      };
    }

    await db.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.CANCELLED },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
