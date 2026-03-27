import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { VoucherDocument } from "@/features/voucher/types";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

type PdfTheme = {
  accent: ReturnType<typeof rgb>;
  ink: ReturnType<typeof rgb>;
  muted: ReturnType<typeof rgb>;
  softMuted: ReturnType<typeof rgb>;
  border: ReturnType<typeof rgb>;
  paper: ReturnType<typeof rgb>;
  softPaper: ReturnType<typeof rgb>;
  white: ReturnType<typeof rgb>;
};

type PdfFonts = {
  sans: PDFFont;
  sansBold: PDFFont;
  serifBold: PDFFont;
};

type PdfContext = {
  document: VoucherDocument;
  pdf: PDFDocument;
  page: PDFPage;
  fonts: PdfFonts;
  theme: PdfTheme;
  logo: PDFImage | null;
};

export async function buildVoucherPdf(document: VoucherDocument) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  const fonts = await embedFonts(pdf);
  const theme = buildTheme(document.branding.accentColor);
  const logo = await embedLogo(pdf, document.branding.logoDataUrl);
  const context: PdfContext = {
    document,
    pdf,
    page,
    fonts,
    theme,
    logo,
  };

  if (document.templateId === "traditional-ledger") {
    drawTraditionalLedger(context);
  } else {
    drawMinimalOffice(context);
  }

  return pdf.save();
}

async function embedFonts(pdf: PDFDocument): Promise<PdfFonts> {
  const [sans, sansBold, serifBold] = await Promise.all([
    pdf.embedFont(StandardFonts.Helvetica),
    pdf.embedFont(StandardFonts.HelveticaBold),
    pdf.embedFont(StandardFonts.TimesRomanBold),
  ]);

  return { sans, sansBold, serifBold };
}

async function embedLogo(pdf: PDFDocument, dataUrl?: string) {
  if (!dataUrl) {
    return null;
  }

  const match = /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    return null;
  }

  const [, mimeType, encoded] = match;
  const bytes = Uint8Array.from(Buffer.from(encoded, "base64"));

  if (mimeType.toLowerCase().includes("png")) {
    return pdf.embedPng(bytes);
  }

  return pdf.embedJpg(bytes);
}

function buildTheme(accentColor: string): PdfTheme {
  return {
    accent: hexToRgb(accentColor, "#c69854"),
    ink: rgb(0.13, 0.1, 0.07),
    muted: rgb(0.35, 0.29, 0.24),
    softMuted: rgb(0.55, 0.5, 0.45),
    border: rgb(0.87, 0.84, 0.8),
    paper: rgb(1, 1, 1),
    softPaper: rgb(0.99, 0.98, 0.96),
    white: rgb(1, 1, 1),
  };
}

