import { db } from "@/lib/db";
import { Prisma, StockEventType } from "@/generated/prisma/client";

export interface RecordStockEventInput {
  orgId: string;
  inventoryItemId: string;
  warehouseId: string;
  eventType: StockEventType;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  createdByUserId: string;
}

/**
 * Append a stock event and atomically update the materialized StockLevel cache.
 * Inbound events (positive) increase quantity; outbound (negative-implied) decrease it.
 * Always runs inside a transaction.
 */
export async function recordStockEvent(
  input: RecordStockEventInput
): Promise<void> {
  await db.$transaction(async (tx) => {
    await recordStockEventTx(tx, input);
  });
}

export async function recordStockEventTx(
  tx: Prisma.TransactionClient,
  input: RecordStockEventInput
): Promise<void> {
  const {
    orgId,
    inventoryItemId,
    warehouseId,
    eventType,
    quantity,
    unitCost = 0,
    referenceType,
    referenceId,
    note,
    createdByUserId,
  } = input;

  const totalCost = quantity * unitCost;
  const qtyDelta = quantityDelta(eventType, quantity);
  const valuationDelta = isInbound(eventType) ? totalCost : -(Math.abs(qtyDelta) * unitCost);

  await tx.stockEvent.create({
    data: {
      orgId,
      inventoryItemId,
      warehouseId,
      eventType,
      quantity: Math.abs(quantity),
      unitCost: new Prisma.Decimal(unitCost),
      totalCost: new Prisma.Decimal(Math.abs(totalCost)),
      referenceType,
      referenceId,
      note,
      createdByUserId,
    },
  });

  // Upsert StockLevel — initialize if it doesn't exist yet
  const existing = await tx.stockLevel.findUnique({
    where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
  });

  if (existing) {
    const newQty = existing.quantity + qtyDelta;
    const newValuation = Math.max(0, Number(existing.valuationAmount) + valuationDelta);
    const newAvailable = Math.max(0, newQty - existing.reservedQty);

    await tx.stockLevel.update({
      where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
      data: {
        quantity: newQty,
        availableQty: newAvailable,
        valuationAmount: new Prisma.Decimal(newValuation.toFixed(4)),
        lastEventAt: new Date(),
      },
    });
  } else {
    const newQty = Math.max(0, qtyDelta);
    const newValuation = Math.max(0, valuationDelta);

    await tx.stockLevel.create({
      data: {
        orgId,
        inventoryItemId,
        warehouseId,
        quantity: newQty,
        reservedQty: 0,
        availableQty: newQty,
        valuationAmount: new Prisma.Decimal(newValuation.toFixed(4)),
        lastEventAt: new Date(),
      },
    });
  }
}

/**
 * Reserve stock for an order. Reduces availableQty without reducing quantity.
 */
export async function reserveStockTx(
  tx: Prisma.TransactionClient,
  inventoryItemId: string,
  warehouseId: string,
  qty: number
): Promise<void> {
  const level = await tx.stockLevel.findUnique({
    where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
  });

  if (!level) {
    throw new Error(`No stock level found for item ${inventoryItemId} in warehouse ${warehouseId}`);
  }

  if (level.availableQty < qty) {
    throw new Error(
      `Insufficient available stock: requested ${qty}, available ${level.availableQty}`
    );
  }

  await tx.stockLevel.update({
    where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
    data: {
      reservedQty: level.reservedQty + qty,
      availableQty: level.availableQty - qty,
    },
  });
}

/**
 * Release a reservation (e.g., on order cancellation).
 */
export async function releaseReservationTx(
  tx: Prisma.TransactionClient,
  inventoryItemId: string,
  warehouseId: string,
  qty: number
): Promise<void> {
  const level = await tx.stockLevel.findUnique({
    where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
  });

  if (!level) return; // Already cleaned up

  const newReserved = Math.max(0, level.reservedQty - qty);
  const released = level.reservedQty - newReserved;

  await tx.stockLevel.update({
    where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
    data: {
      reservedQty: newReserved,
      availableQty: level.availableQty + released,
    },
  });
}

// ─── helpers ────────────────────────────────────────────────────────────────

function isInbound(eventType: StockEventType): boolean {
  const inboundTypes = new Set<StockEventType>([
    StockEventType.PURCHASE_RECEIPT,
    StockEventType.OPENING_BALANCE,
    StockEventType.RETURN_IN,
    StockEventType.ADJUSTMENT_IN,
    StockEventType.TRANSFER_IN,
  ]);
  return inboundTypes.has(eventType);
}

function quantityDelta(eventType: StockEventType, qty: number): number {
  return isInbound(eventType) ? Math.abs(qty) : -Math.abs(qty);
}
