import "server-only";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

export interface ReceiptData {
  receiptNumber: string;
  invoiceNumber: string;
  paymentDate: Date;
  amount: number;
  currency: string;
  method: string;
  externalPaymentId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  orgName: string;
  orgAddress: string | null;
  accentColor?: string;
  watermark?: boolean;
}

const MM_TO_PT = 2.8346;

function mm(val: number): number {
  return val * MM_TO_PT;
}

function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

/**
 * Generate a payment receipt PDF as a Buffer.
 * A5 portrait — compact receipt format suitable for printing or email attachment.
 */
export async function generatePaymentReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // A5 portrait: 148mm × 210mm
  const pageWidth = mm(148);
  const pageHeight = mm(210);
  const margin = mm(12);

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  const { width, height } = page.getSize();

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const accentHex = data.accentColor ?? "#dc2626";
  const [ar, ag, ab] = hexToRgb(accentHex);
  const accentRgb = rgb(ar, ag, ab);
  const darkGray = rgb(0.15, 0.15, 0.15);
  const midGray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.85, 0.85, 0.85);

  let y = height - margin;

  // Accent header bar
  page.drawRectangle({ x: 0, y: height - mm(5), width, height: mm(5), color: accentRgb });
  y -= mm(10);

  // Org name
  page.drawText(data.orgName, { x: margin, y, size: 13, font: boldFont, color: darkGray });
  y -= mm(5);

  if (data.orgAddress) {
    page.drawText(data.orgAddress, { x: margin, y, size: 8, font: regularFont, color: midGray });
    y -= mm(5);
  }

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lightGray });
  y -= mm(7);

  // Title
  page.drawText("PAYMENT RECEIPT", { x: margin, y, size: 15, font: boldFont, color: accentRgb });
  y -= mm(7);

  // Helper to draw a label/value row
  function drawRow(label: string, value: string, yPos: number, valueBold = false): void {
    page.drawText(label, { x: margin, y: yPos, size: 8.5, font: regularFont, color: midGray });
    const vWidth = (valueBold ? boldFont : regularFont).widthOfTextAtSize(value, 8.5);
    page.drawText(value, {
      x: Math.max(margin + mm(35), width - margin - vWidth),
      y: yPos,
      size: 8.5,
      font: valueBold ? boldFont : regularFont,
      color: darkGray,
    });
  }

  drawRow("Receipt No.", `#${data.receiptNumber}`, y, true);
  y -= mm(5.5);
  drawRow("Invoice No.", `#${data.invoiceNumber}`, y);
  y -= mm(5.5);
  drawRow(
    "Payment Date",
    data.paymentDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    y
  );
  y -= mm(5.5);
  drawRow("Payment Method", data.method, y);
  if (data.externalPaymentId) {
    y -= mm(5.5);
    drawRow("Reference ID", data.externalPaymentId, y);
  }

  y -= mm(5);

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lightGray });
  y -= mm(7);

  // Customer section
  if (data.customerName) {
    page.drawText("Received From", { x: margin, y, size: 8.5, font: regularFont, color: midGray });
    y -= mm(5);
    page.drawText(data.customerName, { x: margin, y, size: 10, font: boldFont, color: darkGray });
    y -= mm(5);
    if (data.customerEmail) {
      page.drawText(data.customerEmail, { x: margin, y, size: 8.5, font: regularFont, color: midGray });
      y -= mm(5);
    }
  }

  y -= mm(4);

  // Amount highlight box
  const boxH = mm(18);
  page.drawRectangle({
    x: margin,
    y: y - boxH,
    width: width - 2 * margin,
    height: boxH,
    color: rgb(Math.min(1, ar * 0.08 + 0.94), Math.min(1, ag * 0.08 + 0.94), Math.min(1, ab * 0.08 + 0.94)),
    borderColor: accentRgb,
    borderWidth: 0.5,
    borderOpacity: 0.35,
  });

  const amountText = formatCurrency(data.amount, data.currency);
  const amtW = boldFont.widthOfTextAtSize(amountText, 20);

  page.drawText("Amount Paid", { x: margin + mm(3), y: y - mm(6), size: 8.5, font: regularFont, color: midGray });
  page.drawText(amountText, {
    x: width - margin - amtW - mm(3),
    y: y - mm(14),
    size: 20,
    font: boldFont,
    color: accentRgb,
  });
  y -= boxH + mm(7);

  // Footer
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: lightGray });
  y -= mm(5);
  page.drawText("This is a computer-generated receipt and does not require a physical signature.", {
    x: margin,
    y,
    size: 6.5,
    font: regularFont,
    color: midGray,
    maxWidth: width - 2 * margin,
  });

  // Optional watermark
  if (data.watermark) {
    page.drawText("Slipwise One", {
      x: width / 2 - boldFont.widthOfTextAtSize("Slipwise One", 36) / 2,
      y: height / 2 - 10,
      size: 36,
      font: boldFont,
      color: rgb(0.88, 0.88, 0.88),
      rotate: degrees(45),
      opacity: 0.15,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
