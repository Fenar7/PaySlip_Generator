"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import type { InvoiceStatus } from "@/generated/prisma/client";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// ── Types ──────────────────────────────────────────────────────────────

interface Gstr1B2bInvoice {
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

interface Gstr1B2bEntry {
  customerGstin: string;
  customerName: string;
  invoices: Gstr1B2bInvoice[];
}

interface Gstr1B2cEntry {
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  placeOfSupply: string;
}

interface Gstr1Summary {
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

// ── Helpers ────────────────────────────────────────────────────────────

const GST_STATUSES: InvoiceStatus[] = ["ISSUED", "PAID", "PARTIALLY_PAID"];

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

// ── getGstr1Data ───────────────────────────────────────────────────────

export async function getGstr1Data(params: {
  startDate: string;
  endDate: string;
}): Promise<ActionResult<Gstr1Data>> {
  try {
    const { orgId } = await requireOrgContext();
    const allowed = await checkFeature(orgId, "gstrExport");
    if (!allowed) {
      return { success: false, error: "GSTR Export requires a Pro plan or above." };
    }

    const invoices = await db.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: GST_STATUSES },
        invoiceDate: { gte: params.startDate, lte: params.endDate },
      },
      include: {
        customer: { select: { name: true, gstin: true } },
      },
      orderBy: { invoiceDate: "asc" },
    });

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
        b2bMap.get(gstin)!.invoices.push({
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
      } else {
        // If customer exists but GSTIN is missing, might be a B2B that should have GSTIN
        if (inv.customerId) missingGstinCount++;
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
    }

    const b2b = Array.from(b2bMap.values());
    const totalB2b = b2b.reduce((sum, entry) => sum + entry.invoices.length, 0);

    return {
      success: true,
      data: {
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
      },
    };
  } catch (error) {
    console.error("[getGstr1Data]", error);
    return { success: false, error: "Failed to load GSTR-1 data." };
  }
}

// ── getGstr3bSummary ───────────────────────────────────────────────────

