import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicInvoice: vi.fn(),
  markAsViewed: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("./actions", () => ({
  getPublicInvoice: mocks.getPublicInvoice,
  markAsViewed: mocks.markAsViewed,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

vi.mock("@/features/pay/components/proof-upload-form", () => ({
  ProofUploadForm: ({ remainingAmount }: { remainingAmount: number }) => (
    <div>Proof form remaining {remainingAmount}</div>
  ),
}));

vi.mock("./pay-button", () => ({
  PublicPayButton: () => <div>Pay online</div>,
}));

import PublicInvoicePage from "./page";

type MockInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  status: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentPromiseDate: string | null;
  notes: string;
  paidAt: string | null;
  razorpayPaymentLinkUrl: string | null;
  paymentLinkStatus: string | null;
  paymentLinkExpiresAt: string | null;
  formData: Record<string, unknown>;
  lineItems: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
  customer: null;
  organization: { name: string };
  proofs: Array<{ id: string; amount: number; reviewStatus: string; createdAt: string }>;
  paymentProof: {
    status: string;
    totalAmount: number;
    amountPaid: number;
    remainingAmount: number;
    canUpload: boolean;
    blockedReason: string | null;
  };
};

function makeInvoice(overrides: Partial<MockInvoice> = {}): MockInvoice {
  return {
    id: "inv-1",
    invoiceNumber: "INV-001",
    invoiceDate: "2026-04-01",
    dueDate: "2026-04-30",
    status: "VIEWED",
    totalAmount: 5000,
    amountPaid: 0,
    remainingAmount: 5000,
    paymentPromiseDate: null,
    notes: "",
    paidAt: null,
    razorpayPaymentLinkUrl: null,
    paymentLinkStatus: null,
    paymentLinkExpiresAt: null,
    formData: {},
    lineItems: [
      {
        id: "line-1",
        description: "Consulting services",
        quantity: 1,
        unitPrice: 5000,
        taxRate: 0,
        amount: 5000,
      },
    ],
    customer: null,
    organization: { name: "Acme Corp" },
    proofs: [],
    paymentProof: {
      status: "VIEWED",
      totalAmount: 5000,
      amountPaid: 0,
      remainingAmount: 5000,
      canUpload: true,
      blockedReason: null,
    },
    ...overrides,
  };
}

describe("PublicInvoicePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markAsViewed.mockResolvedValue({ success: true, data: undefined });
  });

  it("hides the payment proof form once the invoice no longer accepts proofs", async () => {
    mocks.getPublicInvoice.mockResolvedValue({
      success: true,
      data: {
        invoice: makeInvoice({
          status: "PAID",
          amountPaid: 5000,
          remainingAmount: 0,
          paidAt: "2026-04-05T00:00:00.000Z",
          paymentProof: {
            status: "PAID",
            totalAmount: 5000,
            amountPaid: 5000,
            remainingAmount: 0,
            canUpload: false,
            blockedReason: "This invoice no longer accepts payment proofs.",
          },
        }),
      },
    });

    render(await PublicInvoicePage({ params: Promise.resolve({ token: "public-token" }) }));

    expect(screen.getByText("Payment Confirmed")).toBeInTheDocument();
    expect(screen.queryByText("Upload Payment Proof")).not.toBeInTheDocument();
  });

  it("shows the payment proof form while a remaining balance still exists", async () => {
    mocks.getPublicInvoice.mockResolvedValue({
      success: true,
      data: {
        invoice: makeInvoice({
          status: "PARTIALLY_PAID",
          amountPaid: 2000,
          remainingAmount: 3000,
          paymentProof: {
            status: "PARTIALLY_PAID",
            totalAmount: 5000,
            amountPaid: 2000,
            remainingAmount: 3000,
            canUpload: true,
            blockedReason: null,
          },
        }),
      },
    });

    render(await PublicInvoicePage({ params: Promise.resolve({ token: "public-token" }) }));

    expect(screen.getByText("Upload Payment Proof")).toBeInTheDocument();
    expect(screen.getByText("Proof form remaining 3000")).toBeInTheDocument();
  });
});
