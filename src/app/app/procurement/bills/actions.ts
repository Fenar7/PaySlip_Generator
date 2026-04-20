"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import {
  MatchStatus,
  PurchaseOrderStatus,
  Prisma,
} from "@/generated/prisma/client";
import {
  runThreeWayMatch as computeThreeWayMatch,
  type PoLine,
  type GrnLine,
  type BillLine,
} from "@/lib/procurement/three-way-match";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── 1. Link Bill to Purchase Order ──────────────────────────────────────────

export async function linkBillToPurchaseOrder(
  billId: string,
  purchaseOrderId: string,
): Promise<ActionResult<{ billId: string; purchaseOrderId: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const [bill, po] = await Promise.all([
      db.vendorBill.findUnique({
        where: { id: billId },
        select: { id: true, orgId: true },
      }),
      db.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        select: { id: true, orgId: true, status: true },
      }),
    ]);

    if (!bill || bill.orgId !== orgId) {
      return { success: false, error: "Vendor bill not found" };
    }

    if (!po || po.orgId !== orgId) {
      return { success: false, error: "Purchase order not found" };
    }

    const linkablePOStatuses: PurchaseOrderStatus[] = [
      PurchaseOrderStatus.APPROVED,
      PurchaseOrderStatus.PARTIALLY_RECEIVED,
      PurchaseOrderStatus.FULLY_RECEIVED,
    ];

    if (!linkablePOStatuses.includes(po.status)) {
      return {
        success: false,
        error: `Purchase order must be APPROVED, PARTIALLY_RECEIVED, or FULLY_RECEIVED to link a bill. Current status: "${po.status}".`,
      };
    }

    await db.vendorBill.update({
      where: { id: billId },
      data: { purchaseOrderId },
    });

    return { success: true, data: { billId, purchaseOrderId } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 2. Run Three-Way Match ───────────────────────────────────────────────────

export async function runThreeWayMatchForBill(
  billId: string,
): Promise<ActionResult<{
  matchResultId: string;
  matchStatus: MatchStatus;
  qtyMatchScore: number;
  amountMatchScore: number;
  overallScore: number;
  discrepancies: unknown[];
}>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const bill = await db.vendorBill.findUnique({
      where: { id: billId },
      select: { id: true, orgId: true, purchaseOrderId: true },
    });

    if (!bill || bill.orgId !== orgId) {
      return { success: false, error: "Vendor bill not found" };
    }

    if (!bill.purchaseOrderId) {
      return {
        success: false,
        error: "Vendor bill is not linked to a purchase order. Link it first.",
      };
    }

    const [po, billLines, orgDefaults] = await Promise.all([
      db.purchaseOrder.findUnique({
        where: { id: bill.purchaseOrderId },
        include: {
          lines: true,
          goodsReceipts: {
            where: { status: { not: "CANCELLED" } },
            include: { lines: true },
          },
        },
      }),
      db.vendorBillLine.findMany({ where: { vendorBillId: billId } }),
      db.orgDefaults.findUnique({
        where: { organizationId: orgId },
        select: { matchQtyTolerancePct: true, matchAmountTolerancePct: true },
      }),
    ]);

    if (!po || po.orgId !== orgId) {
      return { success: false, error: "Linked purchase order not found" };
    }

    const qtyTolerancePct = orgDefaults?.matchQtyTolerancePct ?? 5.0;
    const amountTolerancePct = orgDefaults?.matchAmountTolerancePct ?? 2.0;

    const poLines: PoLine[] = po.lines.map((l) => ({
      id: l.id,
      inventoryItemId: l.inventoryItemId,
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      lineTotal: Number(l.lineTotal),
    }));

    const grnLines: GrnLine[] = po.goodsReceipts.flatMap((grn) =>
      grn.lines.map((gl) => ({
        poLineId: gl.poLineId,
        acceptedQty: Number(gl.acceptedQty),
      })),
    );

    // Match bill lines to PO lines: by inventoryItemId first, then description, then position
    const mappedBillLines: BillLine[] = billLines.map((bl, idx) => {
      const byDesc = poLines.find(
        (pl) => pl.description.trim().toLowerCase() === bl.description.trim().toLowerCase(),
      );
      const matchedPoLine = byDesc ?? poLines[idx] ?? null;

      return {
        poLineId: matchedPoLine?.id ?? null,
        inventoryItemId: null,
        description: bl.description,
        quantity: bl.quantity,
        unitPrice: bl.unitPrice,
        lineTotal: bl.lineTotal,
      };
    });

    const matchOutput = computeThreeWayMatch({
      purchaseOrderId: po.id,
      poLines,
      grnLines,
      billLines: mappedBillLines,
      qtyTolerancePct,
      amountTolerancePct,
    });

    const matchResult = await db.threeWayMatchResult.upsert({
      where: {
        purchaseOrderId_vendorBillId: {
          purchaseOrderId: po.id,
          vendorBillId: billId,
        },
      },
      create: {
        orgId,
        purchaseOrderId: po.id,
        vendorBillId: billId,
        matchStatus: matchOutput.matchStatus,
        qtyMatchScore: matchOutput.qtyMatchScore,
        amountMatchScore: matchOutput.amountMatchScore,
        overallScore: matchOutput.overallScore,
        discrepancies: matchOutput.discrepancies as unknown as Prisma.InputJsonValue,
      },
      update: {
        matchStatus: matchOutput.matchStatus,
        qtyMatchScore: matchOutput.qtyMatchScore,
        amountMatchScore: matchOutput.amountMatchScore,
        overallScore: matchOutput.overallScore,
        discrepancies: matchOutput.discrepancies as unknown as Prisma.InputJsonValue,
        resolvedByUserId: null,
        resolvedAt: null,
        resolutionNote: null,
      },
      select: { id: true },
    });

    await db.vendorBill.update({
      where: { id: billId },
      data: { matchStatus: matchOutput.matchStatus },
    });

    void userId; // captured for future audit log use

    return {
      success: true,
      data: {
        matchResultId: matchResult.id,
        matchStatus: matchOutput.matchStatus,
        qtyMatchScore: matchOutput.qtyMatchScore,
        amountMatchScore: matchOutput.amountMatchScore,
        overallScore: matchOutput.overallScore,
        discrepancies: matchOutput.discrepancies,
      },
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 3. Resolve Match Discrepancy ────────────────────────────────────────────

export async function resolveMatchDiscrepancy(
  matchResultId: string,
  resolutionNote: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const matchResult = await db.threeWayMatchResult.findUnique({
      where: { id: matchResultId },
      select: { id: true, orgId: true, matchStatus: true, vendorBillId: true },
    });

    if (!matchResult || matchResult.orgId !== orgId) {
      return { success: false, error: "Match result not found" };
    }

    if (!resolutionNote?.trim()) {
      return { success: false, error: "Resolution note is required" };
    }

    await db.$transaction([
      db.threeWayMatchResult.update({
        where: { id: matchResultId },
        data: {
          matchStatus: MatchStatus.RESOLVED,
          resolvedByUserId: userId,
          resolvedAt: new Date(),
          resolutionNote: resolutionNote.trim(),
        },
      }),
      db.vendorBill.update({
        where: { id: matchResult.vendorBillId },
        data: { matchStatus: MatchStatus.RESOLVED },
      }),
    ]);

    return { success: true, data: { id: matchResultId } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 4. Waive Match Requirement ───────────────────────────────────────────────

export async function waiveMatchRequirement(
  matchResultId: string,
  resolutionNote: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");

    const matchResult = await db.threeWayMatchResult.findUnique({
      where: { id: matchResultId },
      select: { id: true, orgId: true, matchStatus: true, vendorBillId: true },
    });

    if (!matchResult || matchResult.orgId !== orgId) {
      return { success: false, error: "Match result not found" };
    }

    if (!resolutionNote?.trim()) {
      return { success: false, error: "Resolution note is required to waive a match requirement" };
    }

    await db.$transaction([
      db.threeWayMatchResult.update({
        where: { id: matchResultId },
        data: {
          matchStatus: MatchStatus.WAIVED,
          resolvedByUserId: userId,
          resolvedAt: new Date(),
          resolutionNote: resolutionNote.trim(),
        },
      }),
      db.vendorBill.update({
        where: { id: matchResult.vendorBillId },
        data: { matchStatus: MatchStatus.WAIVED },
      }),
    ]);

    return { success: true, data: { id: matchResultId } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── 5. Get Pending Match Results (read-only dashboard helper) ────────────────

export async function getPendingMatchResults(): Promise<ActionResult<Array<{
  id: string;
  matchStatus: MatchStatus;
  overallScore: number;
  purchaseOrder: { poNumber: string };
  vendorBill: { billNumber: string };
}>>> {
  try {
    const { orgId } = await requireOrgContext();

    const results = await db.threeWayMatchResult.findMany({
      where: {
        orgId,
        matchStatus: { in: [MatchStatus.MISMATCH, MatchStatus.PARTIAL_MATCH] },
      },
      select: {
        id: true,
        matchStatus: true,
        overallScore: true,
        purchaseOrder: { select: { poNumber: true } },
        vendorBill: { select: { billNumber: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
