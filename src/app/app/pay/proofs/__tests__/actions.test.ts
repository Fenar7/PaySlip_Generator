import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireOrgContext: vi.fn(),
  invoiceProofFindFirst: vi.fn(),
  getSignedUrlServer: vi.fn(),
  transaction: vi.fn(),
  invoicePaymentCreate: vi.fn(),
  invoicePaymentUpdate: vi.fn(),
  invoiceProofUpdate: vi.fn(),
  postInvoicePaymentTx: vi.fn(),
  reconcileInvoicePayment: vi.fn(),
  notifyOrgAdmins: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: mocks.requireOrgContext,
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: mocks.transaction,
    invoiceProof: {
      findFirst: mocks.invoiceProofFindFirst,
      update: mocks.invoiceProofUpdate,
    },
    invoicePayment: {
      create: mocks.invoicePaymentCreate,
      update: mocks.invoicePaymentUpdate,
    },
  },
}));

vi.mock("@/lib/storage/upload-server", () => ({
  getSignedUrlServer: mocks.getSignedUrlServer,
  uploadFileServer: vi.fn(),
}));

vi.mock("@/lib/accounting", () => ({
  postInvoicePaymentTx: mocks.postInvoicePaymentTx,
}));

vi.mock("@/lib/invoice-reconciliation", () => ({
  reconcileInvoicePayment: mocks.reconcileInvoicePayment,
}));

vi.mock("@/lib/notifications", () => ({
  notifyOrgAdmins: mocks.notifyOrgAdmins,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import {
  acceptProof,
  getProofDetail,
  rejectProof,
} from "../actions";
import { PROOF_LOAD_ERROR } from "../errors";

describe("getProofDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notifyOrgAdmins.mockResolvedValue(undefined);
    mocks.requireOrgContext.mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "admin",
      representedId: null,
      proxyGrantId: null,
      proxyScope: [],
    });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        invoicePayment: {
          create: mocks.invoicePaymentCreate,
          update: mocks.invoicePaymentUpdate,
        },
        invoiceProof: {
          update: mocks.invoiceProofUpdate,
        },
      }),
    );
  });

  it("resolves storage-backed proof keys into signed URLs", async () => {
    mocks.invoiceProofFindFirst.mockResolvedValue({
      id: "proof-1",
      fileUrl: "proofs/org-1/inv-1/proof.png",
      fileName: "proof.png",
      amount: 1200,
      paymentDate: "2026-04-21",
      paymentMethod: "bank_transfer",
      plannedNextPaymentDate: null,
      reviewStatus: "PENDING",
      reviewNote: null,
      createdAt: new Date("2026-04-21T10:00:00.000Z"),
      reviewedAt: null,
      invoice: {
        id: "inv-1",
        invoiceNumber: "INV-001",
        totalAmount: 5000,
        amountPaid: 1000,
        remainingAmount: 4000,
        status: "ISSUED",
        customer: { name: "Acme" },
      },
    });
    mocks.getSignedUrlServer.mockResolvedValue("https://signed.example/proof.png");

    const result = await getProofDetail("proof-1");

    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        id: "proof-1",
        fileUrl: "https://signed.example/proof.png",
      }),
    });
    expect(mocks.getSignedUrlServer).toHaveBeenCalledWith(
      "proofs",
      "proofs/org-1/inv-1/proof.png",
      3600,
      { useAdmin: true },
    );
  });

  it("keeps legacy proof URLs unchanged", async () => {
    mocks.invoiceProofFindFirst.mockResolvedValue({
      id: "proof-legacy",
      fileUrl: "https://legacy.example/proof.png",
      fileName: "proof.png",
      amount: 1200,
      paymentDate: "2026-04-21",
      paymentMethod: "bank_transfer",
      plannedNextPaymentDate: null,
      reviewStatus: "PENDING",
      reviewNote: null,
      createdAt: new Date("2026-04-21T10:00:00.000Z"),
      reviewedAt: null,
      invoice: {
        id: "inv-1",
        invoiceNumber: "INV-001",
        totalAmount: 5000,
        amountPaid: 1000,
        remainingAmount: 4000,
        status: "ISSUED",
        customer: { name: "Acme" },
      },
    });

    const result = await getProofDetail("proof-legacy");

    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        id: "proof-legacy",
        fileUrl: "https://legacy.example/proof.png",
      }),
    });
    expect(mocks.getSignedUrlServer).not.toHaveBeenCalled();
  });

  it("returns a load error when proof URL resolution fails", async () => {
    mocks.invoiceProofFindFirst.mockResolvedValue({
      id: "proof-1",
      fileUrl: "proofs/org-1/inv-1/proof.png",
      fileName: "proof.png",
      amount: 1200,
      paymentDate: "2026-04-21",
      paymentMethod: "bank_transfer",
      plannedNextPaymentDate: null,
      reviewStatus: "PENDING",
      reviewNote: null,
      createdAt: new Date("2026-04-21T10:00:00.000Z"),
      reviewedAt: null,
      invoice: {
        id: "inv-1",
        invoiceNumber: "INV-001",
        totalAmount: 5000,
        amountPaid: 1000,
        remainingAmount: 4000,
        status: "ISSUED",
        customer: { name: "Acme" },
      },
    });
    mocks.getSignedUrlServer.mockRejectedValue(new Error("storage unavailable"));

    const result = await getProofDetail("proof-1");

    expect(result).toEqual({
      success: false,
      error: PROOF_LOAD_ERROR,
    });
  });

  it("notifies org admins when a proof is accepted", async () => {
    mocks.invoiceProofFindFirst.mockResolvedValue({
      id: "proof-1",
      invoice: {
        id: "inv-1",
        invoiceNumber: "INV-001",
        status: "ISSUED",
      },
      invoicePayment: {
        id: "payment-1",
      },
    });

    const result = await acceptProof("proof-1");

    expect(result).toEqual({ success: true, data: undefined });
    expect(mocks.notifyOrgAdmins).toHaveBeenCalledWith({
      orgId: "org-1",
      type: "proof_accepted",
      title: "Payment proof accepted",
      body: "Payment proof for invoice INV-001 was accepted.",
      link: "/app/pay/proofs/proof-1",
      excludeUserId: "user-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/docs/invoices");
  });

  it("notifies org admins when a proof is rejected", async () => {
    mocks.invoiceProofFindFirst.mockResolvedValue({
      id: "proof-1",
      invoice: {
        id: "inv-1",
        invoiceNumber: "INV-001",
        status: "ISSUED",
      },
      invoicePayment: {
        id: "payment-1",
      },
    });

    const result = await rejectProof("proof-1", "Could not verify transfer");

    expect(result).toEqual({ success: true, data: undefined });
    expect(mocks.notifyOrgAdmins).toHaveBeenCalledWith({
      orgId: "org-1",
      type: "proof_rejected",
      title: "Payment proof rejected",
      body: "Payment proof for invoice INV-001 was rejected.",
      link: "/app/pay/proofs/proof-1",
      excludeUserId: "user-1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/app/docs/invoices");
  });
});
