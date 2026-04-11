import { loadTranslations } from "./index";

export interface DocumentPdfLabels {
  title: string;
  [key: string]: string;
}

export interface InvoicePdfLabels extends DocumentPdfLabels {
  taxInvoice: string;
  vatInvoice: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billTo: string;
  shipTo: string;
  from: string;
  itemDescription: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  subtotal: string;
  tax: string;
  total: string;
  amountDue: string;
  paymentTerms: string;
  bankDetails: string;
  notes: string;
  terms: string;
}

export function getInvoicePdfLabels(locale: string): InvoicePdfLabels {
  const data = loadTranslations(locale, "invoices");
  const fields = (data.fields || {}) as Record<string, string>;
  return {
    title: (data.title as string) || "Invoice",
    taxInvoice: (data.taxInvoice as string) || "Tax Invoice",
    vatInvoice: (data.vatInvoice as string) || "VAT Invoice",
    invoiceNumber: fields.invoiceNumber || "Invoice Number",
    invoiceDate: fields.invoiceDate || "Invoice Date",
    dueDate: fields.dueDate || "Due Date",
    billTo: fields.billTo || "Bill To",
    shipTo: fields.shipTo || "Ship To",
    from: fields.from || "From",
    itemDescription: fields.itemDescription || "Item Description",
    quantity: fields.quantity || "Quantity",
    unitPrice: fields.unitPrice || "Unit Price",
    amount: fields.amount || "Amount",
    subtotal: fields.subtotal || "Subtotal",
    tax: fields.tax || "Tax",
    total: fields.total || "Total",
    amountDue: fields.amountDue || "Amount Due",
    paymentTerms: fields.paymentTerms || "Payment Terms",
    bankDetails: fields.bankDetails || "Bank Details",
    notes: fields.notes || "Notes",
    terms: fields.terms || "Terms & Conditions",
  };
}

export function getVoucherPdfLabels(locale: string) {
  const data = loadTranslations(locale, "vouchers");
  const fields = (data.fields || {}) as Record<string, string>;
  return {
    title: (data.title as string) || "Payment Voucher",
    voucherNumber: fields.voucherNumber || "Voucher Number",
    voucherDate: fields.voucherDate || "Voucher Date",
    paidTo: fields.paidTo || "Paid To",
    amount: fields.amount || "Amount",
    amountInWords: fields.amountInWords || "Amount in Words",
    purpose: fields.purpose || "Purpose",
    paymentMode: fields.paymentMode || "Payment Mode",
    referenceNumber: fields.referenceNumber || "Reference Number",
    approvedBy: fields.approvedBy || "Approved By",
    receivedBy: fields.receivedBy || "Received By",
    notes: fields.notes || "Notes",
  };
}

export function getSalarySlipPdfLabels(locale: string) {
  const data = loadTranslations(locale, "salary-slips");
  const fields = (data.fields || {}) as Record<string, string>;
  return {
    title: (data.title as string) || "Salary Slip",
    employeeName: fields.employeeName || "Employee Name",
    employeeId: fields.employeeId || "Employee ID",
    designation: fields.designation || "Designation",
    department: fields.department || "Department",
    month: fields.month || "Month",
    basicSalary: fields.basicSalary || "Basic Salary",
    hra: fields.hra || "HRA",
    allowances: fields.allowances || "Allowances",
    deductions: fields.deductions || "Deductions",
    grossSalary: fields.grossSalary || "Gross Salary",
    netSalary: fields.netSalary || "Net Salary",
    earnings: fields.earnings || "Earnings",
  };
}

export function getQuotePdfLabels(locale: string) {
  const data = loadTranslations(locale, "quotes");
  const fields = (data.fields || {}) as Record<string, string>;
  return {
    title: (data.title as string) || "Quotation",
    quoteNumber: fields.quoteNumber || "Quote Number",
    quoteDate: fields.quoteDate || "Quote Date",
    validUntil: fields.validUntil || "Valid Until",
    preparedFor: fields.preparedFor || "Prepared For",
    itemDescription: fields.itemDescription || "Item Description",
    quantity: fields.quantity || "Quantity",
    unitPrice: fields.unitPrice || "Unit Price",
    amount: fields.amount || "Amount",
    subtotal: fields.subtotal || "Subtotal",
    tax: fields.tax || "Tax",
    total: fields.total || "Total",
    notes: fields.notes || "Notes",
    terms: fields.terms || "Terms & Conditions",
  };
}
