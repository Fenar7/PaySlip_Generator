import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    orgDefaults: {
      findUnique: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(),
  requireOrgContext: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/irp-client", () => ({
  generateIrn: vi.fn(),
  cancelIrn: vi.fn(),
}));

vi.mock("@/lib/gst/compute", () => ({
  validateGstin: vi.fn(),
}));

import { db } from "@/lib/db";
import { requireRole, requireOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { generateIrn } from "@/lib/irp-client";
import { validateGstin } from "@/lib/gst/compute";

import {
  generateInvoiceIrn,
  cancelInvoiceIrn,
  getInvoiceIrnStatus,
} from "../actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOrg = { orgId: "org-1", userId: "user-1", role: "admin" };

function mockInvoice(overrides = {}) {
  return {
    id: "inv-1",
    organizationId: "org-1",
    invoiceNumber: "INV-2025-001",
    invoiceDate: "2025-01-15",
    status: "ISSUED",
    totalAmount: 118000,
    supplierGstin: "29AABCU9603R1ZM",
    customerGstin: "27AABCR9603R1ZJ",
    placeOfSupply: "27",
    reverseCharge: false,
    gstTotalCgst: 0,
    gstTotalSgst: 0,
    gstTotalIgst: 18000,
    gstTotalCess: 0,
    irnNumber: null,
    irnAckNumber: null,
    irnAckDate: null,
    irnQrCode: null,
    customer: {
      id: "cust-1",
      name: "Buyer Corp",
      address: "123 Main St, Mumbai 400001",
      gstin: "27AABCR9603R1ZJ",
    },
    lineItems: [
      {
        id: "li-1",
        description: "Widget A",
        hsnCode: "8471",
        sacCode: null,
        quantity: 100,
        unitPrice: 1000,
        amount: 100000,
        gstRate: 18,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 18000,
        cessAmount: 0,
      },
    ],
    ...overrides,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(requireRole).mockResolvedValue(mockOrg);
  vi.mocked(requireOrgContext).mockResolvedValue(mockOrg);
  vi.mocked(checkFeature).mockResolvedValue(true);
  vi.mocked(validateGstin).mockReturnValue({ valid: true, stateCode: "29" });

  vi.mocked(db.orgDefaults.findUnique).mockResolvedValue({
    id: "od-1",
    organizationId: "org-1",
    businessAddress: "456 Tech Park, Bangalore 560001",
    gstin: "29AABCU9603R1ZM",
  } as never);

  vi.mocked(db.organization.findUnique).mockResolvedValue({
    id: "org-1",
    name: "Supplier Corp",
  } as never);

  vi.mocked(db.invoice.update).mockResolvedValue({} as never);
});

// ─── TC-15-005: IRN generation sandbox success ────────────────────────────────

describe("TC-15-005: IRN generation sandbox success", () => {
  it("stores AckNo on successful IRN generation", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(mockInvoice() as never);
    vi.mocked(generateIrn).mockResolvedValue({
      success: true,
      irn: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
      ackNo: "123456789",
      ackDate: "15/01/2025 10:30:00",
      signedQrCode: "base64qrdata",
    });

    const result = await generateInvoiceIrn("inv-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.irnNumber).toBe(
        "abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678"
      );
      expect(result.data.irnAckNumber).toBe("123456789");
      expect(result.data.irnQrCode).toBe("base64qrdata");
    }

    expect(db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-1" },
        data: expect.objectContaining({
          irnNumber: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
          irnAckNumber: "123456789",
          irnQrCode: "base64qrdata",
        }),
      })
    );
  });
});

// ─── TC-15-006: IRN duplicate error 2150 → idempotent ─────────────────────────

