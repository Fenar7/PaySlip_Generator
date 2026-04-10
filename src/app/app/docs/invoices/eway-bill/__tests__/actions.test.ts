import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findFirst: vi.fn(),
      update: vi.fn(),
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

import { db } from "@/lib/db";
import { requireRole, requireOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";

import { generateEwayBill, getEwayBillStatus } from "../actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOrg = { orgId: "org-1", userId: "user-1", role: "admin" };

function mockInvoiceWithGoods(overrides = {}) {
  return {
    id: "inv-1",
    organizationId: "org-1",
    invoiceNumber: "INV-2025-001",
    status: "ISSUED",
    totalAmount: 100000,
    gstTotalCgst: 9000,
    gstTotalSgst: 9000,
    gstTotalIgst: 0,
    gstTotalCess: 0,
    lineItems: [
      {
        id: "li-1",
        description: "Electronic Equipment",
        hsnCode: "8471",
        sacCode: null,
        quantity: 10,
        unitPrice: 10000,
        amount: 100000,
        gstRate: 18,
      },
    ],
    ...overrides,
  };
}

function mockInvoiceWithServices(overrides = {}) {
  return {
    id: "inv-2",
    organizationId: "org-1",
    invoiceNumber: "INV-2025-002",
    status: "ISSUED",
    totalAmount: 100000,
    gstTotalCgst: 9000,
    gstTotalSgst: 9000,
    gstTotalIgst: 0,
    gstTotalCess: 0,
    lineItems: [
      {
        id: "li-1",
        description: "Consulting Services",
        hsnCode: "998311",
        sacCode: "998311",
        quantity: 1,
        unitPrice: 100000,
        amount: 100000,
        gstRate: 18,
      },
    ],
    ...overrides,
  };
}

const defaultEwbInput = {
  invoiceId: "inv-1",
  transportMode: "Road",
  vehicleNumber: "KA01AB1234",
  distanceKm: 250,
  fromPincode: "560001",
  toPincode: "400001",
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(requireRole).mockResolvedValue(mockOrg);
  vi.mocked(requireOrgContext).mockResolvedValue(mockOrg);
  vi.mocked(checkFeature).mockResolvedValue(true);
  vi.mocked(db.invoice.update).mockResolvedValue({} as never);
});

// ─── e-Way Bill requires goods (HSN codes) ────────────────────────────────────

describe("e-Way Bill requires goods", () => {
  it("generates e-Way Bill for goods with HSN codes", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(
      mockInvoiceWithGoods() as never
    );

    const result = await generateEwayBill(defaultEwbInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eWayBillNumber).toBeTruthy();
      expect(result.data.transportMode).toBe("Road");
    }

    expect(db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ewbTransportMode: "Road",
          ewbVehicleNumber: "KA01AB1234",
          ewbDistanceKm: 250,
          ewbFromPincode: "560001",
          ewbToPincode: "400001",
        }),
      })
    );
  });
});

// ─── TC-15-010: e-Way Bill returns error for services-only invoices ───────────

describe("TC-15-010: e-Way Bill blocked for services", () => {
  it("returns error when all items are SAC codes (services)", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(
      mockInvoiceWithServices() as never
    );

    const result = await generateEwayBill({
      ...defaultEwbInput,
      invoiceId: "inv-2",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("e-Way Bill not required for services");
    }
  });

  it("returns error when items have HSN codes starting with 99 (services)", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(
      mockInvoiceWithServices({
        lineItems: [
          {
            id: "li-1",
            description: "IT Services",
            hsnCode: "998314",
            sacCode: null,
            quantity: 1,
            unitPrice: 100000,
            amount: 100000,
            gstRate: 18,
          },
        ],
      }) as never
    );

    const result = await generateEwayBill(defaultEwbInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("e-Way Bill not required for services");
    }
  });
});

// ─── e-Way Bill expiry is 3 days from generation ─────────────────────────────

describe("e-Way Bill expiry", () => {
  it("sets expiry to 3 days from generation", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(
      mockInvoiceWithGoods() as never
    );

    const beforeGenerate = Date.now();
    const result = await generateEwayBill(defaultEwbInput);
    const afterGenerate = Date.now();

    expect(result.success).toBe(true);
    if (result.success) {
      const expiryDate = new Date(result.data.eWayBillExpiry).getTime();
      const generatedDate = new Date(result.data.eWayBillDate).getTime();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

      // Expiry should be ~3 days after generation
      expect(expiryDate - generatedDate).toBe(threeDaysMs);

      // Generation time should be reasonable (within test execution window)
      expect(generatedDate).toBeGreaterThanOrEqual(beforeGenerate);
      expect(generatedDate).toBeLessThanOrEqual(afterGenerate);
    }
  });
});

// ─── Invoice value threshold ──────────────────────────────────────────────────

describe("Invoice value threshold", () => {
  it("rejects invoices with total value ≤ ₹50,000", async () => {
    vi.mocked(db.invoice.findFirst).mockResolvedValue(
      mockInvoiceWithGoods({
        totalAmount: 40000,
        gstTotalCgst: 3600,
        gstTotalSgst: 3600,
        gstTotalIgst: 0,
        gstTotalCess: 0,
      }) as never
    );

    const result = await generateEwayBill(defaultEwbInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("₹50,000");
    }
  });
});

// ─── Status check ─────────────────────────────────────────────────────────────

describe("getEwayBillStatus", () => {
  it("returns expired flag when bill has expired", async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    vi.mocked(db.invoice.findFirst).mockResolvedValue({
      eWayBillNumber: "EWB123",
      eWayBillDate: new Date("2025-01-10"),
      eWayBillExpiry: pastDate,
      ewbTransportMode: "Road",
      ewbVehicleNumber: "KA01AB1234",
      ewbTransporterGstin: null,
      ewbTransportDocNo: null,
      ewbDistanceKm: 250,
      ewbFromPincode: "560001",
      ewbToPincode: "400001",
    } as never);

    const result = await getEwayBillStatus("inv-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expired).toBe(true);
    }
  });

  it("returns not expired when bill is still valid", async () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    vi.mocked(db.invoice.findFirst).mockResolvedValue({
      eWayBillNumber: "EWB456",
      eWayBillDate: new Date(),
      eWayBillExpiry: futureDate,
      ewbTransportMode: "Rail",
      ewbVehicleNumber: null,
      ewbTransporterGstin: null,
      ewbTransportDocNo: null,
      ewbDistanceKm: 500,
      ewbFromPincode: "560001",
      ewbToPincode: "110001",
    } as never);

    const result = await getEwayBillStatus("inv-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expired).toBe(false);
    }
  });
});

// ─── Plan gate ────────────────────────────────────────────────────────────────

describe("Plan gate for e-Way Bill", () => {
  it("rejects when org lacks gstEInvoicing feature", async () => {
    vi.mocked(checkFeature).mockResolvedValue(false);

    const result = await generateEwayBill(defaultEwbInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Upgrade to Pro");
    }
  });
});
