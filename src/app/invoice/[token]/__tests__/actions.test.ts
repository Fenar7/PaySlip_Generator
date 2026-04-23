import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  publicInvoiceTokenFindUnique: vi.fn(),
  reconcileInvoicePayment: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    publicInvoiceToken: {
      findUnique: mocks.publicInvoiceTokenFindUnique,
    },
  },
}));

vi.mock("@/lib/invoice-reconciliation", () => ({
  reconcileInvoicePayment: mocks.reconcileInvoicePayment,
}));

import { getPublicInvoice } from "../actions";

describe("getPublicInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reconcileInvoicePayment.mockResolvedValue({
      invoiceId: "inv-1",
      amountPaid: 2000,
      remainingAmount: 3000,
      derivedStatus: "PARTIALLY_PAID",
      statusChanged: true,
      previousStatus: "VIEWED",
    });
  });

  it("reconciles stale payment snapshots before exposing public proof eligibility", async () => {
    mocks.publicInvoiceTokenFindUnique.mockResolvedValue({
      id: "token-record-1",
      expiresAt: null,
      invoice: {
        id: "inv-1",
        invoiceNumber: "INV-001",
        invoiceDate: new Date("2026-04-01"),
        dueDate: new Date("2026-04-30"),
        status: "VIEWED",
        totalAmount: 5000,
        amountPaid: 2000,
        remainingAmount: 0,
        paymentPromiseDate: null,
        notes: null,
        paidAt: null,
        razorpayPaymentLinkUrl: null,
        paymentLinkStatus: null,
        paymentLinkExpiresAt: null,
        formData: {},
        lineItems: [],
        customer: null,
        organization: { name: "Acme Corp" },
        proofs: [],
      },
    });

    const result = await getPublicInvoice("public-token");

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected public invoice lookup to succeed");
    }

    expect(mocks.reconcileInvoicePayment).toHaveBeenCalledWith("inv-1");
    expect(result.data.invoice.status).toBe("PARTIALLY_PAID");
    expect(result.data.invoice.amountPaid).toBe(2000);
    expect(result.data.invoice.remainingAmount).toBe(3000);
    expect(result.data.invoice.paymentProof).toEqual(
      expect.objectContaining({
        status: "PARTIALLY_PAID",
        totalAmount: 5000,
        amountPaid: 2000,
        remainingAmount: 3000,
        canUpload: true,
        blockedReason: null,
      }),
    );
  });
});