function hexToRgb(value: string, fallback: string) {
  const source = /^#([0-9a-f]{6})$/i.test(value) ? value : fallback;
  const red = Number.parseInt(source.slice(1, 3), 16) / 255;
  const green = Number.parseInt(source.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(source.slice(5, 7), 16) / 255;

  return rgb(red, green, blue);
}

function drawMinimalOffice(context: PdfContext) {
  const { document, page, fonts, theme, logo } = context;
  const left = 42;
  const right = A4_WIDTH - 42;
  const contentWidth = right - left;

  let top = 50;

  top = drawTextBlock({
    page,
    text: document.title.toUpperCase(),
    x: left,
    top,
    maxWidth: 320,
    font: fonts.sansBold,
    size: 10,
    lineHeight: 12,
    color: theme.softMuted,
    letterSpacing: 2.4,
  });

  top += 10;
  const companyBottom = drawTextBlock({
    page,
    text: document.branding.companyName || "Business Document Generator",
    x: left,
    top,
    maxWidth: 340,
    font: fonts.serifBold,
    size: 28,
    lineHeight: 30,
    color: theme.ink,
  });

  const contactItems = [
    document.visibility.showAddress ? document.branding.address : "",
    document.visibility.showEmail ? document.branding.email : "",
    document.visibility.showPhone ? document.branding.phone : "",
  ].filter(Boolean);

  let contactTop = companyBottom + 16;
  for (const item of contactItems) {
    contactTop = drawTextBlock({
      page,
      text: item,
      x: left,
      top: contactTop,
      maxWidth: 340,
      font: fonts.sans,
      size: 12,
      lineHeight: 15,
      color: theme.muted,
    });
    contactTop += 4;
  }

  const logoTop = 50;
  drawRect({
    page,
    x: right - 74,
    top: logoTop,
    width: 74,
    height: 74,
    borderColor: theme.border,
    fillColor: theme.softPaper,
  });
  drawLogoOrInitials({
    page,
    logo,
    companyName: document.branding.companyName,
    x: right - 74,
    top: logoTop,
    width: 74,
    height: 74,
    font: fonts.sansBold,
    color: theme.accent,
  });

  const headerBottom = Math.max(contactTop, logoTop + 74) + 20;
  drawHorizontalRule(page, left, right, headerBottom, theme.border);

  const detailTop = headerBottom + 18;
  const leftCardWidth = 320;
  const rightCardWidth = contentWidth - leftCardWidth - 16;
  const cardHeight = 184;

  drawRect({
    page,
    x: left,
    top: detailTop,
    width: leftCardWidth,
    height: cardHeight,
    borderColor: theme.border,
    fillColor: theme.softPaper,
  });
  drawRect({
    page,
    x: left + leftCardWidth + 16,
    top: detailTop,
    width: rightCardWidth,
    height: cardHeight,
    borderColor: theme.accent,
    fillColor: theme.accent,
  });

  const fieldTop = detailTop + 20;
  const fieldWidth = (leftCardWidth - 52) / 2;
  const firstColumnX = left + 18;
  const secondColumnX = firstColumnX + fieldWidth + 16;

  drawLabeledValue(context, "Voucher no.", document.voucherNumber, firstColumnX, fieldTop, fieldWidth);
  drawLabeledValue(context, "Date", document.date, secondColumnX, fieldTop, fieldWidth);

  const secondRowTop = fieldTop + 62;
  drawLabeledValue(
    context,
    document.counterpartyLabel,
    document.counterpartyName,
    firstColumnX,
    secondRowTop,
    fieldWidth,
  );

  if (document.paymentMode) {
    drawLabeledValue(context, "Payment mode", document.paymentMode, secondColumnX, secondRowTop, fieldWidth);
  }

  if (document.referenceNumber) {
    drawLabeledValue(
      context,
      "Reference",
      document.referenceNumber,
      firstColumnX,
      secondRowTop + 62,
      leftCardWidth - 36,
    );
  }

  const amountCardLeft = left + leftCardWidth + 16;
  const amountInnerTop = detailTop + 18;
  drawTextBlock({
    page,
    text: "AMOUNT",
    x: amountCardLeft + 18,
    top: amountInnerTop,
    maxWidth: rightCardWidth - 36,
    font: fonts.sansBold,
    size: 10,
    lineHeight: 12,
    color: rgb(1, 1, 1),
    letterSpacing: 2.2,
  });
  const amountBottom = drawTextBlock({
    page,
    text: document.amountFormatted,
    x: amountCardLeft + 18,
    top: amountInnerTop + 18,
    maxWidth: rightCardWidth - 36,
    font: fonts.sansBold,
    size: 24,
    lineHeight: 28,
    color: rgb(1, 1, 1),
  });
  drawTextBlock({
    page,
    text: document.amountInWords,
    x: amountCardLeft + 18,
    top: amountBottom + 16,
    maxWidth: rightCardWidth - 36,
    font: fonts.sans,
    size: 11.5,
    lineHeight: 15,
    color: rgb(1, 1, 1),
  });

  let sectionTop = detailTop + cardHeight + 18;
  sectionTop = drawContentBox(context, {
    title: "Purpose / Narration",
    text: document.purpose,
    top: sectionTop,
    dashed: false,
  });

  if (document.notes) {
    sectionTop = drawContentBox(context, {
      title: "Notes",
      text: document.notes,
      top: sectionTop + 16,
      dashed: true,
    });
  }

  if (document.visibility.showSignatureArea) {
    const signatureTop = sectionTop + 18;
    const signatureWidth = (contentWidth - 16) / 2;
    drawSignatureCard(context, {
      x: left,
      top: signatureTop,
      width: signatureWidth,
      label: document.approvedBy ? `Approved by: ${document.approvedBy}` : "Approved by",
    });
    drawSignatureCard(context, {
      x: left + signatureWidth + 16,
      top: signatureTop,
      width: signatureWidth,
      label: document.receivedBy ? `Received by: ${document.receivedBy}` : "Received by",
    });
  }
}

function drawTraditionalLedger(context: PdfContext) {
  const { document, page, fonts, theme } = context;
  const left = 42;
  const right = A4_WIDTH - 42;
  const shellWidth = right - left;
  const shellTop = 50;
  const bannerHeight = 88;

  drawRect({
    page,
    x: left,
    top: shellTop,
    width: shellWidth,
    height: bannerHeight,
    borderColor: theme.accent,
    fillColor: theme.accent,
    borderWidth: 2,
  });

  drawTextBlock({
    page,
    text: "FORMAL VOUCHER RECORD",
    x: left + 20,
    top: shellTop + 18,
    maxWidth: 240,
    font: fonts.sansBold,
    size: 9,
    lineHeight: 12,
    color: rgb(1, 1, 1),
    letterSpacing: 2.3,
  });
  drawTextBlock({
    page,
    text: document.title,
    x: left + 20,
    top: shellTop + 34,
    maxWidth: 250,
    font: fonts.serifBold,
    size: 26,
    lineHeight: 28,
    color: rgb(1, 1, 1),
  });
  drawTextBlock({
    page,
    text: document.branding.companyName || "Business Document Generator",
    x: right - 180,
    top: shellTop + 28,
    maxWidth: 160,
    font: fonts.sans,
    size: 12,
    lineHeight: 15,
    color: rgb(1, 1, 1),
    align: "right",
  });

  const rowsTop = shellTop + bannerHeight;
  const rows = [
    { label: "Voucher number", value: document.voucherNumber },
    { label: "Date", value: document.date },
    { label: document.counterpartyLabel, value: document.counterpartyName },
    { label: "Amount", value: `${document.amountFormatted} (${document.amountInWords})` },
    ...(document.paymentMode ? [{ label: "Payment mode", value: document.paymentMode }] : []),
    ...(document.referenceNumber ? [{ label: "Reference", value: document.referenceNumber }] : []),
    { label: "Purpose", value: document.purpose },
    ...(document.notes ? [{ label: "Notes", value: document.notes }] : []),
  ];

  let currentTop = rowsTop + 10;
  for (const row of rows) {
    currentTop = drawLedgerRow(context, row.label, row.value, currentTop, left + 20, shellWidth - 40);
  }

  const shellHeight = currentTop - shellTop + 10;
  drawOutline(page, left, shellTop, shellWidth, shellHeight, theme.border, 2);

  const supportTop = shellTop + shellHeight + 18;
  const leftBoxWidth = shellWidth * 0.56 - 8;
  const rightBoxWidth = shellWidth - leftBoxWidth - 16;

  const businessText = [
    document.visibility.showAddress ? document.branding.address : "",
    document.visibility.showEmail ? document.branding.email : "",
    document.visibility.showPhone ? document.branding.phone : "",
  ].filter(Boolean);

  const businessHeight = measureParagraphHeight(businessText.join("\n"), fonts.sans, 11.5, 15, leftBoxWidth - 36);
  const authorizationHeight = document.visibility.showSignatureArea
    ? measureAuthorizationHeight(context, rightBoxWidth - 36)
    : 0;
  const supportHeight = Math.max(112, 18 + 14 + 12 + businessHeight + 18, 18 + 14 + 12 + authorizationHeight + 18);

  drawRect({
    page,
    x: left,
    top: supportTop,
    width: leftBoxWidth,
    height: supportHeight,
    borderColor: theme.border,
    fillColor: theme.softPaper,
  });
  drawTextBlock({
    page,
    text: "Business details",
    x: left + 18,
    top: supportTop + 18,
    maxWidth: leftBoxWidth - 36,
    font: fonts.sansBold,
    size: 9.5,
    lineHeight: 12,
    color: theme.softMuted,
    letterSpacing: 2.1,
  });
  drawTextBlock({
    page,
    text: businessText.join("\n"),
    x: left + 18,
    top: supportTop + 42,
    maxWidth: leftBoxWidth - 36,
    font: fonts.sans,
    size: 11.5,
    lineHeight: 15,
    color: theme.muted,
  });

  if (document.visibility.showSignatureArea) {
    const authLeft = left + leftBoxWidth + 16;
    drawRect({
      page,
      x: authLeft,
      top: supportTop,
      width: rightBoxWidth,
      height: supportHeight,
      borderColor: theme.border,
      fillColor: theme.softPaper,
    });
    drawTextBlock({
      page,
      text: "Authorization",
      x: authLeft + 18,
      top: supportTop + 18,
      maxWidth: rightBoxWidth - 36,
      font: fonts.sansBold,
      size: 9.5,
      lineHeight: 12,
      color: theme.softMuted,
      letterSpacing: 2.1,
    });

    let authTop = supportTop + 46;
    if (document.approvedBy) {
      authTop = drawAuthorizationLine(context, authLeft + 18, authTop, rightBoxWidth - 36, `Approved by: ${document.approvedBy}`);
      authTop += 14;
    }
    if (document.receivedBy) {
      authTop = drawAuthorizationLine(context, authLeft + 18, authTop, rightBoxWidth - 36, `Received by: ${document.receivedBy}`);
      authTop += 14;
    }
    if (!document.approvedBy && !document.receivedBy) {
      drawTextBlock({
        page,
        text: "Signature lines will appear here once names are provided.",
        x: authLeft + 18,
        top: authTop,
        maxWidth: rightBoxWidth - 36,
        font: fonts.sans,
        size: 11,
        lineHeight: 14,
        color: theme.muted,
      });
    }
  }
}

function drawLabeledValue(
  context: PdfContext,
  label: string,
  value: string,
  x: number,
  top: number,
  width: number,
) {
  const { page, fonts, theme } = context;
  drawTextBlock({
    page,
    text: label.toUpperCase(),
    x,
    top,
    maxWidth: width,
    font: fonts.sansBold,
    size: 9,
    lineHeight: 11,
    color: theme.softMuted,
    letterSpacing: 2,
  });
  drawTextBlock({
    page,
    text: value,
    x,
    top: top + 16,
    maxWidth: width,
    font: fonts.sansBold,
    size: 13.5,
    lineHeight: 16,
    color: theme.ink,
  });
}

function drawContentBox(
  context: PdfContext,
  options: {
    title: string;
    text: string;
    top: number;
    dashed: boolean;
  },
) {
  const { page, fonts, theme } = context;
  const left = 42;
  const width = A4_WIDTH - 84;
  const textHeight = measureParagraphHeight(options.text, fonts.sans, 11.5, 15, width - 36);
  const height = 18 + 12 + 16 + textHeight + 18;

  drawRect({
    page,
    x: left,
    top: options.top,
    width,
    height,
    borderColor: theme.border,
    fillColor: theme.softPaper,
    dashed: options.dashed,
  });
  drawTextBlock({
    page,
    text: options.title.toUpperCase(),
    x: left + 18,
    top: options.top + 18,
    maxWidth: width - 36,
    font: fonts.sansBold,
    size: 9.5,
    lineHeight: 12,
    color: theme.softMuted,
    letterSpacing: 2.1,
  });
  drawTextBlock({
    page,
    text: options.text,
    x: left + 18,
    top: options.top + 42,
    maxWidth: width - 36,
    font: fonts.sans,
    size: 11.5,
    lineHeight: 15,
    color: theme.muted,
  });

  return options.top + height;
}

function drawSignatureCard(
  context: PdfContext,
  options: {
    x: number;
    top: number;
    width: number;
    label: string;
  },
) {
  const { page, fonts, theme } = context;
  const height = 112;

  drawRect({
    page,
    x: options.x,
    top: options.top,
    width: options.width,
    height,
    borderColor: theme.border,
    fillColor: theme.softPaper,
  });
  page.drawLine({
    start: {
      x: options.x + 18,
      y: yFromTop(options.top + 54),
    },
    end: {
      x: options.x + options.width - 18,
      y: yFromTop(options.top + 54),
    },
    color: theme.border,
    thickness: 1,
    dashArray: [4, 3],
  });
  drawTextBlock({
    page,
    text: options.label,
    x: options.x + 18,
    top: options.top + 68,
    maxWidth: options.width - 36,
    font: fonts.sansBold,
    size: 11.5,
    lineHeight: 14,
    color: theme.muted,
  });
}

function drawLedgerRow(
  context: PdfContext,
  label: string,
  value: string,
  top: number,
  x: number,
  width: number,
) {
  const { page, fonts, theme } = context;
  const labelWidth = 132;
  const valueWidth = width - labelWidth - 12;
  const valueHeight = measureParagraphHeight(value, fonts.sans, 11.5, 15, valueWidth);
  const rowHeight = Math.max(34, valueHeight + 12);

  drawTextBlock({
    page,
    text: label.toUpperCase(),
    x,
    top,
    maxWidth: labelWidth,
    font: fonts.sansBold,
    size: 9,
    lineHeight: 11,
    color: theme.softMuted,
    letterSpacing: 1.7,
  });
  drawTextBlock({
    page,
    text: value,
    x: x + labelWidth + 12,
    top,
    maxWidth: valueWidth,
    font: fonts.sans,
    size: 11.5,
    lineHeight: 15,
    color: theme.muted,
  });
  drawHorizontalRule(page, x, x + width, top + rowHeight, theme.border);

  return top + rowHeight;
}

function measureAuthorizationHeight(context: PdfContext, width: number) {
  const { document, fonts } = context;
  if (!document.approvedBy && !document.receivedBy) {
    return measureParagraphHeight(
      "Signature lines will appear here once names are provided.",
      fonts.sans,
      11,
      14,
      width,
    );
  }

  let total = 0;
  if (document.approvedBy) {
    total += 40 + 12 + measureParagraphHeight(`Approved by: ${document.approvedBy}`, fonts.sansBold, 11.5, 14, width);
  }
  if (document.receivedBy) {
    total += 14 + 40 + 12 + measureParagraphHeight(`Received by: ${document.receivedBy}`, fonts.sansBold, 11.5, 14, width);
  }
  return total;
}

function drawAuthorizationLine(
  context: PdfContext,
  x: number,
  top: number,
  width: number,
  label: string,
) {
  const { page, fonts, theme } = context;

  page.drawLine({
    start: { x, y: yFromTop(top + 32) },
    end: { x: x + width, y: yFromTop(top + 32) },
    color: theme.border,
    thickness: 1,
    dashArray: [4, 3],
  });

  return drawTextBlock({
    page,
    text: label,
    x,
    top: top + 44,
    maxWidth: width,
    font: fonts.sansBold,
    size: 11.5,
    lineHeight: 14,
    color: theme.muted,
  });
}

function drawLogoOrInitials(options: {
  page: PDFPage;
  logo: PDFImage | null;
  companyName: string;
  x: number;
  top: number;
  width: number;
  height: number;
  font: PDFFont;
  color: ReturnType<typeof rgb>;
}) {
  const { page, logo, companyName, x, top, width, height, font, color } = options;

  if (logo) {
    const imageWidth = logo.width;
    const imageHeight = logo.height;
    const scale = Math.min((width - 12) / imageWidth, (height - 12) / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;

    page.drawImage(logo, {
      x: x + (width - drawWidth) / 2,
      y: yFromTop(top + height - (height - drawHeight) / 2),
      width: drawWidth,
      height: drawHeight,
    });
    return;
  }

  const initials = companyName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "BD";

  const size = 20;
  const textWidth = font.widthOfTextAtSize(initials, size);
  page.drawText(initials, {
    x: x + (width - textWidth) / 2,
    y: yFromTop(top + 24),
    size,
    font,
    color,
  });
}

function drawRect(options: {
  page: PDFPage;
  x: number;
  top: number;
  width: number;
  height: number;
  borderColor: ReturnType<typeof rgb>;
  fillColor: ReturnType<typeof rgb>;
  borderWidth?: number;
  dashed?: boolean;
}) {
  const { page, x, top, width, height, borderColor, fillColor, borderWidth = 1 } = options;

  page.drawRectangle({
    x,
    y: yFromTop(top + height),
    width,
    height,
    borderColor,
    borderWidth,
    color: fillColor,
    borderDashArray: options.dashed ? [4, 3] : undefined,
  });
}

function drawOutline(
  page: PDFPage,
  x: number,
  top: number,
  width: number,
  height: number,
  color: ReturnType<typeof rgb>,
  borderWidth: number,
) {
  page.drawRectangle({
    x,
    y: yFromTop(top + height),
    width,
    height,
    borderColor: color,
    borderWidth,
    opacity: 0,
  });
}

function drawHorizontalRule(
  page: PDFPage,
  left: number,
  right: number,
  top: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawLine({
    start: { x: left, y: yFromTop(top) },
    end: { x: right, y: yFromTop(top) },
    color,
    thickness: 1,
  });
}

function drawTextBlock(options: {
  page: PDFPage;
  text: string;
  x: number;
  top: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  lineHeight: number;
  color: ReturnType<typeof rgb>;
  letterSpacing?: number;
  align?: "left" | "right";
}) {
  const normalizedText = normalizePdfText(options.text);
  const lines = wrapText(normalizedText, options.font, options.size, options.maxWidth);

  for (const [index, line] of lines.entries()) {
    const lineWidth = options.font.widthOfTextAtSize(line, options.size);
    const drawX =
      options.align === "right"
        ? options.x + options.maxWidth - lineWidth
        : options.x;

    options.page.drawText(line, {
      x: drawX,
      y: yFromTop(options.top + index * options.lineHeight + options.size),
      font: options.font,
      size: options.size,
      color: options.color,
    });
  }

  return options.top + lines.length * options.lineHeight;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const blocks = normalizePdfText(text).split("\n");
  const lines: string[] = [];

  for (const block of blocks) {
    const words = block.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function normalizePdfText(text: string) {
  return text
    .replaceAll("₹", "INR ")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2019", "'");
}

function measureParagraphHeight(
  text: string,
  font: PDFFont,
  size: number,
  lineHeight: number,
  maxWidth: number,
) {
  return wrapText(text, font, size, maxWidth).length * lineHeight;
}

function yFromTop(top: number) {
  return A4_HEIGHT - top;
}
