"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WarehouseSummary {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  stockItemCount: number;
}

export interface WarehouseDetail extends WarehouseSummary {
  stockSummary: {
    totalItems: number;
    totalQty: number;
    totalAvailableQty: number;
    valuationAmount: Prisma.Decimal;
  };
}

export interface CreateWarehouseData {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isDefault?: boolean;
}

// ─── 1. List ──────────────────────────────────────────────────────────────────

export async function listWarehouses(
  includeInactive = false,
): Promise<ActionResult<WarehouseSummary[]>> {
  try {
    const { orgId } = await requireOrgContext();

    const warehouses = await db.warehouse.findMany({
      where: {
        orgId,
        ...(!includeInactive && { isActive: true }),
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        isDefault: true,
        isActive: true,
        createdAt: true,
        _count: { select: { stockLevels: true } },
      },
    });

    const data: WarehouseSummary[] = warehouses.map((w) => ({
      id: w.id,
      name: w.name,
      code: w.code,
      address: w.address,
      city: w.city,
      state: w.state,
      pincode: w.pincode,
      isDefault: w.isDefault,
      isActive: w.isActive,
      createdAt: w.createdAt,
      stockItemCount: w._count.stockLevels,
    }));

    return { success: true, data };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 2. Get single ────────────────────────────────────────────────────────────

export async function getWarehouse(
  id: string,
): Promise<ActionResult<WarehouseDetail>> {
  try {
    const { orgId } = await requireOrgContext();

    const warehouse = await db.warehouse.findUnique({
      where: { id },
      include: {
        stockLevels: {
          select: {
            quantity: true,
            availableQty: true,
            valuationAmount: true,
          },
        },
      },
    });

    if (!warehouse || warehouse.orgId !== orgId) {
      return { success: false, error: "Warehouse not found" };
    }

    const levels = warehouse.stockLevels;
    const stockSummary = {
      totalItems: levels.length,
      totalQty: levels.reduce((s, l) => s + l.quantity, 0),
      totalAvailableQty: levels.reduce((s, l) => s + l.availableQty, 0),
      valuationAmount: levels.reduce(
        (s, l) => s.plus(l.valuationAmount),
        new Prisma.Decimal(0),
      ),
    };

    return {
      success: true,
      data: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address,
        city: warehouse.city,
        state: warehouse.state,
        pincode: warehouse.pincode,
        isDefault: warehouse.isDefault,
        isActive: warehouse.isActive,
        createdAt: warehouse.createdAt,
        stockItemCount: levels.length,
        stockSummary,
      },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 3. Create ────────────────────────────────────────────────────────────────

export async function createWarehouse(
  data: CreateWarehouseData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const codeConflict = await db.warehouse.findFirst({
      where: { orgId, code: data.code.toUpperCase() },
      select: { id: true },
    });

    if (codeConflict) {
      return {
        success: false,
        error: `Warehouse code "${data.code}" already exists in this organisation`,
      };
    }

    const warehouse = await db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.warehouse.updateMany({
          where: { orgId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.warehouse.create({
        data: {
          orgId,
          name: data.name,
          code: data.code.toUpperCase(),
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          isDefault: data.isDefault ?? false,
        },
        select: { id: true },
      });
    });

    return { success: true, data: { id: warehouse.id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 4. Update ────────────────────────────────────────────────────────────────

export async function updateWarehouse(
  id: string,
  data: Partial<CreateWarehouseData>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const warehouse = await db.warehouse.findUnique({
      where: { id },
      select: { id: true, orgId: true, code: true },
    });

    if (!warehouse || warehouse.orgId !== orgId) {
      return { success: false, error: "Warehouse not found" };
    }

    const newCode = data.code ? data.code.toUpperCase() : undefined;

    if (newCode && newCode !== warehouse.code) {
      const codeConflict = await db.warehouse.findFirst({
        where: { orgId, code: newCode, id: { not: id } },
        select: { id: true },
      });
      if (codeConflict) {
        return {
          success: false,
          error: `Warehouse code "${newCode}" already exists in this organisation`,
        };
      }
    }

    await db.warehouse.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(newCode !== undefined && { code: newCode }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.pincode !== undefined && { pincode: data.pincode }),
      },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 5. Set Default ───────────────────────────────────────────────────────────

export async function setDefaultWarehouse(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const warehouse = await db.warehouse.findUnique({
      where: { id },
      select: { id: true, orgId: true, isActive: true },
    });

    if (!warehouse || warehouse.orgId !== orgId) {
      return { success: false, error: "Warehouse not found" };
    }

    if (!warehouse.isActive) {
      return { success: false, error: "Cannot set an inactive warehouse as default" };
    }

    await db.$transaction([
      db.warehouse.updateMany({
        where: { orgId, isDefault: true },
        data: { isDefault: false },
      }),
      db.warehouse.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 6. Deactivate ───────────────────────────────────────────────────────────

export async function deactivateWarehouse(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const warehouse = await db.warehouse.findUnique({
      where: { id },
      select: { id: true, orgId: true, isDefault: true },
    });

    if (!warehouse || warehouse.orgId !== orgId) {
      return { success: false, error: "Warehouse not found" };
    }

    if (warehouse.isDefault) {
      return {
        success: false,
        error: "Cannot deactivate the default warehouse. Set another warehouse as default first.",
      };
    }

    await db.warehouse.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
