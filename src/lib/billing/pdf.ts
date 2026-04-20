import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getBillingTaxBreakdown, formatBillingInvoiceNumber } from "./invoicing";

function formatCurrency(amountPaise: bigint, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amountPaise) / 100);
}

export async function renderBillingInvoicePdf(invoice: {
  id: string;
  orgId: string;
  createdAt: Date;
  planId: string;
  amountPaise: bigint;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  organization: { name: string };
  billingAccount: { billingCountry: string; billingEmail: string } | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const tax = getBillingTaxBreakdown(
    invoice.amountPaise,
    invoice.billingAccount?.billingCountry,
  );
  const invoiceNumber = formatBillingInvoiceNumber(invoice);

  let y = 790;
  const drawLine = (label: string, value: string, opts?: { bold?: boolean }) => {
    const activeFont = opts?.bold ? bold : font;
    page.drawText(label, { x: 48, y, size: 11, font: activeFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(value, { x: 240, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 22;
  };

  page.drawText("Slipwise One", {
    x: 48,
    y,
    size: 22,
    font: bold,
    color: rgb(0.1, 0.2, 0.45),
  });
  y -= 34;
  drawLine("Invoice", invoiceNumber, { bold: true });
  drawLine("Organization", invoice.organization.name);
  drawLine("Billing email", invoice.billingAccount?.billingEmail || "Not provided");
  drawLine("Plan", invoice.planId.toUpperCase());
  drawLine(
    "Billing period",
    `${invoice.periodStart.toLocaleDateString("en-IN")} - ${invoice.periodEnd.toLocaleDateString("en-IN")}`,
  );
  drawLine("Issued on", invoice.createdAt.toLocaleDateString("en-IN"));
  drawLine("Status", invoice.status.toUpperCase());
  drawLine("Subtotal", formatCurrency(tax.baseAmountPaise, invoice.currency));
  drawLine(
    `Tax (${(tax.taxRateBasisPoints / 100).toFixed(2)}%)`,
    formatCurrency(tax.taxAmountPaise, invoice.currency),
  );
  drawLine("Total", formatCurrency(invoice.amountPaise, invoice.currency), {
    bold: true,
  });

  page.drawText("This is a system-generated subscription invoice.", {
    x: 48,
    y: 70,
    size: 10,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  return pdf.save();
}
