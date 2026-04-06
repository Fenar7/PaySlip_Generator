import "server-only";

import { db } from "@/lib/db";
import { calculateGST } from "@/lib/gst-calculator";

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
  const orgStateCode = orgDefaults?.gstStateCode ?? "27"; // default Maharashtra

  // 2. Fetch invoices for the period
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const invoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["PAID", "ISSUED"] },
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
    const customerState = customerGstin
      ? customerGstin.substring(0, 2)
      : orgStateCode;

    const isB2B = !!customerGstin;
    const isLarge = invoice.totalAmount >= 250000;

    // Calculate per-item GST
    const items = invoice.lineItems.length > 0
      ? invoice.lineItems
      : [
          {
            description: "Invoice total",
            quantity: 1,
            unitPrice: invoice.totalAmount,
            taxRate: 18,
            amount: invoice.totalAmount,
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
      const taxableValue = item.amount ?? item.quantity * item.unitPrice;
      const rate = item.taxRate ?? 18;

      const gst = calculateGST({
        hsnCode: "9983", // default IT services
        amount: taxableValue,
        fromState: orgStateCode,
        toState: customerState,
      });

      // Override rate to match actual line-item rate
      const actualCgst = round((taxableValue * rate) / 100 / 2);
      const actualSgst = round((taxableValue * rate) / 100 / 2);
      const actualIgst = round((taxableValue * rate) / 100);

      const isIntra = orgStateCode === customerState;

      invoiceItems.push({
        num: i + 1,
        itm_det: {
          rt: rate,
          txval: round(taxableValue),
          camt: isIntra ? actualCgst : 0,
          samt: isIntra ? actualSgst : 0,
          iamt: isIntra ? 0 : actualIgst,
          csamt: 0,
        },
      });

      totalTaxableValue += taxableValue;
      totalCgst += isIntra ? actualCgst : 0;
      totalSgst += isIntra ? actualSgst : 0;
      totalIgst += isIntra ? 0 : actualIgst;
      totalValue += taxableValue + (isIntra ? actualCgst + actualSgst : actualIgst);
    }

    const invoiceDateFormatted = formatDateDDMMYYYY(invoice.invoiceDate);

    if (isB2B) {
      // B2B: customer has GSTIN
      const ctin = customerGstin!;
      const entry = b2bMap.get(ctin) ?? { ctin, inv: [] };
      entry.inv.push({
        inum: invoice.invoiceNumber,
        idt: invoiceDateFormatted,
        val: round(invoice.totalAmount),
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
        val: round(invoice.totalAmount),
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
      const isIntra = orgStateCode === customerState;
      for (const item of invoiceItems) {
        const key = `${isIntra ? "INTRA" : "INTER"}_${customerState}_${item.itm_det.rt}`;
        const existing = b2csAgg.get(key);
        if (existing) {
          existing.txval = round(existing.txval + item.itm_det.txval);
          existing.camt = round(existing.camt + item.itm_det.camt);
          existing.samt = round(existing.samt + item.itm_det.samt);
          existing.iamt = round(existing.iamt + item.itm_det.iamt);
        } else {
          b2csAgg.set(key, {
            sply_ty: isIntra ? "INTRA" : "INTER",
            pos: customerState,
            rt: item.itm_det.rt,
            txval: item.itm_det.txval,
            camt: item.itm_det.camt,
            samt: item.itm_det.samt,
            iamt: item.itm_det.iamt,
            csamt: 0,
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
      totalCess: 0,
      totalValue: round(totalValue),
    },
  };
}

function formatDateDDMMYYYY(dateStr: string): string {
  // Input: "YYYY-MM-DD" → Output: "DD-MM-YYYY"
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
