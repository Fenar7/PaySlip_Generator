import "server-only";

import type { InvoiceStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export interface Gstr1B2bInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  placeOfSupply: string;
  reverseCharge: boolean;
  invoiceType: string;
}

export interface Gstr1B2bEntry {
  customerGstin: string;
  customerName: string;
  invoices: Gstr1B2bInvoice[];
}

export interface Gstr1B2cEntry {
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  placeOfSupply: string;
}

export interface Gstr1Summary {
  totalInvoices: number;
  totalB2b: number;
  totalB2c: number;
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalAmount: number;
  missingGstinCount: number;
}

export interface Gstr1Data {
  b2b: Gstr1B2bEntry[];
  b2c: Gstr1B2cEntry[];
  summary: Gstr1Summary;
}

export interface Gstr3bSummary {
  outwardSupplies: {
    b2b: { taxableValue: number; igst: number; cgst: number; sgst: number; cess: number };
    b2c: { taxableValue: number; igst: number; cgst: number; sgst: number; cess: number };
    nilRatedExempt: { taxableValue: number };
  };
  reverseCharge: { taxableValue: number; igst: number; cgst: number; sgst: number; cess: number };
  totalTaxLiability: { igst: number; cgst: number; sgst: number; cess: number };
}

export interface GstHealthIssue {
  invoiceId: string;
  invoiceNumber: string;
  issue: string;
  severity: "error" | "warning" | "info";
}

const GST_STATUSES: InvoiceStatus[] = ["ISSUED", "PAID", "PARTIALLY_PAID"];

