import { describe, it, expect, vi } from "vitest";
import { buildEInvoicePayload, validateForEInvoice } from "../einvoice";
import type { Invoice, Organization, EInvoiceConfig } from "@/generated/prisma/client";

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice & { lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number; taxRate: number }> } {
  return {
    id: "inv-001",
    organizationId: "org-001",
    customerId: "cust-001",
    invoiceNumber: "INV/2026/001",
    invoiceDate: "2026-03-15",
    dueDate: "2026-04-14",
    status: "ISSUED",
    formData: {},
    totalAmount: 118000,
    notes: null,
    originalId: null,
    issuedAt: new Date("2026-03-15"),
    paidAt: null,
    overdueAt: null,
    reissueReason: null,
    razorpayPaymentLinkId: null,
    razorpayPaymentLinkUrl: null,
    paymentLinkExpiresAt: null,
    amountPaid: 0,
    remainingAmount: 118000,
    lastPaymentAt: null,
    lastPaymentMethod: null,
    paymentPromiseDate: null,
    paymentLinkStatus: null,
    paymentLinkLastEventAt: null,
    dunningEnabled: true,
    dunningPausedUntil: null,
    dunningSequenceId: null,
    supplierGstin: "29AAACR5055K1ZK",
    customerGstin: "27AABCS1234Z1ZV",
    placeOfSupply: "27",
    reverseCharge: false,
    exportType: null,
    gstTotalCgst: 0,
    gstTotalSgst: 0,
    gstTotalIgst: 18000,
    gstTotalCess: 0,
    irnNumber: null,
    irnAckNumber: null,
    irnAckDate: null,
    irnQrCode: null,
    eWayBillNumber: null,
    eWayBillDate: null,
    eWayBillExpiry: null,
    ewbTransportMode: null,
    ewbVehicleNumber: null,
    // add any other fields from Invoice model
    createdAt: new Date("2026-03-15"),
    updatedAt: new Date("2026-03-15"),
    ...overrides,
    lineItems: [
      {
        description: "Software License",
        quantity: 1,
        unitPrice: 100000,
        amount: 100000,
        taxRate: 18,
      },
    ],
  } as unknown as Invoice & { lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number; taxRate: number }> };
}

function makeOrg(overrides: Partial<Pick<Organization, "name" | "gstin" | "address">> = {}) {
  return {
    name: "Acme Tech Pvt Ltd",
    gstin: "29AAACR5055K1ZK",
    address: "123 MG Road, Bengaluru, Karnataka 560001",
    ...overrides,
  };
}

function makeConfig(overrides: Partial<EInvoiceConfig> = {}): EInvoiceConfig {
  return {
    id: "config-001",
    orgId: "org-001",
    enabled: true,
    irpEnvironment: "sandbox",
    gstin: null,
    encryptedUsername: null,
    encryptedPassword: null,
    authTokenCache: null,
    tokenExpiresAt: null,
    autoGenerateIrn: false,
    autoGenerateEwb: false,
    ewbDefaultTransportMode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── validateForEInvoice ──────────────────────────────────────────────────────

describe("validateForEInvoice", () => {
  it("returns no errors for a valid invoice", () => {
    const errors = validateForEInvoice(makeInvoice());
    expect(errors).toHaveLength(0);
  });

  it("requires supplierGstin", () => {
    const errors = validateForEInvoice(makeInvoice({ supplierGstin: null }));
    expect(errors.some((e) => e.includes("GSTIN"))).toBe(true);
  });

  it("requires placeOfSupply", () => {
    const errors = validateForEInvoice(makeInvoice({ placeOfSupply: null }));
    expect(errors.some((e) => e.includes("Place of Supply"))).toBe(true);
  });

  it("returns multiple errors for missing required fields", () => {
    const errors = validateForEInvoice(makeInvoice({ supplierGstin: null, placeOfSupply: null }));
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── buildEInvoicePayload ─────────────────────────────────────────────────────

describe("buildEInvoicePayload", () => {
  it("builds a valid NIC IRP v1.03 payload structure", () => {
    const payload = buildEInvoicePayload(makeInvoice(), makeOrg(), makeConfig());

    expect(payload.Version).toBe("1.1");
    expect(payload.TranDtls.TaxSch).toBe("GST");
    expect(payload.DocDtls.No).toBe("INV/2026/001");
    expect(payload.DocDtls.Typ).toBe("INV");
    expect(payload.SellerDtls.Gstin).toBe("29AAACR5055K1ZK");
    expect(payload.BuyerDtls).toBeDefined();
    expect(payload.ValDtls).toBeDefined();
    expect(payload.ItemList).toBeInstanceOf(Array);
    expect(payload.ItemList.length).toBeGreaterThanOrEqual(1);
  });

  it("uses config gstin override when provided", () => {
    const config = makeConfig({ gstin: "07AAFCM4329K1ZL" });
    const payload = buildEInvoicePayload(makeInvoice(), makeOrg(), config);
    expect(payload.SellerDtls.Gstin).toBe("07AAFCM4329K1ZL");
  });

  it("sets RegRev = Y for reverse charge invoices", () => {
    const payload = buildEInvoicePayload(
      makeInvoice({ reverseCharge: true }),
      makeOrg(),
      makeConfig()
    );
    expect(payload.TranDtls.RegRev).toBe("Y");
  });

  it("sets RegRev = N for normal B2B invoices", () => {
    const payload = buildEInvoicePayload(
      makeInvoice({ reverseCharge: false }),
      makeOrg(),
      makeConfig()
    );
    expect(payload.TranDtls.RegRev).toBe("N");
  });

  it("includes correct ValDtls totals", () => {
    const invoice = makeInvoice({ totalAmount: 118000, gstTotalIgst: 18000 });
    const payload = buildEInvoicePayload(invoice, makeOrg(), makeConfig());
    // TotInvVal should reflect totalAmount
    expect(Number(payload.ValDtls.TotInvVal)).toBeCloseTo(118000, 0);
  });

  it("handles IGST-only interstate transaction", () => {
    const invoice = makeInvoice({
      supplierGstin: "29AAACR5055K1ZK",
      customerGstin: "27AABCS1234Z1ZV",
      placeOfSupply: "27",
      gstTotalCgst: 0,
      gstTotalSgst: 0,
      gstTotalIgst: 18000,
    });
    const payload = buildEInvoicePayload(invoice, makeOrg(), makeConfig());
    expect(Number(payload.ValDtls.IgstVal)).toBe(18000);
    expect(Number(payload.ValDtls.CgstVal)).toBe(0);
    expect(Number(payload.ValDtls.SgstVal)).toBe(0);
  });

  it("handles CGST+SGST intrastate transaction", () => {
    const invoice = makeInvoice({
      supplierGstin: "29AAACR5055K1ZK",
      customerGstin: "29AABCS1234Z1ZU",
      placeOfSupply: "29",
      gstTotalCgst: 9000,
      gstTotalSgst: 9000,
      gstTotalIgst: 0,
    });
    const payload = buildEInvoicePayload(invoice, makeOrg(), makeConfig());
    expect(Number(payload.ValDtls.CgstVal)).toBe(9000);
    expect(Number(payload.ValDtls.SgstVal)).toBe(9000);
    expect(Number(payload.ValDtls.IgstVal)).toBe(0);
  });
});
