import "server-only";

export interface InvoiceLineItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  amount: number;
}

export interface InvoiceWithItems {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  notes?: string | null;
  formData: Record<string, unknown>;
  lineItems: InvoiceLineItemData[];
  customer?: {
    name: string;
    gstin?: string | null;
  } | null;
  organization: {
    name: string;
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatTallyDate(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function buildVoucherXml(invoice: InvoiceWithItems): string {
  const partyName = invoice.customer?.name ?? "Cash";
  const tallyDate = formatTallyDate(invoice.invoiceDate);

  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const itemEntries = invoice.lineItems.map((item) => {
    const lineAmount = item.quantity * item.unitPrice - item.discount;

    const taxAmount = lineAmount * (item.taxRate / 100);
    // Assume intra-state (CGST+SGST split) by default
    const isInterState =
      (invoice.formData as Record<string, unknown>)?.isInterState === true;

    if (isInterState) {
      totalIgst += taxAmount;
    } else {
      totalCgst += taxAmount / 2;
      totalSgst += taxAmount / 2;
    }

    return `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXml(item.description)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${lineAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
  });

  let taxEntries = "";
  if (totalCgst > 0) {
    taxEntries += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>CGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${totalCgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
  }
  if (totalSgst > 0) {
    taxEntries += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>SGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${totalSgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
  }
  if (totalIgst > 0) {
    taxEntries += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>IGST</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>-${totalIgst.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
  }

  return `
      <VOUCHER VCHTYPE="Sales" ACTION="Create">
        <DATE>${tallyDate}</DATE>
        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${escapeXml(invoice.invoiceNumber)}</VOUCHERNUMBER>
        <PARTYLEDGERNAME>${escapeXml(partyName)}</PARTYLEDGERNAME>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXml(partyName)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>${invoice.totalAmount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>${itemEntries.join("")}${taxEntries}
      </VOUCHER>`;
}

export function invoiceToTallyXML(invoice: InvoiceWithItems): string {
  const voucher = buildVoucherXml(invoice);

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">${voucher}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export function batchInvoicesToTallyXML(
  invoices: InvoiceWithItems[]
): string {
  const vouchers = invoices.map(buildVoucherXml).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">${vouchers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ─── Voucher Export ───────────────────────────────────────────────────────────

export interface PaymentVoucherData {
  id: string;
  voucherNumber: string;
  date: string;
  voucherType: "Payment" | "Receipt" | "Journal";
  partyName?: string;
  debitLedger: string;
  creditLedger: string;
  amount: number;
  narration?: string;
}

function buildPaymentVoucherXml(v: PaymentVoucherData): string {
  const tallyDate = formatTallyDate(v.date);
  return `
      <VOUCHER VCHTYPE="${v.voucherType}" ACTION="Create">
        <DATE>${tallyDate}</DATE>
        <VOUCHERTYPENAME>${v.voucherType}</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${escapeXml(v.voucherNumber)}</VOUCHERNUMBER>${v.narration ? `\n        <NARRATION>${escapeXml(v.narration)}</NARRATION>` : ""}
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXml(v.debitLedger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${v.amount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${escapeXml(v.creditLedger)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${v.amount.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>`;
}

export function batchVouchersToTallyXML(
  vouchers: PaymentVoucherData[]
): string {
  const voucherXml = vouchers.map(buildPaymentVoucherXml).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">${voucherXml}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ─── Import / Parse ───────────────────────────────────────────────────────────

export interface TallyParseResult {
  salesVouchers: Array<{
    voucherNumber: string;
    date: string;
    partyName: string;
    partyGstin?: string;
    totalAmount: number;
    narration?: string;
  }>;
  paymentVouchers: Array<{
    voucherNumber: string;
    date: string;
    voucherType: "Payment" | "Receipt" | "Journal";
    debitLedger: string;
    creditLedger: string;
    amount: number;
    narration?: string;
  }>;
  errors: Array<{ message: string }>;
}

/**
 * Parses a standard Tally XML export.
 * Handles VOUCHER elements with VCHTYPE = Sales, Payment, Receipt, Journal.
 * Uses regex parsing to avoid requiring an XML parser in the server bundle.
 */
export function parseTallyXml(xml: string): TallyParseResult {
  const result: TallyParseResult = {
    salesVouchers: [],
    paymentVouchers: [],
    errors: [],
  };

  const voucherRe =
    /<VOUCHER[^>]*VCHTYPE="([^"]+)"[^>]*>([\s\S]*?)<\/VOUCHER>/gi;
  let m: RegExpExecArray | null;
  let totalVouchersFound = 0;

  while ((m = voucherRe.exec(xml)) !== null) {
    totalVouchersFound++;
    const vchType = m[1].trim();
    const body = m[2];
    const voucherNumber = extractXmlField(body, "VOUCHERNUMBER") ?? "";
    const dateRaw = extractXmlField(body, "DATE") ?? "";
    const date = tallyDateToDisplay(dateRaw);
    const narration = extractXmlField(body, "NARRATION") ?? undefined;

    if (vchType === "Sales") {
      const partyName =
        extractXmlField(body, "PARTYLEDGERNAME") ??
        extractXmlField(body, "PARTYNAME") ??
        "Unknown";
      const partyGstin = extractXmlField(body, "PARTYGSTIN") ?? undefined;
      const amounts = extractAllXmlFields(body, "AMOUNT").map(
        (s) => parseFloat(s.replace(/[^0-9.\-]/g, "")) || 0
      );
      // Tally debit is positive (party receivable), credit is negative
      const totalAmount =
        amounts.find((a) => a > 0) ?? Math.abs(amounts[0] ?? 0);
      result.salesVouchers.push({
        voucherNumber,
        date,
        partyName,
        partyGstin,
        totalAmount,
        narration,
      });
    } else if (
      vchType === "Payment" ||
      vchType === "Receipt" ||
      vchType === "Journal"
    ) {
      const ledgers = parseLedgerEntries(body);
      if (ledgers.length < 2) {
        result.errors.push({
          message: `Voucher ${voucherNumber}: fewer than 2 ledger entries — skipping`,
        });
        continue;
      }
      const debit = ledgers.find((l) => l.isDeemed) ?? ledgers[0];
      const credit = ledgers.find((l) => !l.isDeemed) ?? ledgers[1];
      result.paymentVouchers.push({
        voucherNumber,
        date,
        voucherType: vchType as "Payment" | "Receipt" | "Journal",
        debitLedger: debit.name,
        creditLedger: credit.name,
        amount: Math.abs(credit.amount),
        narration,
      });
    }
  }

  if (totalVouchersFound === 0) {
    result.errors.push({
      message:
        "No VOUCHER elements found. Ensure the file is a valid Tally XML export.",
    });
  }

  return result;
}

// ─── Parse Helpers ────────────────────────────────────────────────────────────

/** Tally YYYYMMDD → DD-MM-YYYY display format */
function tallyDateToDisplay(raw: string): string {
  if (/^\d{8}$/.test(raw))
    return `${raw.slice(6, 8)}-${raw.slice(4, 6)}-${raw.slice(0, 4)}`;
  return raw;
}

function extractXmlField(xml: string, tag: string): string | null {
  const m = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i").exec(xml);
  return m ? m[1].trim() : null;
}

function extractAllXmlFields(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

interface LedgerEntry {
  name: string;
  isDeemed: boolean;
  amount: number;
}

function parseLedgerEntries(xml: string): LedgerEntry[] {
  const re =
    /<ALLLEDGERENTRIES\.LIST>([\s\S]*?)<\/ALLLEDGERENTRIES\.LIST>/gi;
  const entries: LedgerEntry[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    entries.push({
      name: extractXmlField(b, "LEDGERNAME") ?? "Unknown",
      isDeemed:
        (extractXmlField(b, "ISDEEMEDPOSITIVE") ?? "No").toLowerCase() ===
        "yes",
      amount:
        parseFloat(
          (extractXmlField(b, "AMOUNT") ?? "0").replace(/[^0-9.\-]/g, "")
        ) || 0,
    });
  }
  return entries;
}
