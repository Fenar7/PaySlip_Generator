"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { nextDocumentNumberTx } from "@/lib/docs/numbering";
import { recordStockEventTx } from "@/lib/inventory/stock-events";
import {
  GrnStatus,
  PurchaseOrderStatus,
  StockEventType,
  Prisma,
} from "@/generated/prisma/client";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateGrnLineData {
  poLineId: string;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
}

export interface CreateGoodsReceiptData {
  purchaseOrderId: string;
  receiptDate: string;
  warehouseId: string;
  notes?: string;
  inspectionNotes?: string;
  lines: CreateGrnLineData[];
}

export interface GoodsReceiptFilters {
  status?: GrnStatus;
  purchaseOrderId?: string;
}

// ─── 1. List ─────────────────────────────────────────────────────────────────

export async function listGoodsReceipts(
  filters: GoodsReceiptFilters = {},
): Promise<ActionResult<Array<{
  id: string;
  grnNumber: string;
  receiptDate: string;
  status: GrnStatus;
  createdAt: Date;
  purchaseOrder: { id: string; poNumber: string; vendor: { id: string; name: string } };
  warehouse: { id: string; name: string; code: string };
  _count: { lines: number };
}>>> {
  try {
    const { orgId } = await requireOrgContext();

    const receipts = await db.goodsReceiptNote.findMany({
      where: {
        orgId,
        ...(filters.status !== undefined && { status: filters.status }),
        ...(filters.purchaseOrderId !== undefined && {
          purchaseOrderId: filters.purchaseOrderId,
        }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        grnNumber: true,
        receiptDate: true,
        status: true,
        createdAt: true,
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            vendor: { select: { id: true, name: true } },
          },
        },
        warehouse: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true } },
      },
    });

    return { success: true, data: receipts };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 2. Create GRN ───────────────────────────────────────────────────────────

export async function createGoodsReceiptNote(
  data: CreateGoodsReceiptData,
): Promise<ActionResult<{ id: string; grnNumber: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    if (!data.lines || data.lines.length === 0) {
      return { success: false, error: "At least one GRN line is required" };
    }

    const po = await db.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId },
      include: { lines: true },
    });

    if (!po || po.orgId !== orgId) {
      return { success: false, error: "Purchase order not found" };
    }

    const receivablePOStatuses: PurchaseOrderStatus[] = [
      PurchaseOrderStatus.APPROVED,
      PurchaseOrderStatus.PARTIALLY_RECEIVED,
    ];

    if (!receivablePOStatuses.includes(po.status)) {
      return {
        success: false,
        error: `Cannot create GRN for purchase order in status "${po.status}". Must be APPROVED or PARTIALLY_RECEIVED.`,
      };
    }

    const warehouse = await db.warehouse.findUnique({
      where: { id: data.warehouseId },
      select: { id: true, orgId: true, isActive: true },
    });

    if (!warehouse || warehouse.orgId !== orgId) {
      return { success: false, error: "Warehouse not found" };
    }

    if (!warehouse.isActive) {
      return { success: false, error: "Cannot receive goods into an inactive warehouse" };
    }

    const poLineMap = new Map(po.lines.map((l) => [l.id, l]));

    for (const line of data.lines) {
      if (!poLineMap.has(line.poLineId)) {
        return {
          success: false,
          error: `PO line "${line.poLineId}" does not belong to purchase order "${po.poNumber}"`,
        };
      }
      if (line.receivedQty < 0 || line.acceptedQty < 0 || line.rejectedQty < 0) {
        return { success: false, error: "Quantities cannot be negative" };
      }
      if (line.acceptedQty + line.rejectedQty > line.receivedQty) {
        return {
          success: false,
          error: "Accepted + rejected quantities cannot exceed received quantity",
        };
      }
    }

    const grn = await db.$transaction(async (tx) => {
      const grnNumber = await nextDocumentNumberTx(tx, orgId, "grn");

      const created = await tx.goodsReceiptNote.create({
        data: {
          orgId,
          purchaseOrderId: data.purchaseOrderId,
          grnNumber,
          receiptDate: data.receiptDate,
          warehouseId: data.warehouseId,
          status: GrnStatus.DRAFT,
          notes: data.notes,
          inspectionNotes: data.inspectionNotes,
          receivedByUserId: userId,
          lines: {
            create: data.lines.map((line) => ({
              poLineId: line.poLineId,
              receivedQty: new Prisma.Decimal(line.receivedQty),
              acceptedQty: new Prisma.Decimal(line.acceptedQty),
              rejectedQty: new Prisma.Decimal(line.rejectedQty),
              rejectionReason: line.rejectionReason,
            })),
          },
        },
        select: { id: true, grnNumber: true },
      });

      for (const line of data.lines) {
        if (line.acceptedQty <= 0) continue;

        const poLine = poLineMap.get(line.poLineId)!;
        const inventoryItemId = poLine.inventoryItemId;
        if (!inventoryItemId) continue;

        await recordStockEventTx(tx, {
          orgId,
          inventoryItemId,
          warehouseId: data.warehouseId,
          eventType: StockEventType.PURCHASE_RECEIPT,
          quantity: line.acceptedQty,
          unitCost: Number(poLine.unitPrice),
          referenceType: "GoodsReceiptNote",
          referenceId: created.id,
          note: data.notes ?? undefined,
          createdByUserId: userId,
        });

        await tx.purchaseOrderLine.update({
          where: { id: line.poLineId },
          data: {
            receivedQty: {
              increment: new Prisma.Decimal(line.acceptedQty),
            },
          },
        });
      }

      const updatedLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: data.purchaseOrderId },
        select: { quantity: true, receivedQty: true },
      });

      const allFullyReceived = updatedLines.every((l) =>
        new Prisma.Decimal(l.receivedQty).greaterThanOrEqualTo(l.quantity),
      );

      await tx.purchaseOrder.update({
        where: { id: data.purchaseOrderId },
        data: {
          status: allFullyReceived
            ? PurchaseOrderStatus.FULLY_RECEIVED
            : PurchaseOrderStatus.PARTIALLY_RECEIVED,
        },
      });

      return created;
    });

    return { success: true, data: grn };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 3. Confirm GRN ──────────────────────────────────────────────────────────

export async function confirmGoodsReceipt(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const grn = await db.goodsReceiptNote.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!grn || grn.orgId !== orgId) {
      return { success: false, error: "Goods receipt note not found" };
    }

    if (grn.status !== GrnStatus.DRAFT) {
      return {
        success: false,
        error: `Cannot confirm GRN in status "${grn.status}". Must be DRAFT.`,
      };
    }

    await db.goodsReceiptNote.update({
      where: { id },
      data: { status: GrnStatus.CONFIRMED },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 4. Cancel GRN ───────────────────────────────────────────────────────────

export async function cancelGoodsReceipt(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const grn = await db.goodsReceiptNote.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!grn || grn.orgId !== orgId) {
      return { success: false, error: "Goods receipt note not found" };
    }

    if (grn.status !== GrnStatus.DRAFT) {
      return {
        success: false,
        error: `Cannot cancel GRN in status "${grn.status}". Only DRAFT GRNs can be cancelled.`,
      };
    }

    await db.goodsReceiptNote.update({
      where: { id },
      data: { status: GrnStatus.CANCELLED },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