export function isValidPeriodMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function getMonthDateRange(periodMonth: string): { startDate: string; endDate: string } {
  if (!isValidPeriodMonth(periodMonth)) {
    throw new Error("Invalid period format. Expected YYYY-MM.");
  }

  const [yearValue, monthValue] = periodMonth.split("-");
  const year = Number.parseInt(yearValue, 10);
  const month = Number.parseInt(monthValue, 10);
  const startDate = `${yearValue}-${monthValue}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${yearValue}-${monthValue}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function computeTaxable(invoice: {
  totalAmount: number;
  gstTotalCgst: number;
  gstTotalSgst: number;
  gstTotalIgst: number;
  gstTotalCess: number;
}): number {
  return (
    invoice.totalAmount -
    invoice.gstTotalCgst -
    invoice.gstTotalSgst -
    invoice.gstTotalIgst -
    invoice.gstTotalCess
  );
}

function inferInvoiceType(invoice: {
  reverseCharge: boolean;
  exportType: string | null;
}): string {
  if (invoice.exportType === "SEZ") return "SEWP";
  if (invoice.exportType === "EXPORT") return "EXPWP";
  return "Regular";
}

export async function listGstInvoicesForOrg(
  orgId: string,
  params?: {
    startDate?: string;
    endDate?: string;
  },
) {
  return db.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { in: GST_STATUSES },
      ...(params?.startDate && params?.endDate
        ? {
            invoiceDate: {
              gte: params.startDate,
              lte: params.endDate,
            },
          }
        : {}),
    },
    include: {
      customer: { select: { name: true, gstin: true } },
      lineItems: {
        select: {
          hsnCode: true,
          sacCode: true,
          cgstAmount: true,
          sgstAmount: true,
          igstAmount: true,
          cessAmount: true,
          gstType: true,
          amount: true,
        },
      },
    },
    orderBy: [{ invoiceDate: "asc" }, { invoiceNumber: "asc" }],
  });
}

export function computeGstr1DataFromInvoices(
  invoices: Awaited<ReturnType<typeof listGstInvoicesForOrg>>,
): Gstr1Data {
  const b2bMap = new Map<string, Gstr1B2bEntry>();
  const b2c: Gstr1B2cEntry[] = [];
  let missingGstinCount = 0;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalCess = 0;
  let totalAmount = 0;

  for (const inv of invoices) {
    const gstin = inv.customerGstin ?? inv.customer?.gstin ?? null;
    const taxable = computeTaxable(inv);

    totalTaxable += taxable;
    totalCgst += inv.gstTotalCgst;
    totalSgst += inv.gstTotalSgst;
    totalIgst += inv.gstTotalIgst;
    totalCess += inv.gstTotalCess;
    totalAmount += inv.totalAmount;

    if (gstin) {
      if (!b2bMap.has(gstin)) {
        b2bMap.set(gstin, {
          customerGstin: gstin,
          customerName: inv.customer?.name ?? "Unknown",
          invoices: [],
        });
      }

      b2bMap.get(gstin)?.invoices.push({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        totalAmount: inv.totalAmount,
        taxableAmount: taxable,
        cgst: inv.gstTotalCgst,
        sgst: inv.gstTotalSgst,
        igst: inv.gstTotalIgst,
        cess: inv.gstTotalCess,
        placeOfSupply: inv.placeOfSupply ?? "",
        reverseCharge: inv.reverseCharge,
        invoiceType: inferInvoiceType(inv),
      });
      continue;
    }

    if (inv.customerId) {
      missingGstinCount += 1;
    }

    b2c.push({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      totalAmount: inv.totalAmount,
      taxableAmount: taxable,
      cgst: inv.gstTotalCgst,
      sgst: inv.gstTotalSgst,
      igst: inv.gstTotalIgst,
      placeOfSupply: inv.placeOfSupply ?? "",
    });
  }

  const b2b = Array.from(b2bMap.values());
  const totalB2b = b2b.reduce((sum, entry) => sum + entry.invoices.length, 0);

  return {
    b2b,
    b2c,
    summary: {
      totalInvoices: invoices.length,
      totalB2b,
      totalB2c: b2c.length,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalCess,
      totalAmount,
      missingGstinCount,
    },
  };
}

export function computeGstr3bSummaryFromInvoices(
  invoices: Awaited<ReturnType<typeof listGstInvoicesForOrg>>,
): Gstr3bSummary {
  const b2b = { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
  const b2c = { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
  const nilRatedExempt = { taxableValue: 0 };
  const reverseCharge = { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };

  for (const inv of invoices) {
    const gstin = inv.customerGstin ?? inv.customer?.gstin ?? null;
    const taxable = computeTaxable(inv);
    const hasExemptLines = inv.lineItems.some((li) => li.gstType === "EXEMPT");

    if (hasExemptLines) {
      nilRatedExempt.taxableValue += inv.lineItems
        .filter((li) => li.gstType === "EXEMPT")
        .reduce((sum, li) => sum + li.amount, 0);
    }

    const bucket = gstin ? b2b : b2c;
    bucket.taxableValue += taxable;
    bucket.igst += inv.gstTotalIgst;
    bucket.cgst += inv.gstTotalCgst;
    bucket.sgst += inv.gstTotalSgst;
    bucket.cess += inv.gstTotalCess;

    if (inv.reverseCharge) {
      reverseCharge.taxableValue += taxable;
      reverseCharge.igst += inv.gstTotalIgst;
      reverseCharge.cgst += inv.gstTotalCgst;
      reverseCharge.sgst += inv.gstTotalSgst;
      reverseCharge.cess += inv.gstTotalCess;
    }
  }

  return {
    outwardSupplies: {
      b2b,
      b2c,
      nilRatedExempt,
    },
    reverseCharge,
    totalTaxLiability: {
      igst: b2b.igst + b2c.igst + reverseCharge.igst,
      cgst: b2b.cgst + b2c.cgst + reverseCharge.cgst,
      sgst: b2b.sgst + b2c.sgst + reverseCharge.sgst,
      cess: b2b.cess + b2c.cess + reverseCharge.cess,
    },
  };
}

export function computeGstHealthIssuesFromInvoices(
  invoices: Awaited<ReturnType<typeof listGstInvoicesForOrg>>,
): GstHealthIssue[] {
  const issues: GstHealthIssue[] = [];

  for (const inv of invoices) {
    if (inv.customerId && !inv.customerGstin && !inv.customer?.gstin) {
      issues.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issue: "Missing customer GSTIN — invoice will appear in B2C section",
        severity: "warning",
      });
    }

    const missingHsn = inv.lineItems.filter((li) => !li.hsnCode && !li.sacCode);
    if (missingHsn.length > 0) {
      issues.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issue: `${missingHsn.length} line item(s) missing HSN/SAC code`,
        severity: "error",
      });
    }

    const lineItemCgst = inv.lineItems.reduce((sum, li) => sum + li.cgstAmount, 0);
    const lineItemSgst = inv.lineItems.reduce((sum, li) => sum + li.sgstAmount, 0);
    const lineItemIgst = inv.lineItems.reduce((sum, li) => sum + li.igstAmount, 0);
    const lineItemCess = inv.lineItems.reduce((sum, li) => sum + li.cessAmount, 0);
    const tolerance = 0.01;

    if (
      Math.abs(lineItemCgst - inv.gstTotalCgst) > tolerance ||
      Math.abs(lineItemSgst - inv.gstTotalSgst) > tolerance ||
      Math.abs(lineItemIgst - inv.gstTotalIgst) > tolerance ||
      Math.abs(lineItemCess - inv.gstTotalCess) > tolerance
    ) {
      issues.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issue: "GST amounts on line items do not match invoice totals",
        severity: "error",
      });
    }

    if (!inv.placeOfSupply) {
      issues.push({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issue: "Missing place of supply",
        severity: "warning",
      });
    }
  }

  return issues;
}

export function exportGstr1CsvFromData(data: Gstr1Data): string {
  const headers = [
    "GSTIN",
    "Invoice Number",
    "Invoice Date",
    "Invoice Value",
    "Place of Supply",
    "Reverse Charge",
    "Invoice Type",
    "Rate",
    "Taxable Value",
    "Cess Amount",
    "CGST",
    "SGST",
    "IGST",
  ];

  const rows: string[] = [headers.join(",")];
  rows.push("--- B2B Invoices ---");

  for (const entry of data.b2b) {
    for (const inv of entry.invoices) {
      rows.push(
        [
          entry.customerGstin,
          inv.invoiceNumber,
          inv.invoiceDate,
          inv.totalAmount.toFixed(2),
          inv.placeOfSupply,
          inv.reverseCharge ? "Y" : "N",
          inv.invoiceType,
          "",
          inv.taxableAmount.toFixed(2),
          inv.cess.toFixed(2),
          inv.cgst.toFixed(2),
          inv.sgst.toFixed(2),
          inv.igst.toFixed(2),
        ].join(","),
      );
    }
  }

  rows.push("--- B2C Invoices ---");
  for (const inv of data.b2c) {
    rows.push(
      [
        "",
        inv.invoiceNumber,
        inv.invoiceDate,
        inv.totalAmount.toFixed(2),
        inv.placeOfSupply,
        "N",
        "Regular",
        "",
        inv.taxableAmount.toFixed(2),
        "0.00",
        inv.cgst.toFixed(2),
        inv.sgst.toFixed(2),
        inv.igst.toFixed(2),
      ].join(","),
    );
  }

  return rows.join("\n");
}

export async function getGstr1DataForOrg(
  orgId: string,
  params: { startDate: string; endDate: string },
): Promise<Gstr1Data> {
  const invoices = await listGstInvoicesForOrg(orgId, params);
  return computeGstr1DataFromInvoices(invoices);
}

export async function getGstr3bSummaryForOrg(
  orgId: string,
  params: { month: number; year: number },
): Promise<Gstr3bSummary> {
  const monthString = String(params.month).padStart(2, "0");
  const period = `${params.year}-${monthString}`;
  const invoices = await listGstInvoicesForOrg(orgId, getMonthDateRange(period));
  return computeGstr3bSummaryFromInvoices(invoices);
}

export async function getGstHealthCheckForOrg(orgId: string): Promise<{ issues: GstHealthIssue[] }> {
  const invoices = await listGstInvoicesForOrg(orgId);
  return { issues: computeGstHealthIssuesFromInvoices(invoices) };
}

export async function exportGstr1CsvForOrg(
  orgId: string,
  params: { startDate: string; endDate: string },
): Promise<string> {
  const data = await getGstr1DataForOrg(orgId, params);
  return exportGstr1CsvFromData(data);
}