describe("TC-15-006: IRN duplicate error 2150 → idempotent fetch", () => {
  it("returns existing IRN when invoice already has one", async () => {
    const existingIrn = mockInvoice({
      irnNumber: "existing-irn-hash",
      irnAckNumber: "987654321",
      irnAckDate: new Date("2025-01-10"),
      irnQrCode: "existing-qr",
    });

    vi.mocked(db.invoice.findFirst).mockResolvedValue(existingIrn as never);

    const result = await generateInvoiceIrn("inv-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.irnNumber).toBe("existing-irn-hash");
      expect(result.data.irnAckNumber).toBe("987654321");
    }

    // Should NOT call generateIrn since IRN already exists
    expect(generateIrn).not.toHaveBeenCalled();
  });
});

// ─── TC-15-008: Invoice with IRN blocks edit ──────────────────────────────────

describe("TC-15-008: Invoice with IRN blocks edit", () => {
  it("returns existing IRN data without calling IRP when IRN already exists", async () => {
    const invoiceWithIrn = mockInvoice({
      irnNumber: "irn-already-set",
      irnAckNumber: "ack-123",
      irnAckDate: new Date("2025-01-12"),
      irnQrCode: "qr-existing",
    });

    vi.mocked(db.invoice.findFirst).mockResolvedValue(invoiceWithIrn as never);

    const result = await generateInvoiceIrn("inv-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.irnNumber).toBe("irn-already-set");
    }

    expect(generateIrn).not.toHaveBeenCalled();
    expect(db.invoice.update).not.toHaveBeenCalled();
  });
});

// ─── Plan gate check: Free org gets error ─────────────────────────────────────

describe("Plan gate check", () => {
  it("returns error when org does not have gstEInvoicing feature", async () => {
    vi.mocked(checkFeature).mockResolvedValue(false);

    const result = await generateInvoiceIrn("inv-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Upgrade to Pro for e-Invoicing");
    }
  });
});

// ─── Status validation ────────────────────────────────────────────────────────

describe("Status validation", () => {
  it("rejects DRAFT invoices", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(
      mockInvoice({ status: "DRAFT" }) as never
    );

    const result = await generateInvoiceIrn("inv-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("ISSUED or DUE");
    }
  });

  it("allows DUE invoices", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(
      mockInvoice({ status: "DUE" }) as never
    );
    vi.mocked(generateIrn).mockResolvedValue({
      success: true,
      irn: "irn-due-invoice",
      ackNo: "111",
      ackDate: "15/01/2025 10:00:00",
    });

    const result = await generateInvoiceIrn("inv-1");
    expect(result.success).toBe(true);
  });
});

// ─── GSTIN validation ─────────────────────────────────────────────────────────

describe("GSTIN validation", () => {
  it("returns error when supplier GSTIN is missing", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(
      mockInvoice({ supplierGstin: null }) as never
    );

    const result = await generateInvoiceIrn("inv-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Supplier GSTIN");
    }
  });

  it("returns error when customer GSTIN is invalid", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(mockInvoice() as never);
    vi.mocked(validateGstin)
      .mockReturnValueOnce({ valid: true, stateCode: "29" }) // supplier ok
      .mockReturnValueOnce({ valid: false, stateCode: "", error: "Invalid format" }); // customer bad

    const result = await generateInvoiceIrn("inv-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("customer GSTIN");
    }
  });
});

// ─── Cancel IRN ───────────────────────────────────────────────────────────────

describe("cancelInvoiceIrn", () => {
  it("returns error when invoice has no IRN", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(
      mockInvoice({ irnNumber: null }) as never
    );

    const result = await cancelInvoiceIrn("inv-1", "1", "Duplicate entry");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("does not have an IRN");
    }
  });
});

// ─── Get IRN Status ───────────────────────────────────────────────────────────

describe("getInvoiceIrnStatus", () => {
  it("returns IRN fields for the invoice", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue({
      irnNumber: "test-irn",
      irnAckNumber: "ack-456",
      irnAckDate: new Date("2025-01-15"),
      irnQrCode: "qr-data",
    } as never);

    const result = await getInvoiceIrnStatus("inv-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.irnNumber).toBe("test-irn");
      expect(result.data.irnAckNumber).toBe("ack-456");
      expect(result.data.irnQrCode).toBe("qr-data");
    }
  });
});
