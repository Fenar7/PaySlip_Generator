import { describe, it, expect, vi, beforeEach } from "vitest";
import { tryAutoMatchUnmatchedPayment, confirmMatch, suggestMatch } from "@/lib/razorpay/unmatched-payment-matcher";

vi.mock("@/lib/db", () => ({
  db: {
    unmatchedPayment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    customerVirtualAccount: {
      findFirst: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    invoicePayment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    invoiceStateEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn) => fn({
      invoicePayment: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      invoice: { update: vi.fn() },
      invoiceStateEvent: { create: vi.fn() },
      unmatchedPayment: { update: vi.fn() },
    })),
  },
}));

import { db } from "@/lib/db";

const mockDb = db as unknown as {
  unmatchedPayment: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  customerVirtualAccount: { findFirst: ReturnType<typeof vi.fn> };
  invoice: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  invoicePayment: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  invoiceStateEvent: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function makePayment(overrides: Partial<{
  id: string;
  orgId: string;
  status: string;
  amountPaise: bigint;
  virtualAccountId: string;
  razorpayPaymentId: string;
}> = {}) {
  return {
    id: "up_1",
    orgId: "org_1",
    status: "unmatched",
    amountPaise: BigInt(100000), // ₹1000
    virtualAccountId: "va_1",
    razorpayPaymentId: "pay_xyz",
    payerName: null,
    payerAccount: null,
    payerIfsc: null,
    matchedInvoiceId: null,
    receivedAt: new Date(),
    resolvedAt: null,
    ...overrides,
  };
}

describe("tryAutoMatchUnmatchedPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if payment not found", async () => {
    mockDb.unmatchedPayment.findUnique.mockResolvedValue(null);
    const result = await tryAutoMatchUnmatchedPayment("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null if payment is already resolved", async () => {
    mockDb.unmatchedPayment.findUnique.mockResolvedValue(makePayment({ status: "auto_matched" }));
    const result = await tryAutoMatchUnmatchedPayment("up_1");
    expect(result).toBeNull();
  });

  it("returns null if no virtual account found for the payment", async () => {
    mockDb.unmatchedPayment.findUnique.mockResolvedValue(makePayment());
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue(null);
    const result = await tryAutoMatchUnmatchedPayment("up_1");
    expect(result).toBeNull();
  });

  it("returns null if VA belongs to a different org", async () => {
    mockDb.unmatchedPayment.findUnique.mockResolvedValue(makePayment({ orgId: "org_1" }));
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue({
      customerId: "cust_1",
      orgId: "org_OTHER",
    });
    const result = await tryAutoMatchUnmatchedPayment("up_1");
    expect(result).toBeNull();
  });

  it("returns null if no open invoices exist for the customer", async () => {
    mockDb.unmatchedPayment.findUnique.mockResolvedValue(makePayment());
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue({ customerId: "cust_1", orgId: "org_1" });
    mockDb.invoice.findMany.mockResolvedValue([]);
    const result = await tryAutoMatchUnmatchedPayment("up_1");
    expect(result).toBeNull();
  });

  it("returns AUTO_EXACT when received amount is within ₹1 of remaining balance", async () => {
    mockDb.unmatchedPayment.findUnique.mockResolvedValue(
      makePayment({ amountPaise: BigInt(100000) }) // ₹1000
    );
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue({ customerId: "cust_1", orgId: "org_1" });
    mockDb.invoice.findMany.mockResolvedValue([
      { id: "inv_1", remainingAmount: 1000.5, status: "ISSUED" }, // within ₹1
    ]);
    const result = await tryAutoMatchUnmatchedPayment("up_1");
    expect(result?.mode).toBe("AUTO_EXACT");
    expect(result?.invoiceId).toBe("inv_1");
    expect(result?.confidence).toBe(1.0);
  });

  it("does NOT auto-match when difference exceeds ₹1", async () => {
    mockDb.unmatchedPayment.findUnique.mockResolvedValue(
      makePayment({ amountPaise: BigInt(100000) }) // ₹1000
    );
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue({ customerId: "cust_1", orgId: "org_1" });
    mockDb.invoice.findMany.mockResolvedValue([
      { id: "inv_1", remainingAmount: 1500, status: "ISSUED" }, // ₹500 off — not exact
      { id: "inv_2", remainingAmount: 800, status: "ISSUED" }, // ₹200 off — not exact
    ]);
    const result = await tryAutoMatchUnmatchedPayment("up_1");
    // 2 invoices, no exact → no suggestion either
    expect(result).toBeNull();
  });

  it("returns SUGGESTED when there is exactly one open invoice (no exact match)", async () => {
    mockDb.unmatchedPayment.findUnique.mockResolvedValue(
      makePayment({ amountPaise: BigInt(150000) }) // ₹1500
    );
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue({ customerId: "cust_1", orgId: "org_1" });
    mockDb.invoice.findMany.mockResolvedValue([
      { id: "inv_1", remainingAmount: 2000, status: "ISSUED" }, // only one, no exact match
    ]);
    const result = await tryAutoMatchUnmatchedPayment("up_1");
    expect(result?.mode).toBe("SUGGESTED");
    expect(result?.invoiceId).toBe("inv_1");
    expect(result?.confidence).toBe(0.85);
  });
});

describe("confirmMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates invoice payment, updates invoice, and marks payment resolved", async () => {
    const payment = makePayment({ amountPaise: BigInt(100000) }); // ₹1000
    const invoice = { id: "inv_1", remainingAmount: 1000, status: "ISSUED" };

    const txMocks = {
      invoicePayment: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      invoice: { update: vi.fn() },
      invoiceStateEvent: { create: vi.fn() },
      unmatchedPayment: { update: vi.fn() },
    };
    mockDb.$transaction.mockImplementation(async (fn: (tx: typeof txMocks) => Promise<void>) => fn(txMocks));

    await confirmMatch(payment, invoice, "AUTO_EXACT");

    expect(txMocks.invoicePayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          invoiceId: "inv_1",
          amount: 1000,
          source: "razorpay_virtual_account",
          status: "SETTLED",
        }),
      })
    );
    expect(txMocks.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv_1" },
        data: expect.objectContaining({ status: "PAID" }),
      })
    );
    expect(txMocks.unmatchedPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "auto_matched", matchedInvoiceId: "inv_1" }),
      })
    );
  });

  it("is idempotent: skips if payment already recorded", async () => {
    const payment = makePayment({ amountPaise: BigInt(100000) });
    const invoice = { id: "inv_1", remainingAmount: 1000, status: "ISSUED" };

    const txMocks = {
      invoicePayment: { findFirst: vi.fn().mockResolvedValue({ id: "existing_ip" }), create: vi.fn() },
      invoice: { update: vi.fn() },
      invoiceStateEvent: { create: vi.fn() },
      unmatchedPayment: { update: vi.fn() },
    };
    mockDb.$transaction.mockImplementation(async (fn: (tx: typeof txMocks) => Promise<void>) => fn(txMocks));

    await confirmMatch(payment, invoice, "AUTO_EXACT");

    expect(txMocks.invoicePayment.create).not.toHaveBeenCalled();
    expect(txMocks.invoice.update).not.toHaveBeenCalled();
  });

  it("sets status MANUALLY_MATCHED for manual reconciliation mode", async () => {
    const payment = makePayment({ amountPaise: BigInt(50000) });
    const invoice = { id: "inv_2", remainingAmount: 500, status: "ISSUED" };

    const txMocks = {
      invoicePayment: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      invoice: { update: vi.fn() },
      invoiceStateEvent: { create: vi.fn() },
      unmatchedPayment: { update: vi.fn() },
    };
    mockDb.$transaction.mockImplementation(async (fn: (tx: typeof txMocks) => Promise<void>) => fn(txMocks));

    await confirmMatch(payment, invoice, "MANUALLY_MATCHED");

    expect(txMocks.unmatchedPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "manually_matched" }),
      })
    );
  });
});

describe("suggestMatch", () => {
  it("sets matchedInvoiceId and status to suggested", async () => {
    mockDb.unmatchedPayment.update.mockResolvedValue({});
    await suggestMatch({ id: "up_1" }, "inv_1", 0.85);
    expect(mockDb.unmatchedPayment.update).toHaveBeenCalledWith({
      where: { id: "up_1" },
      data: { matchedInvoiceId: "inv_1", status: "suggested" },
    });
  });
});
