import { db } from "@/lib/db";
import {
  InventoryValuationMethod,
  Prisma,
  StockEventType,
} from "@/generated/prisma/client";
import { computeCogs, replayRemainingLayers } from "./valuation";

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
    unitCost,
    referenceType,
    referenceId,
    note,
    createdByUserId,
  } = input;

  const effectiveUnitCost =
    unitCost ??
    (isInbound(eventType)
      ? 0
      : await getOutboundUnitCostTx(tx, {
          orgId,
          inventoryItemId,
          warehouseId,
          quantity,
        }));
  const totalCost = quantity * effectiveUnitCost;
  const qtyDelta = quantityDelta(eventType, quantity);
  const valuationDelta = isInbound(eventType)
    ? totalCost
    : -(Math.abs(qtyDelta) * effectiveUnitCost);
  const absoluteQuantity = Math.abs(quantity);
  const valuationAmount = new Prisma.Decimal(Math.abs(totalCost).toFixed(4));
  const valuationDeltaDecimal = new Prisma.Decimal(Math.abs(valuationDelta).toFixed(4));
  const lastEventAt = new Date();

  if (isInbound(eventType)) {
    await tx.stockLevel.upsert({
      where: { inventoryItemId_warehouseId: { inventoryItemId, warehouseId } },
      update: {
        quantity: { increment: absoluteQuantity },
        availableQty: { increment: absoluteQuantity },
        valuationAmount: { increment: valuationAmount },
        lastEventAt,
      },
      create: {
        orgId,
        inventoryItemId,
        warehouseId,
        quantity: absoluteQuantity,
        reservedQty: 0,
        availableQty: absoluteQuantity,
        valuationAmount,
        lastEventAt,
      },
    });
  } else {
    const updated = await tx.stockLevel.updateMany({
      where: {
        inventoryItemId,
        warehouseId,
        orgId,
        quantity: { gte: absoluteQuantity },
        availableQty: { gte: absoluteQuantity },
      },
      data: {
        quantity: { decrement: absoluteQuantity },
        availableQty: { decrement: absoluteQuantity },
        valuationAmount: { decrement: valuationDeltaDecimal },
        lastEventAt,
      },
    });

    if (updated.count !== 1) {
      throw new Error(
        `Insufficient stock for item ${inventoryItemId} in warehouse ${warehouseId}: requested ${absoluteQuantity}.`,
      );
    }
  }

  await tx.stockEvent.create({
    data: {
      orgId,
      inventoryItemId,
      warehouseId,
      eventType,
      quantity: absoluteQuantity,
      unitCost: new Prisma.Decimal(effectiveUnitCost.toFixed(4)),
      totalCost: valuationAmount,
      referenceType,
      referenceId,
      note,
      createdByUserId,
    },
  });
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
  const updated = await tx.stockLevel.updateMany({
    where: {
      inventoryItemId,
      warehouseId,
      availableQty: { gte: qty },
    },
    data: {
      reservedQty: { increment: qty },
      availableQty: { decrement: qty },
    },
  });

  if (updated.count !== 1) {
    throw new Error(`Insufficient available stock: requested ${qty}`);
  }
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

export async function getOutboundUnitCostTx(
  tx: Prisma.TransactionClient,
  input: {
    orgId: string;
    inventoryItemId: string;
    warehouseId: string;
    quantity: number;
  },
): Promise<number> {
  const stockLevel = await tx.stockLevel.findUnique({
    where: {
      inventoryItemId_warehouseId: {
        inventoryItemId: input.inventoryItemId,
        warehouseId: input.warehouseId,
      },
    },
    select: {
      quantity: true,
      availableQty: true,
      valuationAmount: true,
      inventoryItem: {
        select: {
          valuationMethod: true,
        },
      },
    },
  });

  if (!stockLevel) {
    throw new Error(
      `Cannot record outbound stock event for item ${input.inventoryItemId} in warehouse ${input.warehouseId} before stock exists.`,
    );
  }

  if (stockLevel.availableQty < input.quantity) {
    throw new Error(
      `Insufficient stock for item ${input.inventoryItemId} in warehouse ${input.warehouseId}: requested ${input.quantity}, available ${stockLevel.availableQty}`,
    );
  }

  if (
    stockLevel.inventoryItem.valuationMethod === InventoryValuationMethod.WEIGHTED_AVERAGE ||
    stockLevel.quantity <= 0
  ) {
    return stockLevel.quantity > 0
      ? Number(stockLevel.valuationAmount) / stockLevel.quantity
      : 0;
  }

  const stockEvents = await tx.stockEvent.findMany({
    where: {
      orgId: input.orgId,
      inventoryItemId: input.inventoryItemId,
      warehouseId: input.warehouseId,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      eventType: true,
      quantity: true,
      unitCost: true,
      createdAt: true,
    },
  });

  const remainingLayers = replayRemainingLayers(
    stockEvents,
    stockLevel.inventoryItem.valuationMethod,
  );
  const valuation = computeCogs(
    stockLevel.inventoryItem.valuationMethod,
    remainingLayers,
    stockLevel.quantity,
    Number(stockLevel.valuationAmount),
    input.quantity,
  );

  return input.quantity > 0 ? valuation.cogs.div(input.quantity).toNumber() : 0;
}
