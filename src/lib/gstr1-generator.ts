import "server-only";

import { db } from "@/lib/db";
import { formatIsoDate, toAccountingNumber } from "@/lib/accounting/utils";

export interface GSTR1Report {
  gstin: string;
  fp: string; // filing period "MMYYYY"
  b2b: B2BEntry[];
  b2cs: B2CSEntry[];
  b2cl: B2CLEntry[];
  summary: {
    totalInvoices: number;
    totalTaxableValue: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalCess: number;
    totalValue: number;
  };
}

export interface B2BEntry {
  ctin: string; // customer GSTIN
  inv: Array<{
    inum: string; // invoice number
    idt: string; // invoice date DD-MM-YYYY
    val: number; // invoice value (total)
    pos: string; // place of supply (state code)
    rchrg: "Y" | "N"; // reverse charge
    itms: Array<{
      num: number; // item serial
      itm_det: {
        rt: number; // rate
        txval: number; // taxable value
        camt: number; // CGST
        samt: number; // SGST
        iamt: number; // IGST
        csamt: number; // cess
      };
    }>;
  }>;
}

export interface B2CSEntry {
  sply_ty: "INTRA" | "INTER";
  pos: string; // place of supply
  rt: number; // rate
  txval: number; // taxable value
  camt: number; // CGST
  samt: number; // SGST
  iamt: number; // IGST
  csamt: number; // cess
}

export interface B2CLEntry {
  pos: string; // place of supply
  inv: Array<{
    inum: string;
    idt: string;
    val: number;
    itms: Array<{
      num: number;
      itm_det: {
        rt: number;
        txval: number;
        iamt: number;
        csamt: number;
      };
    }>;
  }>;
}

/**
 * Generate GSTR-1 return data for a given organization and period.
 * Period format: "YYYY-MM" (e.g., "2026-03")
 */
