import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    invoicePayment: {
      findFirst: vi.fn(),
    },
    invoiceStateEvent: {
      create: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { reconcileInvoicePayment } from "@/lib/invoice-reconciliation";

describe("invoice reconciliation rounding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks an invoice as paid when settled payments equal the invoice total in minor units", async () => {
    vi.mocked(db.invoice.findUniqueOrThrow).mockResolvedValue({
      id: "inv-1",
      totalAmount: 100,
      status: "ISSUED",
      amountPaid: 0,
      remainingAmount: 100,
      payments: [
        { amount: 33.33, paidAt: new Date("2026-04-01"), method: "bank", paymentMethodDisplay: "Bank" },
        { amount: 33.33, paidAt: new Date("2026-04-02"), method: "bank", paymentMethodDisplay: "Bank" },
        { amount: 33.34, paidAt: new Date("2026-04-03"), method: "bank", paymentMethodDisplay: "Bank" },
      ],
    } as any);
    vi.mocked(db.invoicePayment.findFirst).mockResolvedValue(null);
    vi.mocked(db.invoice.update).mockResolvedValue({} as any);
    vi.mocked(db.invoiceStateEvent.create).mockResolvedValue({} as any);

    const result = await reconcileInvoicePayment("inv-1", "user-1");

    expect(result.derivedStatus).toBe("PAID");
    expect(db.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv-1" },
        data: expect.objectContaining({
          amountPaid: 100,
          remainingAmount: 0,
          status: "PAID",
        }),
      }),
    );
  });
});
