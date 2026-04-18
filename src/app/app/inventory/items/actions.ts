"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { getLowStockItems, LowStockItem } from "@/lib/inventory/alerts";
import { Prisma, InventoryValuationMethod } from "@/generated/prisma/client";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryItemSummary {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  gstRate: number;
  costPrice: Prisma.Decimal;
  sellingPrice: Prisma.Decimal;
  reorderLevel: number;
  reorderQuantity: number;
  valuationMethod: InventoryValuationMethod;
  trackInventory: boolean;
  isActive: boolean;
  createdAt: Date;
  totalQty: number;
  totalAvailable: number;
}

export interface InventoryItemDetail extends InventoryItemSummary {
  hsnSacCodeId: string | null;
  imageUrl: string | null;
  stockLevels: Array<{
    warehouseId: string;
    warehouseName: string;
    quantity: number;
    reservedQty: number;
    availableQty: number;
    valuationAmount: Prisma.Decimal;
  }>;
}

export interface CreateInventoryItemData {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit?: string;
  hsnSacCodeId?: string;
  gstRate?: number;
  costPrice?: Prisma.Decimal | number;
  sellingPrice?: Prisma.Decimal | number;
  reorderLevel?: number;
  reorderQuantity?: number;
  valuationMethod?: InventoryValuationMethod;
  trackInventory?: boolean;
}

