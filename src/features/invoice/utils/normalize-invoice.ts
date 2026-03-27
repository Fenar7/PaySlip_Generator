import type {
  InvoiceDocument,
  InvoiceFormValues,
  InvoiceLineItem,
} from "@/features/invoice/types";
import { amountToWords } from "@/features/voucher/utils/amount-to-words";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function normalizeLineItems(rows: InvoiceFormValues["lineItems"]) {
  const items: InvoiceLineItem[] = [];

  for (const row of rows) {
    const description = row.description.trim();
    const quantity = Number(row.quantity || 0);
    const unitPrice = Number(row.unitPrice || 0);
    const taxRate = Number(row.taxRate || 0);
    const discountAmount = Number(row.discountAmount || 0);
    const baseAmount = Number.isFinite(quantity * unitPrice)
      ? quantity * unitPrice
      : 0;
    const safeDiscountAmount = Math.min(
      Number.isFinite(discountAmount) ? Math.max(discountAmount, 0) : 0,
      baseAmount,
    );
    const taxableAmount = Math.max(baseAmount - safeDiscountAmount, 0);
    const safeTaxRate = Number.isFinite(taxRate) ? Math.max(taxRate, 0) : 0;
    const taxAmount = taxableAmount * (safeTaxRate / 100);
    const lineTotal = taxableAmount + taxAmount;

    items.push({
      description: description || "Untitled item",
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 0,
      unitPrice: Number.isFinite(unitPrice) ? Math.max(unitPrice, 0) : 0,
      taxRate: safeTaxRate,
      discountAmount: safeDiscountAmount,
      baseAmount,
      taxableAmount,
      taxAmount,
      lineTotal,
      unitPriceFormatted: formatCurrency(
        Number.isFinite(unitPrice) ? Math.max(unitPrice, 0) : 0,
      ),
      discountAmountFormatted: formatCurrency(safeDiscountAmount),
      baseAmountFormatted: formatCurrency(baseAmount),
      taxAmountFormatted: formatCurrency(taxAmount),
      lineTotalFormatted: formatCurrency(lineTotal),
    });
  }

  return items;
}

export function normalizeInvoice(values: InvoiceFormValues): InvoiceDocument {
  const lineItems = normalizeLineItems(values.lineItems);
  const subtotal = lineItems.reduce((sum, item) => sum + item.baseAmount, 0);
  const totalDiscount = lineItems.reduce(
    (sum, item) => sum + item.discountAmount,
    0,
  );
  const totalTax = lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const amountPaid = Number.isFinite(Number(values.amountPaid))
    ? Math.max(Number(values.amountPaid), 0)
    : 0;
  const balanceDue = Math.max(grandTotal - amountPaid, 0);
  const visibility = values.visibility;

  return {
    templateId: values.templateId,
    title: "Tax Invoice",
    branding: values.branding,
    businessTaxId: visibility.showBusinessTaxId
      ? values.businessTaxId.trim() || undefined
      : undefined,
    clientName: values.clientName.trim(),
    clientAddress: visibility.showClientAddress
      ? values.clientAddress.trim() || undefined
      : undefined,
    clientEmail: visibility.showClientEmail
      ? values.clientEmail.trim() || undefined
      : undefined,
    clientPhone: visibility.showClientPhone
      ? values.clientPhone.trim() || undefined
      : undefined,
    invoiceNumber: values.invoiceNumber.trim(),
    invoiceDate: formatDate(values.invoiceDate) || values.invoiceDate,
    dueDate: visibility.showDueDate ? formatDate(values.dueDate) : undefined,
    currencyCode: "INR",
    lineItems,
    subtotal,
    totalDiscount,
    totalTax,
    grandTotal,
    amountPaid,
    balanceDue,
    subtotalFormatted: formatCurrency(subtotal),
    totalDiscountFormatted: formatCurrency(totalDiscount),
    totalTaxFormatted: formatCurrency(totalTax),
    grandTotalFormatted: formatCurrency(grandTotal),
    amountPaidFormatted: formatCurrency(amountPaid),
    balanceDueFormatted: formatCurrency(balanceDue),
    amountInWords: amountToWords(Math.max(grandTotal, 0)),
    notes: visibility.showNotes ? values.notes.trim() || undefined : undefined,
    terms: visibility.showTerms ? values.terms.trim() || undefined : undefined,
    bankName: visibility.showBankDetails
      ? values.bankName.trim() || undefined
      : undefined,
    bankAccountNumber: visibility.showBankDetails
      ? values.bankAccountNumber.trim() || undefined
      : undefined,
    bankIfsc: visibility.showBankDetails
      ? values.bankIfsc.trim() || undefined
      : undefined,
    authorizedBy: visibility.showSignature
      ? values.authorizedBy.trim() || undefined
      : undefined,
    visibility,
  };
}
