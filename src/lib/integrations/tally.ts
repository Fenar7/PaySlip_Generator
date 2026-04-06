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
