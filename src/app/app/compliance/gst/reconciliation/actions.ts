"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { Gstr2bImportStatus, Gstr2bMatchStatus } from "@/generated/prisma/client";
import { formatIsoDate, toAccountingNumber } from "@/lib/accounting/utils";
import {
  runGstr2bReconciliation,
  parseGstr2bJson,
  type Gstr2bEntryInput,
} from "@/lib/compliance/gstr2b-match";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// ─── Import GSTR-2B JSON ──────────────────────────────────────────────────────

export async function importGstr2bJson(
  rawJson: unknown,
  period: string // "YYYY-MM"
): Promise<ActionResult<{ importId: string; totalEntries: number }>> {
  const { orgId, userId } = await requireRole("admin");

  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return { success: false, error: "Invalid period format. Use YYYY-MM." };
  }

  let entries: Omit<Gstr2bEntryInput, "id">[];
  try {
    entries = parseGstr2bJson(rawJson);
  } catch {
    return { success: false, error: "Failed to parse GSTR-2B JSON. Check file format." };
  }

  if (entries.length === 0) {
    return { success: false, error: "No valid B2B or CDNR entries found in the uploaded file." };
  }

  const gstr2bImport = await db.$transaction(async (tx) => {
    const imp = await tx.gstr2bImport.create({
      data: {
        orgId,
        period,
        rawJson: rawJson as object,
        importedByUserId: userId,
        status: Gstr2bImportStatus.PARSED,
        totalEntries: entries.length,
      },
    });

    await tx.gstr2bEntry.createMany({
      data: entries.map((e) => ({
        importId: imp.id,
        orgId,
        supplierGstin: e.supplierGstin,
        docNumber: e.docNumber,
        docDate: e.docDate,
        docType: e.docType ?? "",
        taxableAmount: e.taxableAmount,
        cgst: e.cgst,
        sgst: e.sgst,
        igst: e.igst,
        totalTax: e.totalTax,
        matchStatus: Gstr2bMatchStatus.UNMATCHED,
      })),
    });

    return imp;
  });

  return {
    success: true,
    data: { importId: gstr2bImport.id, totalEntries: entries.length },
  };
}

// ─── Run Reconciliation ───────────────────────────────────────────────────────

export async function runGstr2bReconcile(
  importId: string
): Promise<ActionResult<{ matched: number; notInBooks: number; notInGstr2b: number }>> {
  const { orgId } = await requireRole("admin");

  const imp = await db.gstr2bImport.findUnique({
    where: { id: importId },
    include: { entries: true },
  });

  if (!imp || imp.orgId !== orgId) {
    return { success: false, error: "GSTR-2B import not found." };
  }
  if (imp.status === Gstr2bImportStatus.RECONCILED) {
    return { success: false, error: "This import has already been reconciled." };
  }

  await db.gstr2bImport.update({
    where: { id: importId },
    data: { status: Gstr2bImportStatus.RECONCILING },
  });

  // Fetch vendor bills for the period
  const [year, month] = imp.period.split("-");
  const periodStart = new Date(`${year}-${month}-01`);
  const periodEnd = new Date(
    new Date(periodStart).setMonth(periodStart.getMonth() + 1)
  );

  const bills = await db.vendorBill.findMany({
    where: {
      orgId,
      // billDate is stored as a string "YYYY-MM-DD" — use string comparison for the period
      billDate: {
        gte: periodStart.toISOString().split("T")[0],
        lt: periodEnd.toISOString().split("T")[0],
      },
    },
    include: { vendor: true },
  });

  const billRecords = bills.map((b) => ({
    id: b.id,
    vendorGstin: b.vendor?.gstin ?? null,
    billNumber: b.billNumber,
    billDate: formatIsoDate(b.billDate),
    taxableAmount: toAccountingNumber(b.subtotalAmount),
    cgst: toAccountingNumber(b.gstTotalCgst),
    sgst: toAccountingNumber(b.gstTotalSgst),
    igst: toAccountingNumber(b.gstTotalIgst),
  }));

  const entryInputs: Gstr2bEntryInput[] = imp.entries.map((e) => ({
    id: e.id,
    supplierGstin: e.supplierGstin,
    supplierName: e.supplierName ?? undefined,
    docNumber: e.docNumber,
    docDate: e.docDate,
    docType: e.docType,
    taxableAmount: Number(e.taxableAmount),
    cgst: Number(e.cgst),
    sgst: Number(e.sgst),
    igst: Number(e.igst),
    totalTax: Number(e.totalTax),
  }));

  const { results, notInGstr2b } = runGstr2bReconciliation(entryInputs, billRecords);

  let matchedCount = 0;
  let notInBooksCount = 0;
  let mismatchCount = 0;

  await db.$transaction(async (tx) => {
    for (const r of results) {
      await tx.gstr2bEntry.update({
        where: { id: r.entryId },
        data: {
          matchStatus: r.matchStatus,
          matchedBillId: r.matchedBillId,
          matchConfidence: r.matchConfidence,
          matchNote: r.matchNote,
        },
      });
      if (r.matchStatus === Gstr2bMatchStatus.AUTO_MATCHED) matchedCount++;
      else if (r.matchStatus === Gstr2bMatchStatus.NOT_IN_BOOKS) notInBooksCount++;
      else if (r.matchStatus === Gstr2bMatchStatus.MISMATCH) mismatchCount++;
    }

    await tx.gstr2bImport.update({
      where: { id: importId },
      data: {
        status: Gstr2bImportStatus.RECONCILED,
        matchedCount,
        unmatchedCount: results.filter((r) => r.matchStatus === Gstr2bMatchStatus.UNMATCHED || r.matchStatus === Gstr2bMatchStatus.SUGGESTED).length,
        mismatchCount,
        notInBooksCount,
      },
    });
  });

  return {
    success: true,
    data: { matched: matchedCount, notInBooks: notInBooksCount, notInGstr2b: notInGstr2b.length },
  };
}

// ─── Get Import Details ───────────────────────────────────────────────────────

export async function getGstr2bImport(importId: string) {
  const { orgId } = await requireOrgContext();

  const imp = await db.gstr2bImport.findUnique({
    where: { id: importId },
    include: {
      entries: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!imp || imp.orgId !== orgId) return null;
  return imp;
}

export async function listGstr2bImports() {
  const { orgId } = await requireOrgContext();

  return db.gstr2bImport.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Manual Match Override ────────────────────────────────────────────────────

export async function manuallyMatchEntry(
  entryId: string,
  billId: string | null,
  note: string
): Promise<ActionResult<void>> {
  const { orgId, userId } = await requireRole("admin");

  const entry = await db.gstr2bEntry.findUnique({
    where: { id: entryId },
    include: { import: true },
  });

  if (!entry || entry.import.orgId !== orgId) {
    return { success: false, error: "Entry not found." };
  }

  await db.gstr2bEntry.update({
    where: { id: entryId },
    data: {
      matchStatus: billId ? Gstr2bMatchStatus.MANUALLY_MATCHED : Gstr2bMatchStatus.NOT_IN_BOOKS,
      matchedBillId: billId,
      matchConfidence: billId ? 1.0 : 0,
      matchNote: note || "Manually reconciled",
      reconciledByUserId: userId,
      reconciledAt: new Date(),
    },
  });

  return { success: true, data: undefined };
}
