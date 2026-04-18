import { describe, it, expect } from "vitest";
import {
  batchInvoicesToTallyXML,
  batchVouchersToTallyXML,
  parseTallyXml,
  type InvoiceWithItems,
  type PaymentVoucherData,
} from "../tally";

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeInvoice(overrides?: Partial<InvoiceWithItems>): InvoiceWithItems {
  return {
    id: "inv_001",
    invoiceNumber: "INV-2026-001",
    invoiceDate: "2026-04-01",
    totalAmount: 11800,
    notes: "Test invoice",
    formData: {},
    lineItems: [
      { description: "Web design services", quantity: 1, unitPrice: 10000, taxRate: 18, discount: 0, amount: 10000 },
    ],
    customer: { name: "Acme Corp", gstin: "27AABCU9603R1ZX" },
    organization: { name: "Slipwise Test Org" },
    ...overrides,
  };
}

function makeVoucher(overrides?: Partial<PaymentVoucherData>): PaymentVoucherData {
  return {
    id: "vch_001",
    voucherNumber: "PV-2026-001",
    date: "2026-04-05",
    voucherType: "Payment",
    debitLedger: "Acme Corp",
    creditLedger: "HDFC Bank",
    amount: 11800,
    narration: "Payment against INV-2026-001",
    ...overrides,
  };
}

// ─── Export tests ─────────────────────────────────────────────────────────────

describe("batchInvoicesToTallyXML", () => {
  it("produces a valid XML envelope with ENVELOPE/HEADER/BODY structure", () => {
    const xml = batchInvoicesToTallyXML([makeInvoice()]);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<ENVELOPE>");
    expect(xml).toContain("<TALLYREQUEST>Import Data</TALLYREQUEST>");
    expect(xml).toContain("</ENVELOPE>");
  });

  it("generates a Sales VOUCHER element for each invoice", () => {
    const xml = batchInvoicesToTallyXML([makeInvoice()]);
    expect(xml).toContain('VCHTYPE="Sales"');
    expect(xml).toContain("<VOUCHERNUMBER>INV-2026-001</VOUCHERNUMBER>");
  });

  it("sets the Tally date in YYYYMMDD format", () => {
    const xml = batchInvoicesToTallyXML([makeInvoice({ invoiceDate: "2026-04-01" })]);
    expect(xml).toContain("<DATE>20260401</DATE>");
  });

  it("includes party name as debit ledger", () => {
    const xml = batchInvoicesToTallyXML([makeInvoice()]);
    expect(xml).toContain("<PARTYLEDGERNAME>Acme Corp</PARTYLEDGERNAME>");
  });

  it("writes party debit entry with positive amount (ISDEEMEDPOSITIVE=Yes)", () => {
    const xml = batchInvoicesToTallyXML([makeInvoice()]);
    // Party ledger debit
    expect(xml).toContain("<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>");
    expect(xml).toContain("<AMOUNT>11800.00</AMOUNT>");
  });

  it("writes sales credit entry for line items", () => {
    const xml = batchInvoicesToTallyXML([makeInvoice()]);
    // Existing implementation uses item description as ledger name (not "Sales Account")
    expect(xml).toContain("<LEDGERNAME>Web design services</LEDGERNAME>");
    expect(xml).toContain("<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>");
  });

  it("escapes XML special characters in party name", () => {
    const xml = batchInvoicesToTallyXML([
      makeInvoice({
        customer: { name: "R&D Corp <Test>", gstin: undefined },
      }),
    ]);
    expect(xml).toContain("R&amp;D Corp &lt;Test&gt;");
    expect(xml).not.toContain("R&D Corp");
  });

  it("handles multiple invoices in one envelope", () => {
    const xml = batchInvoicesToTallyXML([
      makeInvoice({ id: "inv_001", invoiceNumber: "INV-001" }),
      makeInvoice({ id: "inv_002", invoiceNumber: "INV-002" }),
    ]);
    expect(xml).toContain("<VOUCHERNUMBER>INV-001</VOUCHERNUMBER>");
    expect(xml).toContain("<VOUCHERNUMBER>INV-002</VOUCHERNUMBER>");
  });

  it("handles empty invoice list gracefully", () => {
    const xml = batchInvoicesToTallyXML([]);
    expect(xml).toContain("<ENVELOPE>");
    expect(xml).not.toContain("VCHTYPE");
  });
});

