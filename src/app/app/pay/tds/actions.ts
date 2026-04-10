"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { revalidatePath } from "next/cache";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateTdsInput {
  invoiceId: string;
  tdsSection: string;
  tdsRate: number;
  deductorTan?: string;
  notes?: string;
}

export interface UpdateTdsCertInput {
  tdsRecordId: string;
  certNumber: string;
  certDate: string;
  certFilePath?: string;
}

import { getCurrentFY, getCurrentQuarter, TDS_SECTIONS } from "./utils";

const TDS_PATH = "/app/pay/tds";

// ─── 1. Create TDS Record ───────────────────────────────────────────────────

export async function createTdsRecord(
  input: CreateTdsInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const hasFeature = await checkFeature(orgId, "tdsTracking");
    if (!hasFeature) {
      return {
        success: false,
        error: "TDS tracking requires Starter plan or higher",
      };
    }

    const invoice = await db.invoice.findUnique({
      where: { id: input.invoiceId },
      select: { id: true, organizationId: true, totalAmount: true },
    });

    if (!invoice || invoice.organizationId !== orgId) {
      return { success: false, error: "Invoice not found" };
    }

    const tdsAmount = invoice.totalAmount * (input.tdsRate / 100);

    const validSections = Object.keys(TDS_SECTIONS);
    if (!validSections.includes(input.tdsSection)) {
      return { success: false, error: "Invalid TDS section" };
    }

    const record = await db.tdsRecord.create({
      data: {
        organizationId: orgId,
        invoiceId: input.invoiceId,
        tdsSection: input.tdsSection as keyof typeof TDS_SECTIONS,
        tdsRate: input.tdsRate,
        tdsAmount,
        financialYear: getCurrentFY(),
        quarter: getCurrentQuarter(),
        deductorTan: input.deductorTan,
        notes: input.notes,
      },
    });

    revalidatePath(TDS_PATH);
    return { success: true, data: { id: record.id } };
  } catch (error) {
    console.error("createTdsRecord error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create TDS record",
    };
  }
}

// ─── 2. Update TDS Certificate ──────────────────────────────────────────────

export async function updateTdsCert(
  input: UpdateTdsCertInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const record = await db.tdsRecord.findUnique({
      where: { id: input.tdsRecordId },
      select: { id: true, organizationId: true, certStatus: true },
    });

    if (!record || record.organizationId !== orgId) {
      return { success: false, error: "TDS record not found" };
    }

    const updated = await db.tdsRecord.update({
      where: { id: input.tdsRecordId },
      data: {
        certStatus: "CERT_RECEIVED",
        certNumber: input.certNumber,
        certDate: new Date(input.certDate),
        certFilePath: input.certFilePath,
      },
    });

    revalidatePath(TDS_PATH);
    return { success: true, data: { id: updated.id } };
  } catch (error) {
    console.error("updateTdsCert error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update certificate",
    };
  }
}

// ─── 3. Mark TDS Filed ──────────────────────────────────────────────────────

export async function markTdsFiled(
  tdsRecordId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const record = await db.tdsRecord.findUnique({
      where: { id: tdsRecordId },
      select: { id: true, organizationId: true, certStatus: true },
    });

    if (!record || record.organizationId !== orgId) {
      return { success: false, error: "TDS record not found" };
    }

    if (record.certStatus !== "CERT_RECEIVED") {
      return {
        success: false,
        error: "Only records with received certificates can be marked as filed",
      };
    }

    const updated = await db.tdsRecord.update({
      where: { id: tdsRecordId },
      data: { certStatus: "FILED" },
    });

    revalidatePath(TDS_PATH);
    return { success: true, data: { id: updated.id } };
  } catch (error) {
    console.error("markTdsFiled error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to mark as filed",
    };
  }
}

// ─── 4. Delete TDS Record ───────────────────────────────────────────────────

