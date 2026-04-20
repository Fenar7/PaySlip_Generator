import { Prisma, StockEventType, InventoryValuationMethod } from "@/generated/prisma/client";

export interface FifoLayer {
  quantity: number;
  unitCost: number;
  eventId: string;
  createdAt: Date;
}

export interface ValuationResult {
  cogs: Prisma.Decimal;
  remainingLayers: FifoLayer[];
}

type StockHistoryEvent = {
  id: string;
  eventType: StockEventType;
  quantity: number;
  unitCost: Prisma.Decimal;
  createdAt: Date;
};

/**
 * Build FIFO cost layers from PURCHASE_RECEIPT and OPENING_BALANCE stock events.
 * Events must be sorted ascending by createdAt.
 */
export function buildFifoLayers(
  events: StockHistoryEvent[]
): FifoLayer[] {
  const layers: FifoLayer[] = [];

  for (const e of events) {
    if (
      e.eventType === StockEventType.PURCHASE_RECEIPT ||
      e.eventType === StockEventType.OPENING_BALANCE ||
      e.eventType === StockEventType.RETURN_IN ||
      e.eventType === StockEventType.ADJUSTMENT_IN
    ) {
      if (e.quantity > 0) {
        layers.push({
          quantity: e.quantity,
          unitCost: Number(e.unitCost),
          eventId: e.id,
          createdAt: e.createdAt,
        });
      }
    }
  }

  return layers;
}

function isInboundEventType(eventType: StockEventType): boolean {
  return (
    eventType === StockEventType.PURCHASE_RECEIPT ||
    eventType === StockEventType.OPENING_BALANCE ||
    eventType === StockEventType.RETURN_IN ||
    eventType === StockEventType.ADJUSTMENT_IN ||
    eventType === StockEventType.TRANSFER_IN
  );
}

function consumeLayers(
  layers: FifoLayer[],
  quantity: number,
  mode: "fifo" | "lifo",
): FifoLayer[] {
  let remaining = quantity;
  const nextLayers = layers.map((layer) => ({ ...layer }));
  const indexes =
    mode === "fifo"
      ? nextLayers.map((_, index) => index)
      : nextLayers.map((_, index) => nextLayers.length - 1 - index);

  for (const index of indexes) {
    if (remaining <= 0) {
      break;
    }

    const layer = nextLayers[index];
    if (!layer || layer.quantity <= 0) {
      continue;
    }

    const consumed = Math.min(layer.quantity, remaining);
    layer.quantity -= consumed;
    remaining -= consumed;
  }

  return nextLayers.filter((layer) => layer.quantity > 0);
}

export function replayRemainingLayers(
  events: StockHistoryEvent[],
  method: InventoryValuationMethod,
): FifoLayer[] {
  if (method === InventoryValuationMethod.WEIGHTED_AVERAGE) {
    return [];
  }

  let layers: FifoLayer[] = [];

  for (const event of events) {
    if (isInboundEventType(event.eventType)) {
      if (event.quantity <= 0) {
        continue;
      }

      layers.push({
        quantity: event.quantity,
        unitCost: Number(event.unitCost),
        eventId: event.id,
        createdAt: event.createdAt,
      });
      continue;
    }

    if (event.quantity <= 0) {
      continue;
    }

    layers = consumeLayers(
      layers,
      event.quantity,
      method === InventoryValuationMethod.LIFO ? "lifo" : "fifo",
    );
  }

  return layers;
}

/**
 * Compute COGS for dispatching `dispatchQty` units using FIFO.
 * Consumes from the oldest layers first.
 * Returns total cost and the remaining layer state.
 */
export function computeFifoCogs(
  layers: FifoLayer[],
  dispatchQty: number
): ValuationResult {
  let remaining = dispatchQty;
  let totalCost = 0;
  const updatedLayers = layers.map((l) => ({ ...l }));

  for (const layer of updatedLayers) {
    if (remaining <= 0) break;

    const consumed = Math.min(layer.quantity, remaining);
    totalCost += consumed * layer.unitCost;
    layer.quantity -= consumed;
    remaining -= consumed;
  }

  if (remaining > 0) {
    // Dispatch quantity exceeds available stock — use last known cost for remainder
    const lastCost = updatedLayers.length > 0 ? updatedLayers[updatedLayers.length - 1].unitCost : 0;
    totalCost += remaining * lastCost;
  }

  return {
    cogs: new Prisma.Decimal(totalCost.toFixed(4)),
    remainingLayers: updatedLayers.filter((l) => l.quantity > 0),
  };
}

/**
 * Compute COGS for dispatching `dispatchQty` units using LIFO.
 * Consumes from the newest layers first.
 */
export function computeLifoCogs(
  layers: FifoLayer[],
  dispatchQty: number
): ValuationResult {
  let remaining = dispatchQty;
  let totalCost = 0;
  const updatedLayers = layers.map((l) => ({ ...l }));
  const reversed = [...updatedLayers].reverse();

  for (const layer of reversed) {
    if (remaining <= 0) break;

    const consumed = Math.min(layer.quantity, remaining);
    totalCost += consumed * layer.unitCost;
    layer.quantity -= consumed;
    remaining -= consumed;
  }

  if (remaining > 0) {
    const lastCost = updatedLayers.length > 0 ? updatedLayers[0].unitCost : 0;
    totalCost += remaining * lastCost;
  }

  return {
    cogs: new Prisma.Decimal(totalCost.toFixed(4)),
    remainingLayers: updatedLayers.filter((l) => l.quantity > 0),
  };
}

/**
 * Compute COGS using Weighted Average cost method.
 * Average cost = total value of stock / total quantity.
 */
export function computeWeightedAverageCogs(
  layers: FifoLayer[],
  currentStock: number,
  currentValuation: number,
  dispatchQty: number
): ValuationResult {
  const avgCost = currentStock > 0 ? currentValuation / currentStock : 0;
  const cogs = new Prisma.Decimal((dispatchQty * avgCost).toFixed(4));

  // WA doesn't maintain layers; return as-is
  return {
    cogs,
    remainingLayers: layers,
  };
}

/**
 * Route COGS computation to the correct algorithm.
 */
export function computeCogs(
  method: InventoryValuationMethod,
  layers: FifoLayer[],
  currentStock: number,
  currentValuation: number,
  dispatchQty: number
): ValuationResult {
  switch (method) {
    case InventoryValuationMethod.FIFO:
      return computeFifoCogs(layers, dispatchQty);
    case InventoryValuationMethod.LIFO:
      return computeLifoCogs(layers, dispatchQty);
    case InventoryValuationMethod.WEIGHTED_AVERAGE:
      return computeWeightedAverageCogs(layers, currentStock, currentValuation, dispatchQty);
  }
}

/**
 * Compute the new weighted average unit cost after receiving stock.
 * newAvg = (existingQty * existingAvg + incomingQty * incomingCost) / (existingQty + incomingQty)
 */
export function computeNewWeightedAverage(
  existingQty: number,
  existingValuation: number,
  incomingQty: number,
  incomingCost: number
): number {
  const totalQty = existingQty + incomingQty;
  if (totalQty === 0) return 0;
  return (existingQty * existingValuation + incomingQty * incomingCost) / totalQty;
}