describe("batchVouchersToTallyXML", () => {
  it("generates Payment voucher with correct debit/credit ledgers", () => {
    const xml = batchVouchersToTallyXML([makeVoucher()]);
    expect(xml).toContain('VCHTYPE="Payment"');
    expect(xml).toContain("<VOUCHERNUMBER>PV-2026-001</VOUCHERNUMBER>");
    expect(xml).toContain("<LEDGERNAME>Acme Corp</LEDGERNAME>");
    expect(xml).toContain("<LEDGERNAME>HDFC Bank</LEDGERNAME>");
  });

  it("converts date to YYYYMMDD format", () => {
    const xml = batchVouchersToTallyXML([makeVoucher({ date: "2026-04-05" })]);
    expect(xml).toContain("<DATE>20260405</DATE>");
  });

  it("debit leg has negative amount, credit leg has positive amount", () => {
    const xml = batchVouchersToTallyXML([makeVoucher({ amount: 5000 })]);
    expect(xml).toContain("<AMOUNT>-5000.00</AMOUNT>");
    expect(xml).toContain("<AMOUNT>5000.00</AMOUNT>");
  });

  it("includes narration when provided", () => {
    const xml = batchVouchersToTallyXML([makeVoucher()]);
    expect(xml).toContain(
      "<NARRATION>Payment against INV-2026-001</NARRATION>"
    );
  });

  it("handles Receipt voucher type", () => {
    const xml = batchVouchersToTallyXML([
      makeVoucher({ voucherType: "Receipt" }),
    ]);
    expect(xml).toContain('VCHTYPE="Receipt"');
  });
});

// ─── Import / Parse tests ─────────────────────────────────────────────────────

describe("parseTallyXml", () => {
  const SAMPLE_SALES_XML = `<?xml version="1.0"?>
<ENVELOPE>
  <BODY>
    <IMPORTDATA>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>20260401</DATE>
            <VOUCHERNUMBER>INV-2026-001</VOUCHERNUMBER>
            <PARTYLEDGERNAME>Acme Corp</PARTYLEDGERNAME>
            <PARTYGSTIN>27AABCU9603R1ZX</PARTYGSTIN>
            <NARRATION>Test sale</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Acme Corp</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>11800.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-10000.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  const SAMPLE_PAYMENT_XML = `<?xml version="1.0"?>
<ENVELOPE>
  <BODY>
    <IMPORTDATA>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Payment" ACTION="Create">
            <DATE>20260405</DATE>
            <VOUCHERNUMBER>PV-2026-001</VOUCHERNUMBER>
            <NARRATION>Payment to supplier</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Supplier Ledger</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-5000.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>HDFC Bank</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>5000.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

  it("parses a Sales voucher into salesVouchers array", () => {
    const result = parseTallyXml(SAMPLE_SALES_XML);
    expect(result.salesVouchers).toHaveLength(1);
    expect(result.salesVouchers[0].voucherNumber).toBe("INV-2026-001");
    expect(result.salesVouchers[0].partyName).toBe("Acme Corp");
    expect(result.salesVouchers[0].partyGstin).toBe("27AABCU9603R1ZX");
    expect(result.salesVouchers[0].totalAmount).toBeGreaterThan(0);
    expect(result.salesVouchers[0].narration).toBe("Test sale");
  });

  it("converts Tally YYYYMMDD date to DD-MM-YYYY display format", () => {
    const result = parseTallyXml(SAMPLE_SALES_XML);
    expect(result.salesVouchers[0].date).toBe("01-04-2026");
  });

  it("parses a Payment voucher into paymentVouchers array", () => {
    const result = parseTallyXml(SAMPLE_PAYMENT_XML);
    expect(result.paymentVouchers).toHaveLength(1);
    const v = result.paymentVouchers[0];
    expect(v.voucherNumber).toBe("PV-2026-001");
    expect(v.voucherType).toBe("Payment");
    expect(v.debitLedger).toBe("Supplier Ledger");
    expect(v.creditLedger).toBe("HDFC Bank");
    expect(v.amount).toBe(5000);
    expect(v.narration).toBe("Payment to supplier");
  });

  it("parses combined XML with both Sales and Payment vouchers", () => {
    const combined = SAMPLE_SALES_XML.replace("</REQUESTDATA>", "")
      .replace("</IMPORTDATA>", "")
      .replace("</BODY>", "")
      .replace("</ENVELOPE>", "") +
      SAMPLE_PAYMENT_XML.replace('<?xml version="1.0"?>', "")
        .replace("<ENVELOPE>", "")
        .replace("<BODY>", "")
        .replace("<IMPORTDATA>", "")
        .replace("<REQUESTDATA>", "");
    const result = parseTallyXml(combined);
    expect(result.salesVouchers.length + result.paymentVouchers.length).toBeGreaterThan(0);
  });

  it("adds error when no VOUCHER elements found", () => {
    const result = parseTallyXml("<NOT_TALLY/>");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("No VOUCHER elements found");
  });

  it("skips payment voucher with fewer than 2 ledger entries", () => {
    const xml = `
      <VOUCHER VCHTYPE="Payment" ACTION="Create">
        <DATE>20260401</DATE>
        <VOUCHERNUMBER>PV-BAD</VOUCHERNUMBER>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>Only One</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-100.00</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      </VOUCHER>`;
    const result = parseTallyXml(xml);
    expect(result.paymentVouchers).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("PV-BAD");
  });

  it("is idempotent — parsing the same XML twice yields the same result", () => {
    const r1 = parseTallyXml(SAMPLE_SALES_XML);
    const r2 = parseTallyXml(SAMPLE_SALES_XML);
    expect(r1).toEqual(r2);
  });
});
