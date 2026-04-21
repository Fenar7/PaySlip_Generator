import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  publicInvoiceTokenFindUnique: vi.fn(),
  uploadPaymentProofFile: vi.fn(),
  invoicePaymentCreate: vi.fn(),
  invoiceProofCreate: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    publicInvoiceToken: {
      findUnique: mocks.publicInvoiceTokenFindUnique,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/features/pay/server/payment-proof-storage", () => ({
  uploadPaymentProofFile: mocks.uploadPaymentProofFile,
}));

import { POST } from "../route";

describe("public payment proof upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.publicInvoiceTokenFindUnique.mockResolvedValue({
      id: "token-record-1",
      expiresAt: null,
      invoice: {
        id: "inv-1",
        totalAmount: 5000,
        remainingAmount: 3000,
        status: "ISSUED",
        organizationId: "org-1",
      },
    });

    mocks.uploadPaymentProofFile.mockResolvedValue({
      storageKey: "proofs/org-1/inv-1/1710000000000-proof.png",
    });

    mocks.invoicePaymentCreate.mockResolvedValue({ id: "payment-1" });
    mocks.invoiceProofCreate.mockResolvedValue({ id: "proof-1" });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        invoicePayment: { create: mocks.invoicePaymentCreate },
        invoiceProof: { create: mocks.invoiceProofCreate },
      }),
    );
  });

  it("uploads payment proof files through storage and stores the storage key", async () => {
    const formData = new FormData();
    formData.set("amount", "3000");
    formData.set("paymentDate", "2026-04-21");
    formData.set("paymentMethod", "bank_transfer");
    formData.set("note", "UTR123");
    formData.set("fileName", "payment.png");
    formData.set("file", new File(["proof"], "payment.png", { type: "image/png" }), "payment.png");

    const response = await POST(
      new Request("http://localhost/invoice/token/proof", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ token: "public-token" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { proofId: "proof-1" },
    });
    const [uploadPayload] = mocks.uploadPaymentProofFile.mock.calls[0];
    expect(uploadPayload.orgId).toBe("org-1");
    expect(uploadPayload.invoiceId).toBe("inv-1");
    expect(uploadPayload.file.type).toBe("image/png");
    expect(uploadPayload.fileName).toBe("payment.png");
    expect(mocks.invoiceProofCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fileUrl: "proofs/org-1/inv-1/1710000000000-proof.png",
          fileName: "payment.png",
          uploadedByToken: "token-record-1",
        }),
      }),
    );
  });

  it("rejects invalid invoice tokens", async () => {
    mocks.publicInvoiceTokenFindUnique.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("amount", "3000");
    formData.set("paymentDate", "2026-04-21");
    formData.set("paymentMethod", "bank_transfer");
    formData.set("fileName", "payment.png");
    formData.set("file", new File(["proof"], "payment.png", { type: "image/png" }), "payment.png");

    const response = await POST(
      new Request("http://localhost/invoice/token/proof", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ token: "bad-token" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Invalid or expired invoice link.",
    });
  });
});