export async function getGstr3bSummary(params: {
  month: number;
  year: number;
}): Promise<ActionResult<Gstr3bSummary>> {
  try {
    const { orgId } = await requireOrgContext();
    const allowed = await checkFeature(orgId, "gstrExport");
    if (!allowed) {
      return { success: false, error: "GSTR Export requires a Pro plan or above." };
    }

    // Build month date range as strings (YYYY-MM-DD)
    const startDate = `${params.year}-${String(params.month).padStart(2, "0")}-01`;
    const lastDay = new Date(params.year, params.month, 0).getDate();
    const endDate = `${params.year}-${String(params.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const invoices = await db.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: GST_STATUSES },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        customer: { select: { gstin: true } },
        lineItems: { select: { gstType: true, amount: true } },
      },
    });

    const b2b = { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
    const b2c = { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
    const nilRated = { taxableValue: 0 };
    const reverseCharge = { taxableValue: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };

    for (const inv of invoices) {
      const gstin = inv.customerGstin ?? inv.customer?.gstin ?? null;
      const taxable = computeTaxable(inv);

      // Check for nil-rated / exempt line items
      const hasExemptLines = inv.lineItems.some((li) => li.gstType === "EXEMPT");
      const allExempt = inv.lineItems.length > 0 && inv.lineItems.every((li) => li.gstType === "EXEMPT");

      if (allExempt) {
        nilRated.taxableValue += taxable;
      } else if (inv.reverseCharge) {
        reverseCharge.taxableValue += taxable;
        reverseCharge.igst += inv.gstTotalIgst;
        reverseCharge.cgst += inv.gstTotalCgst;
        reverseCharge.sgst += inv.gstTotalSgst;
        reverseCharge.cess += inv.gstTotalCess;
      } else if (gstin) {
        b2b.taxableValue += taxable;
        b2b.igst += inv.gstTotalIgst;
        b2b.cgst += inv.gstTotalCgst;
        b2b.sgst += inv.gstTotalSgst;
        b2b.cess += inv.gstTotalCess;

        // Nil-rated portion from mixed invoices
        if (hasExemptLines) {
          const exemptAmount = inv.lineItems
            .filter((li) => li.gstType === "EXEMPT")
            .reduce((sum, li) => sum + li.amount, 0);
          nilRated.taxableValue += exemptAmount;
        }
      } else {
        b2c.taxableValue += taxable;
        b2c.igst += inv.gstTotalIgst;
        b2c.cgst += inv.gstTotalCgst;
        b2c.sgst += inv.gstTotalSgst;
        b2c.cess += inv.gstTotalCess;
      }
    }

    return {
      success: true,
      data: {
        outwardSupplies: { b2b, b2c, nilRatedExempt: nilRated },
        reverseCharge,
        totalTaxLiability: {
          igst: b2b.igst + b2c.igst + reverseCharge.igst,
          cgst: b2b.cgst + b2c.cgst + reverseCharge.cgst,
          sgst: b2b.sgst + b2c.sgst + reverseCharge.sgst,
          cess: b2b.cess + b2c.cess + reverseCharge.cess,
        },
      },
    };
  } catch (error) {
    console.error("[getGstr3bSummary]", error);
    return { success: false, error: "Failed to load GSTR-3B summary." };
  }
}

// ── exportGstr1Csv ─────────────────────────────────────────────────────

export async function exportGstr1Csv(params: {
  startDate: string;
  endDate: string;
}): Promise<ActionResult<string>> {
  try {
    const result = await getGstr1Data(params);
    if (!result.success) return result;

    const { b2b, b2c } = result.data;
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

    // B2B Section
    rows.push("--- B2B Invoices ---");
    for (const entry of b2b) {
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
          ].join(",")
        );
      }
    }

    // B2C Section
    rows.push("--- B2C Invoices ---");
    for (const inv of b2c) {
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
        ].join(",")
      );
    }

    return { success: true, data: rows.join("\n") };
  } catch (error) {
    console.error("[exportGstr1Csv]", error);
    return { success: false, error: "Failed to export GSTR-1 CSV." };
  }
}

// ── getGstHealthCheck ──────────────────────────────────────────────────

export async function getGstHealthCheck(): Promise<
  ActionResult<{ issues: GstHealthIssue[] }>
> {
  try {
    const { orgId } = await requireOrgContext();

    const invoices = await db.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: GST_STATUSES },
      },
      include: {
        customer: { select: { gstin: true } },
        lineItems: {
          select: {
            hsnCode: true,
            sacCode: true,
            cgstAmount: true,
            sgstAmount: true,
            igstAmount: true,
            cessAmount: true,
          },
        },
      },
    });

    const issues: GstHealthIssue[] = [];

    for (const inv of invoices) {
      // Missing GSTIN for B2B candidates (has customer but no GSTIN)
      if (inv.customerId && !inv.customerGstin && !inv.customer?.gstin) {
        issues.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          issue: "Missing customer GSTIN — invoice will appear in B2C section",
          severity: "warning",
        });
      }

      // Missing HSN/SAC codes on line items
      const missingHsn = inv.lineItems.filter(
        (li) => !li.hsnCode && !li.sacCode
      );
      if (missingHsn.length > 0) {
        issues.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          issue: `${missingHsn.length} line item(s) missing HSN/SAC code`,
          severity: "error",
        });
      }

      // GST amount mismatch between line items and invoice totals
      const lineItemCgst = inv.lineItems.reduce((s, li) => s + li.cgstAmount, 0);
      const lineItemSgst = inv.lineItems.reduce((s, li) => s + li.sgstAmount, 0);
      const lineItemIgst = inv.lineItems.reduce((s, li) => s + li.igstAmount, 0);
      const lineItemCess = inv.lineItems.reduce((s, li) => s + li.cessAmount, 0);

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

      // Invalid / missing place of supply
      if (!inv.placeOfSupply) {
        issues.push({
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          issue: "Missing place of supply",
          severity: "warning",
        });
      }
    }

    return { success: true, data: { issues } };
  } catch (error) {
    console.error("[getGstHealthCheck]", error);
    return { success: false, error: "Failed to run GST health check." };
  }
}
