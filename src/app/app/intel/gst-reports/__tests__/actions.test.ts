import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted) ────────────────────────────────────────────────────

const { mockDb, mockRequireOrgContext, mockCheckFeature } = vi.hoisted(() => ({
  mockDb: {
    invoice: {
      findMany: vi.fn(),
    },
  },
  mockRequireOrgContext: vi.fn(),
  mockCheckFeature: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/auth", () => ({ requireOrgContext: mockRequireOrgContext }));
vi.mock("@/lib/plans/enforcement", () => ({ checkFeature: mockCheckFeature }));

import {
  getGstr1Data,
  exportGstr1Csv,
  getGstr3bSummary,
  getGstHealthCheck,
} from "../actions";

// ── Fixtures ───────────────────────────────────────────────────────────

const ORG_ID = "org-test-123";

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    organizationId: ORG_ID,
    customerId: "cust-1",
    invoiceNumber: "INV-001",
    invoiceDate: "2025-01-15",
    status: "ISSUED",
    totalAmount: 11800,
    gstTotalCgst: 900,
    gstTotalSgst: 900,
    gstTotalIgst: 0,
    gstTotalCess: 0,
    customerGstin: "29ABCDE1234F1Z5",
    placeOfSupply: "29-Karnataka",
    reverseCharge: false,
    exportType: null,
    customer: { name: "Acme Corp", gstin: "29ABCDE1234F1Z5" },
    lineItems: [
      {
        hsnCode: "9983",
        sacCode: null,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        cessAmount: 0,
        gstType: "INTRASTATE",
        amount: 10000,
      },
    ],
    ...overrides,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireOrgContext.mockResolvedValue({ userId: "u1", orgId: ORG_ID, role: "admin" });
  mockCheckFeature.mockResolvedValue(true);
});

// ── TC-15-013: GSTR-1 CSV export: B2B section includes correct GSTIN ──

describe("TC-15-013: GSTR-1 CSV export B2B GSTIN", () => {
  it("includes the correct customer GSTIN in the B2B CSV section", async () => {
    const b2bInvoice = makeInvoice();
    mockDb.invoice.findMany.mockResolvedValue([b2bInvoice]);

    const result = await exportGstr1Csv({ startDate: "2025-01-01", endDate: "2025-01-31" });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const lines = result.data.split("\n");
    const b2bHeaderIdx = lines.findIndex((l) => l.includes("B2B Invoices"));
    expect(b2bHeaderIdx).toBeGreaterThan(0);

    // Next non-header line after B2B should contain the GSTIN
    const dataLine = lines[b2bHeaderIdx + 1];
    expect(dataLine).toContain("29ABCDE1234F1Z5");
    expect(dataLine).toContain("INV-001");
  });
});

// ── TC-15-014: Invoice with missing GSTIN excluded from B2B ────────────

describe("TC-15-014: Missing GSTIN goes to B2C", () => {
  it("puts invoice without GSTIN in B2C, not B2B", async () => {
    const noGstinInvoice = makeInvoice({
      id: "inv-2",
      invoiceNumber: "INV-002",
      customerGstin: null,
      customer: { name: "Small Biz", gstin: null },
    });

    mockDb.invoice.findMany.mockResolvedValue([noGstinInvoice]);

    const result = await getGstr1Data({ startDate: "2025-01-01", endDate: "2025-01-31" });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.b2b).toHaveLength(0);
    expect(result.data.b2c).toHaveLength(1);
    expect(result.data.b2c[0].invoiceNumber).toBe("INV-002");
    expect(result.data.summary.totalB2b).toBe(0);
    expect(result.data.summary.totalB2c).toBe(1);
  });
});

// ── TC-15-015: GST report plan gate ────────────────────────────────────

describe("TC-15-015: Plan gate for gstrExport", () => {
  it("returns feature-check failure for free org", async () => {
    mockCheckFeature.mockResolvedValue(false);

    const result = await getGstr1Data({ startDate: "2025-01-01", endDate: "2025-01-31" });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/Pro plan/i);
  });

  it("blocks GSTR-3B for free org", async () => {
    mockCheckFeature.mockResolvedValue(false);

    const result = await getGstr3bSummary({ month: 1, year: 2025 });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/Pro plan/i);
  });

  it("blocks CSV export for free org", async () => {
    mockCheckFeature.mockResolvedValue(false);

    const result = await exportGstr1Csv({ startDate: "2025-01-01", endDate: "2025-01-31" });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/Pro plan/i);
  });
});

// ── GSTR-3B summary totals ─────────────────────────────────────────────