export interface ListInventoryItemsFilters {
  category?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedInventoryItems {
  items: InventoryItemSummary[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── 1. List ──────────────────────────────────────────────────────────────────

export async function listInventoryItems(
  filters: ListInventoryItemsFilters = {},
): Promise<ActionResult<PaginatedInventoryItems>> {
  try {
    const { orgId } = await requireOrgContext();
    const { category, isActive, search, page = 1, pageSize = 20 } = filters;

    const where: Prisma.InventoryItemWhereInput = {
      orgId,
      ...(category !== undefined && { category }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
      archivedAt: null,
    };

    const [rawItems, total] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        select: {
          id: true,
          sku: true,
          name: true,
          description: true,
          category: true,
          unit: true,
          gstRate: true,
          costPrice: true,
          sellingPrice: true,
          reorderLevel: true,
          reorderQuantity: true,
          valuationMethod: true,
          trackInventory: true,
          isActive: true,
          createdAt: true,
          stockLevels: {
            select: { quantity: true, availableQty: true },
          },
        },
      }),
      db.inventoryItem.count({ where }),
    ]);

    const items: InventoryItemSummary[] = rawItems.map((item) => ({
      ...item,
      totalQty: item.stockLevels.reduce((s, l) => s + l.quantity, 0),
      totalAvailable: item.stockLevels.reduce((s, l) => s + l.availableQty, 0),
    }));

    return { success: true, data: { items, total, page, pageSize } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 2. Get single ────────────────────────────────────────────────────────────

export async function getInventoryItem(
  id: string,
): Promise<ActionResult<InventoryItemDetail>> {
  try {
    const { orgId } = await requireOrgContext();

    const item = await db.inventoryItem.findUnique({
      where: { id },
      include: {
        stockLevels: {
          include: { warehouse: { select: { name: true } } },
        },
      },
    });

    if (!item || item.orgId !== orgId) {
      return { success: false, error: "Inventory item not found" };
    }

    const detail: InventoryItemDetail = {
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      category: item.category,
      unit: item.unit,
      hsnSacCodeId: item.hsnSacCodeId,
      gstRate: item.gstRate,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      reorderLevel: item.reorderLevel,
      reorderQuantity: item.reorderQuantity,
      valuationMethod: item.valuationMethod,
      trackInventory: item.trackInventory,
      isActive: item.isActive,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt,
      totalQty: item.stockLevels.reduce((s, l) => s + l.quantity, 0),
      totalAvailable: item.stockLevels.reduce((s, l) => s + l.availableQty, 0),
      stockLevels: item.stockLevels.map((l) => ({
        warehouseId: l.warehouseId,
        warehouseName: l.warehouse.name,
        quantity: l.quantity,
        reservedQty: l.reservedQty,
        availableQty: l.availableQty,
        valuationAmount: l.valuationAmount,
      })),
    };

    return { success: true, data: detail };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 3. Create ────────────────────────────────────────────────────────────────

export async function createInventoryItem(
  data: CreateInventoryItemData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const existing = await db.inventoryItem.findFirst({
      where: { orgId, sku: data.sku, archivedAt: null },
      select: { id: true },
    });

    if (existing) {
      return {
        success: false,
        error: `SKU "${data.sku}" already exists in this organisation`,
      };
    }

    const item = await db.inventoryItem.create({
      data: {
        orgId,
        sku: data.sku,
        name: data.name,
        description: data.description,
        category: data.category,
        unit: data.unit ?? "PCS",
        hsnSacCodeId: data.hsnSacCodeId,
        gstRate: data.gstRate ?? 0,
        costPrice: data.costPrice !== undefined ? new Prisma.Decimal(data.costPrice.toString()) : new Prisma.Decimal(0),
        sellingPrice: data.sellingPrice !== undefined ? new Prisma.Decimal(data.sellingPrice.toString()) : new Prisma.Decimal(0),
        reorderLevel: data.reorderLevel ?? 0,
        reorderQuantity: data.reorderQuantity ?? 0,
        valuationMethod: data.valuationMethod ?? InventoryValuationMethod.FIFO,
        trackInventory: data.trackInventory ?? true,
      },
      select: { id: true },
    });

    return { success: true, data: { id: item.id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 4. Update ────────────────────────────────────────────────────────────────

export async function updateInventoryItem(
  id: string,
  data: Partial<CreateInventoryItemData>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const item = await db.inventoryItem.findUnique({
      where: { id },
      select: { id: true, orgId: true, sku: true, archivedAt: true },
    });

    if (!item || item.orgId !== orgId || item.archivedAt !== null) {
      return { success: false, error: "Inventory item not found" };
    }

    if (data.sku && data.sku !== item.sku) {
      const skuConflict = await db.inventoryItem.findFirst({
        where: { orgId, sku: data.sku, archivedAt: null, id: { not: id } },
        select: { id: true },
      });
      if (skuConflict) {
        return {
          success: false,
          error: `SKU "${data.sku}" already exists in this organisation`,
        };
      }
    }

    await db.inventoryItem.update({
      where: { id },
      data: {
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.hsnSacCodeId !== undefined && { hsnSacCodeId: data.hsnSacCodeId }),
        ...(data.gstRate !== undefined && { gstRate: data.gstRate }),
        ...(data.costPrice !== undefined && {
          costPrice: new Prisma.Decimal(data.costPrice.toString()),
        }),
        ...(data.sellingPrice !== undefined && {
          sellingPrice: new Prisma.Decimal(data.sellingPrice.toString()),
        }),
        ...(data.reorderLevel !== undefined && { reorderLevel: data.reorderLevel }),
        ...(data.reorderQuantity !== undefined && { reorderQuantity: data.reorderQuantity }),
        ...(data.valuationMethod !== undefined && { valuationMethod: data.valuationMethod }),
        ...(data.trackInventory !== undefined && { trackInventory: data.trackInventory }),
      },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 5. Archive ───────────────────────────────────────────────────────────────

export async function archiveInventoryItem(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const item = await db.inventoryItem.findUnique({
      where: { id },
      select: { id: true, orgId: true, archivedAt: true },
    });

    if (!item || item.orgId !== orgId) {
      return { success: false, error: "Inventory item not found" };
    }

    if (item.archivedAt !== null) {
      return { success: false, error: "Inventory item is already archived" };
    }

    await db.inventoryItem.update({
      where: { id },
      data: { archivedAt: new Date(), isActive: false },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 6. Low Stock Summary ─────────────────────────────────────────────────────

export async function getLowStockSummary(): Promise<ActionResult<LowStockItem[]>> {
  try {
    const { orgId } = await requireOrgContext();
    const items = await getLowStockItems(orgId);
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
