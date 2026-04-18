import { db } from "@/lib/db";

export interface LowStockItem {
  id: string;
  orgId: string;
  sku: string;
  name: string;
  reorderLevel: number;
  totalAvailable: number;
  warehouseLevels: Array<{
    warehouseId: string;
    warehouseName: string;
    availableQty: number;
  }>;
}

/**
 * Returns all active inventory items where total available stock (across all
 * warehouses) is at or below the item's reorderLevel.
 */
export async function getLowStockItems(orgId: string): Promise<LowStockItem[]> {
  const items = await db.inventoryItem.findMany({
    where: { orgId, isActive: true, trackInventory: true, reorderLevel: { gt: 0 } },
    select: {
      id: true,
      orgId: true,
      sku: true,
      name: true,
      reorderLevel: true,
      stockLevels: {
        select: {
          warehouseId: true,
          availableQty: true,
          warehouse: { select: { name: true } },
        },
      },
    },
  });

  const results: LowStockItem[] = [];

  for (const item of items) {
    const totalAvailable = item.stockLevels.reduce((sum, l) => sum + l.availableQty, 0);

    if (totalAvailable <= item.reorderLevel) {
      results.push({
        id: item.id,
        orgId: item.orgId,
        sku: item.sku,
        name: item.name,
        reorderLevel: item.reorderLevel,
        totalAvailable,
        warehouseLevels: item.stockLevels.map((l) => ({
          warehouseId: l.warehouseId,
          warehouseName: l.warehouse.name,
          availableQty: l.availableQty,
        })),
      });
    }
  }

  return results;
}

/**
 * Check a single item's stock health against its reorder level.
 * Returns true if stock is at or below the reorder level.
 */
export async function isItemBelowReorderLevel(
  orgId: string,
  inventoryItemId: string
): Promise<boolean> {
  const item = await db.inventoryItem.findFirst({
    where: { id: inventoryItemId, orgId, isActive: true },
    select: {
      reorderLevel: true,
      stockLevels: { select: { availableQty: true } },
    },
  });

  if (!item) return false;
  if (item.reorderLevel === 0) return false;

  const totalAvailable = item.stockLevels.reduce((sum, l) => sum + l.availableQty, 0);
  return totalAvailable <= item.reorderLevel;
}