describe("GSTR-3B summary totals", () => {
  it("computes correct B2B and B2C totals", async () => {
    const b2bInv = makeInvoice({
      id: "inv-b2b",
      invoiceNumber: "INV-B2B",
      totalAmount: 11800,
      gstTotalCgst: 900,
      gstTotalSgst: 900,
      gstTotalIgst: 0,
      gstTotalCess: 0,
      customerGstin: "29ABCDE1234F1Z5",
      customer: { name: "Corp", gstin: "29ABCDE1234F1Z5" },
      lineItems: [{ gstType: "INTRASTATE", amount: 10000 }],
    });
    const b2cInv = makeInvoice({
      id: "inv-b2c",
      invoiceNumber: "INV-B2C",
      totalAmount: 5900,
      gstTotalCgst: 450,
      gstTotalSgst: 450,
      gstTotalIgst: 0,
      gstTotalCess: 0,
      customerGstin: null,
      customer: null,
      customerId: null,
      lineItems: [{ gstType: "INTRASTATE", amount: 5000 }],
    });

    mockDb.invoice.findMany.mockResolvedValue([b2bInv, b2cInv]);

    const result = await getGstr3bSummary({ month: 1, year: 2025 });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.outwardSupplies.b2b.taxableValue).toBe(10000);
    expect(result.data.outwardSupplies.b2b.cgst).toBe(900);
    expect(result.data.outwardSupplies.b2b.sgst).toBe(900);
    expect(result.data.outwardSupplies.b2c.taxableValue).toBe(5000);
    expect(result.data.outwardSupplies.b2c.cgst).toBe(450);

    // Total tax liability = sum of all
    expect(result.data.totalTaxLiability.cgst).toBe(1350);
    expect(result.data.totalTaxLiability.sgst).toBe(1350);
  });
});

// ── Health check: missing GSTIN ────────────────────────────────────────

describe("GST Health Check", () => {
  it("finds invoices with missing GSTIN", async () => {
    const inv = makeInvoice({
      customerId: "cust-1",
      customerGstin: null,
      customer: { name: "Biz", gstin: null },
      lineItems: [
        { hsnCode: "9983", sacCode: null, cgstAmount: 900, sgstAmount: 900, igstAmount: 0, cessAmount: 0 },
      ],
    });

    mockDb.invoice.findMany.mockResolvedValue([inv]);

    const result = await getGstHealthCheck();

    expect(result.success).toBe(true);
    if (!result.success) return;

    const gstinIssue = result.data.issues.find((i) => i.issue.includes("Missing customer GSTIN"));
    expect(gstinIssue).toBeDefined();
    expect(gstinIssue!.severity).toBe("warning");
    expect(gstinIssue!.invoiceNumber).toBe("INV-001");
  });

  it("finds invoices with missing HSN codes", async () => {
    const inv = makeInvoice({
      lineItems: [
        { hsnCode: null, sacCode: null, cgstAmount: 900, sgstAmount: 900, igstAmount: 0, cessAmount: 0 },
      ],
    });

    mockDb.invoice.findMany.mockResolvedValue([inv]);

    const result = await getGstHealthCheck();

    expect(result.success).toBe(true);
    if (!result.success) return;

    const hsnIssue = result.data.issues.find((i) => i.issue.includes("HSN/SAC code"));
    expect(hsnIssue).toBeDefined();
    expect(hsnIssue!.severity).toBe("error");
  });

  it("finds invoices with GST amount mismatches", async () => {
    const inv = makeInvoice({
      gstTotalCgst: 1000, // Mismatch: header says 1000 but line items sum to 900
      lineItems: [
        { hsnCode: "9983", sacCode: null, cgstAmount: 900, sgstAmount: 900, igstAmount: 0, cessAmount: 0 },
      ],
    });

    mockDb.invoice.findMany.mockResolvedValue([inv]);

    const result = await getGstHealthCheck();

    expect(result.success).toBe(true);
    if (!result.success) return;

    const mismatch = result.data.issues.find((i) => i.issue.includes("do not match"));
    expect(mismatch).toBeDefined();
    expect(mismatch!.severity).toBe("error");
  });

  it("finds invoices with missing place of supply", async () => {
    const inv = makeInvoice({
      placeOfSupply: null,
      lineItems: [
        { hsnCode: "9983", sacCode: null, cgstAmount: 900, sgstAmount: 900, igstAmount: 0, cessAmount: 0 },
      ],
    });

    mockDb.invoice.findMany.mockResolvedValue([inv]);

    const result = await getGstHealthCheck();

    expect(result.success).toBe(true);
    if (!result.success) return;

    const posIssue = result.data.issues.find((i) => i.issue.includes("place of supply"));
    expect(posIssue).toBeDefined();
    expect(posIssue!.severity).toBe("warning");
  });
});