export async function generateGSTR1(
  orgId: string,
  period: string,
): Promise<GSTR1Report> {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new Error("Invalid period format. Expected YYYY-MM");

  const year = parseInt(match[1]);
  const month = parseInt(match[2]);

  // 1. Fetch org GSTIN
  const orgDefaults = await db.orgDefaults.findUnique({
    where: { organizationId: orgId },
    select: { gstin: true, gstStateCode: true },
  });

  const gstin = orgDefaults?.gstin ?? "";
  const orgStateCode = orgDefaults?.gstStateCode ?? extractStateCode(orgDefaults?.gstin) ?? "";

  // 2. Fetch invoices for the period
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const invoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["PAID", "ISSUED", "PARTIALLY_PAID"] },
      invoiceDate: { gte: startDate, lt: endDate },
    },
    include: {
      customer: { select: { gstin: true, address: true } },
      lineItems: true,
    },
  });

  // 3. Group invoices by type
  const b2bMap = new Map<string, B2BEntry>();
  const b2csAgg = new Map<string, B2CSEntry>();
  const b2clMap = new Map<string, B2CLEntry>();

  let totalTaxableValue = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalValue = 0;

  for (const invoice of invoices) {
    const customerGstin = invoice.customer?.gstin;
    const customerState =
      extractStateCode(customerGstin) ??
      extractStateCode(invoice.placeOfSupply) ??
      orgStateCode;
    const invoiceTotal = toAccountingNumber(invoice.totalAmount);
    const invoiceCgst = toAccountingNumber(invoice.gstTotalCgst);
    const invoiceSgst = toAccountingNumber(invoice.gstTotalSgst);
    const invoiceIgst = toAccountingNumber(invoice.gstTotalIgst);
    const invoiceCess = toAccountingNumber(invoice.gstTotalCess);

    const isB2B = !!customerGstin;
    const isLarge = invoiceTotal >= 250000;

    const invoiceLevelTaxable = round(
      invoiceTotal - invoiceCgst - invoiceSgst - invoiceIgst - invoiceCess,
    );

    const items = invoice.lineItems.length > 0
      ? invoice.lineItems
      : [
          {
            gstRate:
              invoiceLevelTaxable > 0
                ? round(
                    ((invoiceCgst + invoiceSgst + invoiceIgst + invoiceCess) /
                      invoiceLevelTaxable) *
                      100,
                  )
                : 0,
            amount: invoiceLevelTaxable,
            cgstAmount: invoiceCgst,
            sgstAmount: invoiceSgst,
            igstAmount: invoiceIgst,
            cessAmount: invoiceCess,
            gstType: invoiceIgst > 0 ? "INTERSTATE" : "INTRASTATE",
          },
        ];

    const invoiceItems: Array<{
      num: number;
      itm_det: {
        rt: number;
        txval: number;
        camt: number;
        samt: number;
        iamt: number;
        csamt: number;
      };
    }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const taxableValue =
        item.amount ??
        ("quantity" in item && "unitPrice" in item ? item.quantity * item.unitPrice : 0);
      const rate =
        ("gstRate" in item && typeof item.gstRate === "number" && item.gstRate > 0
          ? item.gstRate
          : "taxRate" in item && typeof item.taxRate === "number"
            ? item.taxRate
            : 0);
      const actualCgst = round("cgstAmount" in item ? item.cgstAmount ?? 0 : 0);
      const actualSgst = round("sgstAmount" in item ? item.sgstAmount ?? 0 : 0);
      const actualIgst = round("igstAmount" in item ? item.igstAmount ?? 0 : 0);
      const actualCess = round("cessAmount" in item ? item.cessAmount ?? 0 : 0);
      invoiceItems.push({
        num: i + 1,
        itm_det: {
          rt: rate,
          txval: round(taxableValue),
          camt: actualCgst,
          samt: actualSgst,
          iamt: actualIgst,
          csamt: actualCess,
        },
      });

      totalTaxableValue += taxableValue;
      totalCgst += actualCgst;
      totalSgst += actualSgst;
      totalIgst += actualIgst;
      totalValue += taxableValue + actualCgst + actualSgst + actualIgst + actualCess;
    }

    const invoiceDateFormatted = formatDateDDMMYYYY(invoice.invoiceDate);

    if (isB2B) {
      // B2B: customer has GSTIN
      const ctin = customerGstin!;
      const entry = b2bMap.get(ctin) ?? { ctin, inv: [] };
      entry.inv.push({
        inum: invoice.invoiceNumber,
        idt: invoiceDateFormatted,
        val: round(invoiceTotal),
        pos: customerState,
        rchrg: "N",
        itms: invoiceItems,
      });
      b2bMap.set(ctin, entry);
    } else if (isLarge) {
      // B2CL: no GSTIN, amount >= 2.5 lakh, inter-state
      const pos = customerState;
      const entry = b2clMap.get(pos) ?? { pos, inv: [] };
      entry.inv.push({
        inum: invoice.invoiceNumber,
        idt: invoiceDateFormatted,
        val: round(invoiceTotal),
        itms: invoiceItems.map((item) => ({
          num: item.num,
          itm_det: {
            rt: item.itm_det.rt,
            txval: item.itm_det.txval,
            iamt: item.itm_det.iamt,
            csamt: 0,
          },
        })),
      });
      b2clMap.set(pos, entry);
    } else {
      // B2CS: no GSTIN, amount < 2.5 lakh
      for (const item of invoiceItems) {
        const isIntra = item.itm_det.iamt === 0;
        const key = `${isIntra ? "INTRA" : "INTER"}_${customerState}_${item.itm_det.rt}`;
        const existing = b2csAgg.get(key);
        if (existing) {
          existing.txval = round(existing.txval + item.itm_det.txval);
          existing.camt = round(existing.camt + item.itm_det.camt);
          existing.samt = round(existing.samt + item.itm_det.samt);
          existing.iamt = round(existing.iamt + item.itm_det.iamt);
          existing.csamt = round(existing.csamt + item.itm_det.csamt);
        } else {
          b2csAgg.set(key, {
            sply_ty: isIntra ? "INTRA" : "INTER",
            pos: customerState,
            rt: item.itm_det.rt,
            txval: item.itm_det.txval,
            camt: item.itm_det.camt,
            samt: item.itm_det.samt,
            iamt: item.itm_det.iamt,
            csamt: item.itm_det.csamt,
          });
        }
      }
    }
  }

  const fp = `${String(month).padStart(2, "0")}${year}`;

  return {
    gstin,
    fp,
    b2b: Array.from(b2bMap.values()),
    b2cs: Array.from(b2csAgg.values()),
    b2cl: Array.from(b2clMap.values()),
    summary: {
      totalInvoices: invoices.length,
      totalTaxableValue: round(totalTaxableValue),
      totalCgst: round(totalCgst),
      totalSgst: round(totalSgst),
      totalIgst: round(totalIgst),
      totalCess: round(
        invoices.reduce((sum, invoice) => sum + toAccountingNumber(invoice.gstTotalCess), 0),
      ),
      totalValue: round(totalValue),
    },
  };
}

function extractStateCode(value: string | null | undefined): string | null {
  if (!value) return null;

  const match = value.match(/^(\d{2})/);
  return match ? match[1] : null;
}

function formatDateDDMMYYYY(dateStr: Date | string): string {
  const parts = formatIsoDate(dateStr).split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return formatIsoDate(dateStr);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
