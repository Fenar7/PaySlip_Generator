"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { nextDocumentNumberTx } from "@/lib/docs/numbering";
import { validateGstin } from "@/lib/gst/compute";
import { PurchaseOrderStatus, Prisma } from "@/generated/prisma/client";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatePOLineData {
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
  hsnCode?: string;
  gstRate?: number;
}

export interface CreatePurchaseOrderData {
  vendorId: string;
  poDate: string;
  expectedDelivery?: string;
  warehouseId?: string;
  notes?: string;
  termsAndConditions?: string;
  supplierGstin?: string;
  placeOfSupply?: string;
  lines: CreatePOLineData[];
}

export interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus;
  vendorId?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

interface GstLineAmounts {
  lineTotal: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
}

function calcGstLine(
  quantity: number,
  unitPrice: number,
  discount: number,
  gstRate: number,
  isIntrastate: boolean,
): GstLineAmounts {
  const lineBeforeDiscount = new Prisma.Decimal(quantity).times(unitPrice);
  const discountAmt = lineBeforeDiscount.times(discount).dividedBy(100);
  const lineTotal = lineBeforeDiscount.minus(discountAmt);
  const gstDecimal = new Prisma.Decimal(gstRate);

  if (isIntrastate) {
    const half = gstDecimal.dividedBy(200);
    const cgst = lineTotal.times(half).toDecimalPlaces(4);
    const sgst = lineTotal.times(half).toDecimalPlaces(4);
    return { lineTotal, cgstAmount: cgst, sgstAmount: sgst, igstAmount: new Prisma.Decimal(0) };
  } else {
    const igst = lineTotal.times(gstDecimal).dividedBy(100).toDecimalPlaces(4);
    return { lineTotal, cgstAmount: new Prisma.Decimal(0), sgstAmount: new Prisma.Decimal(0), igstAmount: igst };
  }
}

function extractStateCodeFromGstin(gstin: string): string {
  return gstin.substring(0, 2).toUpperCase();
}

// ─── 1. List ─────────────────────────────────────────────────────────────────