export async function deleteTdsRecord(
  tdsRecordId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireRole("admin");

    const record = await db.tdsRecord.findUnique({
      where: { id: tdsRecordId },
      select: { id: true, organizationId: true, certStatus: true },
    });

    if (!record || record.organizationId !== orgId) {
      return { success: false, error: "TDS record not found" };
    }

    if (record.certStatus !== "PENDING_CERT") {
      return {
        success: false,
        error: "Only pending TDS records can be deleted",
      };
    }

    await db.tdsRecord.delete({ where: { id: tdsRecordId } });

    revalidatePath(TDS_PATH);
    return { success: true, data: { id: tdsRecordId } };
  } catch (error) {
    console.error("deleteTdsRecord error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete TDS record",
    };
  }
}

// ─── 5. List TDS Records ────────────────────────────────────────────────────

export async function getTdsRecords(params: {
  financialYear?: string;
  quarter?: string;
  certStatus?: string;
}): Promise<
  ActionResult<
    Array<{
      id: string;
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: string;
      invoiceAmount: number;
      tdsSection: string;
      tdsRate: number;
      tdsAmount: number;
      certStatus: string;
      certNumber: string | null;
      certDate: Date | null;
      deductorTan: string | null;
      financialYear: string;
      quarter: string;
      notes: string | null;
      createdAt: Date;
    }>
  >
> {
  try {
    const { orgId } = await requireOrgContext();

    const hasFeature = await checkFeature(orgId, "tdsTracking");
    if (!hasFeature) {
      return {
        success: false,
        error: "TDS tracking requires Starter plan or higher",
      };
    }

    const where: Record<string, unknown> = { organizationId: orgId };
    if (params.financialYear) where.financialYear = params.financialYear;
    if (params.quarter) where.quarter = params.quarter;
    if (params.certStatus) where.certStatus = params.certStatus;

    const records = await db.tdsRecord.findMany({
      where,
      include: {
        invoice: {
          select: { invoiceNumber: true, invoiceDate: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: records.map((r) => ({
        id: r.id,
        invoiceId: r.invoiceId,
        invoiceNumber: r.invoice.invoiceNumber,
        invoiceDate: r.invoice.invoiceDate,
        invoiceAmount: r.invoice.totalAmount,
        tdsSection: r.tdsSection,
        tdsRate: r.tdsRate,
        tdsAmount: r.tdsAmount,
        certStatus: r.certStatus,
        certNumber: r.certNumber,
        certDate: r.certDate,
        deductorTan: r.deductorTan,
        financialYear: r.financialYear,
        quarter: r.quarter,
        notes: r.notes,
        createdAt: r.createdAt,
      })),
    };
  } catch (error) {
    console.error("getTdsRecords error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load TDS records",
    };
  }
}

// ─── 6. Export TDS CSV ──────────────────────────────────────────────────────

export async function exportTdsCsv(params: {
  financialYear: string;
  quarter?: string;
}): Promise<ActionResult<string>> {
  try {
    const { orgId } = await requireOrgContext();

    const hasFeature = await checkFeature(orgId, "tdsTracking");
    if (!hasFeature) {
      return {
        success: false,
        error: "TDS tracking requires Starter plan or higher",
      };
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      financialYear: params.financialYear,
    };
    if (params.quarter) where.quarter = params.quarter;

    const records = await db.tdsRecord.findMany({
      where,
      include: {
        invoice: {
          select: { invoiceNumber: true, invoiceDate: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const header =
      "Invoice No,Invoice Date,Amount,TDS Section,TDS Rate (%),TDS Amount,Cert Status,Cert Number";

    const rows = records.map((r) =>
      [
        r.invoice.invoiceNumber,
        r.invoice.invoiceDate,
        r.invoice.totalAmount.toFixed(2),
        r.tdsSection,
        r.tdsRate.toFixed(2),
        r.tdsAmount.toFixed(2),
        r.certStatus,
        r.certNumber ?? "",
      ].join(","),
    );

    const csv = [header, ...rows].join("\n");

    return { success: true, data: csv };
  } catch (error) {
    console.error("exportTdsCsv error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export CSV",
    };
  }
}
