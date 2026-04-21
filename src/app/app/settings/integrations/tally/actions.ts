"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma, InvoiceStatus } from "@/generated/prisma/client";
import { formatIsoDate } from "@/lib/accounting/utils";

function dateToStr(d: Date): string {
  return d.toISOString().split("T")[0];
}
import {
  batchInvoicesToTallyXML,
  batchVouchersToTallyXML,
  parseTallyXml,
  type PaymentVoucherData,
  type InvoiceWithItems,
} from "@/lib/integrations/tally";
import { logAudit } from "@/lib/audit";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Export ───────────────────────────────────────────────────────────────────

export interface ExportTallyInput {
  fromDate: string; // ISO date string
  toDate: string;
  includeInvoices: boolean;
  includeVouchers: boolean;
}

export async function exportTallyData(
  input: ExportTallyInput
): Promise<ActionResult<{ xml: string; recordCount: number }>> {
  const { orgId } = await requireOrgContext();
  const from = new Date(input.fromDate);
  const to = new Date(input.toDate);
  to.setHours(23, 59, 59, 999);

  try {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });
    if (!org) return { success: false, error: "Organization not found" };

    let invoiceData: InvoiceWithItems[] = [];
    let voucherData: PaymentVoucherData[] = [];

    if (input.includeInvoices) {
      const invoices = await db.invoice.findMany({
        where: {
          organizationId: orgId,
          invoiceDate: { gte: dateToStr(from), lte: dateToStr(to) },
          status: { not: "DRAFT" },
        },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          totalAmount: true,
          notes: true,
          formData: true,
          customer: { select: { name: true, gstin: true } },
          organization: { select: { name: true } },
        },
      });

      invoiceData = invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: formatIsoDate(inv.invoiceDate),
        totalAmount: Number(inv.totalAmount),
        notes: inv.notes,
        formData: (inv.formData as Record<string, unknown>) ?? {},
        lineItems: [],
        customer: inv.customer
          ? { name: inv.customer.name, gstin: inv.customer.gstin }
          : null,
        organization: { name: inv.organization.name },
      }));
    }

    if (input.includeVouchers) {
      const vouchers = await db.voucher.findMany({
        where: {
          organizationId: orgId,
          voucherDate: { gte: dateToStr(from), lte: dateToStr(to) },
        },
        select: {
          id: true,
          voucherNumber: true,
          voucherDate: true,
          type: true,
          totalAmount: true,
          formData: true,
        },
      });

      voucherData = vouchers.map((v) => {
        const fd = (v.formData ?? {}) as Record<string, unknown>;
        const partyName = (fd.partyName as string | undefined) ?? "Cash";
        const notes = (fd.notes as string | undefined) ?? undefined;
        return {
          id: v.id,
          voucherNumber: v.voucherNumber,
          date: v.voucherDate,
          voucherType: mapVoucherType(v.type),
          debitLedger: partyName,
          creditLedger: mapCreditLedger(v.type),
          amount: Number(v.totalAmount),
          narration: notes,
        };
      });
    }

    const xml =
      invoiceData.length > 0 && voucherData.length === 0
        ? batchInvoicesToTallyXML(invoiceData)
        : voucherData.length > 0 && invoiceData.length === 0
          ? batchVouchersToTallyXML(voucherData)
          : buildCombinedXml(invoiceData, voucherData, org.name);

    const recordCount = invoiceData.length + voucherData.length;

    await logAudit({
      orgId,
      actorId: (await requireOrgContext()).userId,
      action: "tally.export",
      entityType: "integration",
      metadata: { recordCount, from: input.fromDate, to: input.toDate },
    });

    return { success: true, data: { xml, recordCount } };
  } catch (err) {
    console.error("Tally export error:", err);
    return { success: false, error: "Failed to generate Tally XML" };
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportTallyInput {
  xmlContent: string;
  fileName: string;
  dryRun?: boolean;
}

export interface ImportPreviewRow {
  type: "invoice" | "voucher";
  voucherNumber: string;
  date: string;
  party: string;
  amount: number;
  isDuplicate: boolean;
}

export async function previewTallyImport(
  input: ImportTallyInput
): Promise<ActionResult<{ rows: ImportPreviewRow[]; errors: string[] }>> {
  const { orgId } = await requireOrgContext();

  const parsed = parseTallyXml(input.xmlContent);
  const rows: ImportPreviewRow[] = [];

  // Check for duplicate invoice numbers
  const existingInvoiceNumbers = new Set(
    (
      await db.invoice.findMany({
        where: { organizationId: orgId },
        select: { invoiceNumber: true },
      })
    ).map((i) => i.invoiceNumber)
  );

  const existingVoucherNumbers = new Set(
    (
      await db.voucher.findMany({
        where: { organizationId: orgId },
        select: { voucherNumber: true },
      })
    ).map((v) => v.voucherNumber)
  );

  for (const sv of parsed.salesVouchers) {
    rows.push({
      type: "invoice",
      voucherNumber: sv.voucherNumber,
      date: sv.date,
      party: sv.partyName,
      amount: sv.totalAmount,
      isDuplicate: existingInvoiceNumbers.has(sv.voucherNumber),
    });
  }
  for (const pv of parsed.paymentVouchers) {
    rows.push({
      type: "voucher",
      voucherNumber: pv.voucherNumber,
      date: pv.date,
      party: pv.debitLedger,
      amount: pv.amount,
      isDuplicate: existingVoucherNumbers.has(pv.voucherNumber),
    });
  }

  return {
    success: true,
    data: {
      rows,
      errors: parsed.errors.map((e) => e.message),
    },
  };
}

export async function confirmTallyImport(
  input: ImportTallyInput
): Promise<ActionResult<{ imported: number; skipped: number; errors: string[] }>> {
  const ctx = await requireOrgContext();
  const { orgId, userId } = ctx;
  await requireRole("admin");

  const parsed = parseTallyXml(input.xmlContent);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  const existingInvoiceNumbers = new Set(
    (
      await db.invoice.findMany({
        where: { organizationId: orgId },
        select: { invoiceNumber: true },
      })
    ).map((i) => i.invoiceNumber)
  );

  for (const sv of parsed.salesVouchers) {
    if (existingInvoiceNumbers.has(sv.voucherNumber)) {
      skipped++;
      continue;
    }
    try {
      const [day, month, year] = sv.date.split("-").map(Number);
      await db.invoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber: sv.voucherNumber,
          invoiceDate: `${String(year)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          totalAmount: sv.totalAmount,
          status: InvoiceStatus.ISSUED,
          formData: {
            importSource: "tally",
            partyName: sv.partyName,
            partyGstin: sv.partyGstin,
          },
        },
      });
      imported++;
    } catch (err) {
      errors.push(`Invoice ${sv.voucherNumber}: ${String(err)}`);
    }
  }

  await db.tallyImportLog.create({
    data: {
      orgId,
      fileName: input.fileName,
      importedBy: userId,
      recordCount: imported,
      errorCount: errors.length,
      status:
        errors.length === 0
          ? "completed"
          : imported > 0
            ? "partial"
            : "failed",
      errorDetails: errors.length > 0 ? (errors as Prisma.JsonArray) : Prisma.JsonNull,
    },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "tally.import",
    entityType: "integration",
    metadata: { imported, skipped, errors: errors.length, file: input.fileName },
  });

  return {
    success: true,
    data: { imported, skipped, errors },
  };
}

export async function getTallyImportHistory(): Promise<
  ActionResult<
    Array<{
      id: string;
      fileName: string;
      importedAt: Date;
      recordCount: number;
      errorCount: number;
      status: string;
    }>
  >
> {
  const { orgId } = await requireOrgContext();
  const logs = await db.tallyImportLog.findMany({
    where: { orgId },
    orderBy: { importedAt: "desc" },
    take: 20,
  });
  return { success: true, data: logs };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapVoucherType(
  vt: string
): "Payment" | "Receipt" | "Journal" {
  if (vt === "receipt") return "Receipt";
  if (vt === "journal") return "Journal";
  return "Payment";
}

function mapCreditLedger(voucherType: string): string {
  if (voucherType === "receipt") return "Cash";
  return "Bank Account";
}

function buildCombinedXml(
  invoices: InvoiceWithItems[],
  vouchers: PaymentVoucherData[],
  companyName: string
): string {
  // Import both in a single envelope
  const invoiceXml = invoices.map((inv) => {
    const partyName = inv.customer?.name ?? "Cash";
    const tallyDate = formatIsoDate(inv.invoiceDate).replace(/-/g, "");
    return [
      `        <TALLYMESSAGE xmlns:UDF="TallyUDF">`,
      `          <VOUCHER VCHTYPE="Sales" ACTION="Create">`,
      `            <DATE>${tallyDate}</DATE>`,
      `            <VOUCHERNUMBER>${inv.invoiceNumber}</VOUCHERNUMBER>`,
      `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>`,
      `            <ALLLEDGERENTRIES.LIST>`,
      `              <LEDGERNAME>${partyName}</LEDGERNAME>`,
      `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>`,
      `              <AMOUNT>${Number(inv.totalAmount).toFixed(2)}</AMOUNT>`,
      `            </ALLLEDGERENTRIES.LIST>`,
      `          </VOUCHER>`,
      `        </TALLYMESSAGE>`,
    ].join("\n");
  });

  const voucherXml = vouchers.map((v) => {
    const tallyDate = v.date.replace(/-/g, "");
    return [
      `        <TALLYMESSAGE xmlns:UDF="TallyUDF">`,
      `          <VOUCHER VCHTYPE="${v.voucherType}" ACTION="Create">`,
      `            <DATE>${tallyDate}</DATE>`,
      `            <VOUCHERNUMBER>${v.voucherNumber}</VOUCHERNUMBER>`,
      `            <ALLLEDGERENTRIES.LIST>`,
      `              <LEDGERNAME>${v.debitLedger}</LEDGERNAME>`,
      `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>`,
      `              <AMOUNT>-${v.amount.toFixed(2)}</AMOUNT>`,
      `            </ALLLEDGERENTRIES.LIST>`,
      `            <ALLLEDGERENTRIES.LIST>`,
      `              <LEDGERNAME>${v.creditLedger}</LEDGERNAME>`,
      `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>`,
      `              <AMOUNT>${v.amount.toFixed(2)}</AMOUNT>`,
      `            </ALLLEDGERENTRIES.LIST>`,
      `          </VOUCHER>`,
      `        </TALLYMESSAGE>`,
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<ENVELOPE>",
    "  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>",
    "  <BODY>",
    "    <IMPORTDATA>",
    "      <REQUESTDESC>",
    "        <REPORTNAME>All Masters</REPORTNAME>",
    `        <STATICVARIABLES><SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY></STATICVARIABLES>`,
    "      </REQUESTDESC>",
    "      <REQUESTDATA>",
    ...invoiceXml,
    ...voucherXml,
    "      </REQUESTDATA>",
    "    </IMPORTDATA>",
    "  </BODY>",
    "</ENVELOPE>",
  ].join("\n");
}