export async function listPurchaseOrders(
  filters: PurchaseOrderFilters = {},
): Promise<ActionResult<Array<{
  id: string;
  poNumber: string;
  poDate: string;
  status: PurchaseOrderStatus;
  totalAmount: Prisma.Decimal;
  currency: string;
  createdAt: Date;
  vendor: { id: string; name: string };
  _count: { lines: number };
}>>> {
  try {
    const { orgId } = await requireOrgContext();

    const orders = await db.purchaseOrder.findMany({
      where: {
        orgId,
        archivedAt: null,
        ...(filters.status !== undefined && { status: filters.status }),
        ...(filters.vendorId !== undefined && { vendorId: filters.vendorId }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        poNumber: true,
        poDate: true,
        status: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
        vendor: { select: { id: true, name: true } },
        _count: { select: { lines: true } },
      },
    });

    return { success: true, data: orders };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 2. Get single ────────────────────────────────────────────────────────────

export async function getPurchaseOrder(
  id: string,
): Promise<ActionResult<Prisma.PurchaseOrderGetPayload<{
  include: {
    vendor: true;
    lines: true;
    goodsReceipts: { select: { id: true; grnNumber: true; status: true; receiptDate: true } };
    vendorBills: { select: { id: true; billNumber: true; status: true; totalAmount: true } };
  };
}>>> {
  try {
    const { orgId } = await requireOrgContext();

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        lines: true,
        goodsReceipts: {
          select: { id: true, grnNumber: true, status: true, receiptDate: true },
        },
        vendorBills: {
          select: { id: true, billNumber: true, status: true, totalAmount: true },
        },
      },
    });

    if (!po || po.orgId !== orgId) {
      return { success: false, error: "Purchase order not found" };
    }

    return { success: true, data: po };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 3. Create ───────────────────────────────────────────────────────────────

export async function createPurchaseOrder(
  data: CreatePurchaseOrderData,
): Promise<ActionResult<{ id: string; poNumber: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    if (!data.lines || data.lines.length === 0) {
      return { success: false, error: "At least one purchase order line is required" };
    }

    const vendor = await db.vendor.findUnique({
      where: { id: data.vendorId },
      select: { id: true, organizationId: true },
    });

    if (!vendor || vendor.organizationId !== orgId) {
      return { success: false, error: "Vendor not found" };
    }

    if (data.supplierGstin) {
      const gstinValidation = validateGstin(data.supplierGstin);
      if (!gstinValidation.valid) {
        return { success: false, error: `Invalid supplier GSTIN: ${gstinValidation.error}` };
      }
    }

    const orgDefaults = await db.orgDefaults.findUnique({
      where: { organizationId: orgId },
      select: { gstStateCode: true },
    });

    const orgStateCode = orgDefaults?.gstStateCode ?? "";
    const supplierStateCode = data.supplierGstin
      ? extractStateCodeFromGstin(data.supplierGstin)
      : "";

    const isIntrastate =
      orgStateCode !== "" &&
      supplierStateCode !== "" &&
      (data.placeOfSupply === orgStateCode || orgStateCode === supplierStateCode);

    let subtotal = new Prisma.Decimal(0);
    let totalCgst = new Prisma.Decimal(0);
    let totalSgst = new Prisma.Decimal(0);
    let totalIgst = new Prisma.Decimal(0);

    const lineCalcs = data.lines.map((line, idx) => {
      const gst = calcGstLine(
        line.quantity,
        line.unitPrice,
        line.discount ?? 0,
        line.gstRate ?? 0,
        isIntrastate,
      );
      subtotal = subtotal.plus(gst.lineTotal);
      totalCgst = totalCgst.plus(gst.cgstAmount);
      totalSgst = totalSgst.plus(gst.sgstAmount);
      totalIgst = totalIgst.plus(gst.igstAmount);
      return { line, gst, idx };
    });

    const taxAmount = totalCgst.plus(totalSgst).plus(totalIgst);
    const totalAmount = subtotal.plus(taxAmount);

    const po = await db.$transaction(async (tx) => {
      const poNumber = await nextDocumentNumberTx(tx, orgId, "purchaseOrder");

      return tx.purchaseOrder.create({
        data: {
          orgId,
          vendorId: data.vendorId,
          poNumber,
          poDate: data.poDate,
          expectedDelivery: data.expectedDelivery,
          status: PurchaseOrderStatus.DRAFT,
          warehouseId: data.warehouseId,
          notes: data.notes,
          termsAndConditions: data.termsAndConditions,
          supplierGstin: data.supplierGstin,
          placeOfSupply: data.placeOfSupply,
          subtotalAmount: subtotal,
          taxAmount,
          totalAmount,
          gstTotalCgst: totalCgst,
          gstTotalSgst: totalSgst,
          gstTotalIgst: totalIgst,
          createdByUserId: userId,
          lines: {
            create: lineCalcs.map(({ line, gst, idx }) => ({
              inventoryItemId: line.inventoryItemId,
              description: line.description,
              quantity: new Prisma.Decimal(line.quantity),
              unitPrice: new Prisma.Decimal(line.unitPrice),
              taxRate: line.taxRate ?? 0,
              discount: new Prisma.Decimal(line.discount ?? 0),
              lineTotal: gst.lineTotal,
              sortOrder: idx,
              hsnCode: line.hsnCode,
              gstRate: line.gstRate ?? 0,
              cgstAmount: gst.cgstAmount,
              sgstAmount: gst.sgstAmount,
              igstAmount: gst.igstAmount,
            })),
          },
        },
        select: { id: true, poNumber: true },
      });
    });

    return { success: true, data: po };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 4. Update ───────────────────────────────────────────────────────────────

export async function updatePurchaseOrder(
  id: string,
  data: Partial<Omit<CreatePurchaseOrderData, "lines">>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!po || po.orgId !== orgId) {
      return { success: false, error: "Purchase order not found" };
    }

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      return {
        success: false,
        error: `Purchase order can only be updated in DRAFT status. Current: "${po.status}".`,
      };
    }

    await db.purchaseOrder.update({
      where: { id },
      data: {
        ...(data.vendorId !== undefined && { vendorId: data.vendorId }),
        ...(data.poDate !== undefined && { poDate: data.poDate }),
        ...(data.expectedDelivery !== undefined && { expectedDelivery: data.expectedDelivery }),
        ...(data.warehouseId !== undefined && { warehouseId: data.warehouseId }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.termsAndConditions !== undefined && {
          termsAndConditions: data.termsAndConditions,
        }),
        ...(data.supplierGstin !== undefined && { supplierGstin: data.supplierGstin }),
        ...(data.placeOfSupply !== undefined && { placeOfSupply: data.placeOfSupply }),
      },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 5. Submit for Approval ───────────────────────────────────────────────────

export async function submitPurchaseOrderForApproval(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!po || po.orgId !== orgId) {
      return { success: false, error: "Purchase order not found" };
    }

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      return {
        success: false,
        error: `Cannot submit purchase order in status "${po.status}". Must be DRAFT.`,
      };
    }

    await db.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.PENDING_APPROVAL },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 6. Approve ──────────────────────────────────────────────────────────────

export async function approvePurchaseOrder(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!po || po.orgId !== orgId) {
      return { success: false, error: "Purchase order not found" };
    }

    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      return {
        success: false,
        error: `Cannot approve purchase order in status "${po.status}". Must be PENDING_APPROVAL.`,
      };
    }

    await db.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.APPROVED,
        approvedByUserId: userId,
        approvedAt: new Date(),
      },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 7. Reject ───────────────────────────────────────────────────────────────

export async function rejectPurchaseOrder(
  id: string,
  reason: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!po || po.orgId !== orgId) {
      return { success: false, error: "Purchase order not found" };
    }

    if (po.status !== PurchaseOrderStatus.PENDING_APPROVAL) {
      return {
        success: false,
        error: `Cannot reject purchase order in status "${po.status}". Must be PENDING_APPROVAL.`,
      };
    }

    if (!reason?.trim()) {
      return { success: false, error: "Rejection reason is required" };
    }

    await db.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
        rejectionReason: reason.trim(),
        rejectedByUserId: userId,
        rejectedAt: new Date(),
      },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 8. Close ────────────────────────────────────────────────────────────────

export async function closePurchaseOrder(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!po || po.orgId !== orgId) {
      return { success: false, error: "Purchase order not found" };
    }

    if (po.status !== PurchaseOrderStatus.FULLY_RECEIVED) {
      return {
        success: false,
        error: `Cannot close purchase order in status "${po.status}". Must be FULLY_RECEIVED.`,
      };
    }

    await db.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CLOSED },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 9. Cancel ───────────────────────────────────────────────────────────────

export async function cancelPurchaseOrder(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const po = await db.purchaseOrder.findUnique({
      where: { id },
      select: { id: true, orgId: true, status: true },
    });

    if (!po || po.orgId !== orgId) {
      return { success: false, error: "Purchase order not found" };
    }

    const cancellable: PurchaseOrderStatus[] = [
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.PENDING_APPROVAL,
    ];

    if (!cancellable.includes(po.status)) {
      return {
        success: false,
        error: `Cannot cancel purchase order in status "${po.status}". Must be DRAFT or PENDING_APPROVAL.`,
      };
    }

    await db.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
    });

    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
