import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    invoice: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/razorpay/client", () => ({
  getOrgRazorpayClient: vi.fn(),
}));

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { getOrgRazorpayClient } from "@/lib/razorpay/client";
import {
  createPaymentLink,
  cancelPaymentLink,
  bulkCreatePaymentLinks,
  getInvoicePaymentLinkStatus,
} from "../payment-link-actions";

const mockDb = db as {
  invoice: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockRequireRole = requireRole as ReturnType<typeof vi.fn>;
const mockRequireOrgContext = requireOrgContext as ReturnType<typeof vi.fn>;
const mockGetOrgRazorpayClient = getOrgRazorpayClient as ReturnType<typeof vi.fn>;

function makePaymentLinkClient(overrides: Record<string, unknown> = {}) {
  return {
    paymentLink: {
      create: vi.fn().mockResolvedValue({
        id: "plink_test",
        short_url: "https://rzp.io/test",
        status: "created",
        expire_by: null,
        ...overrides,
      }),
      cancel: vi.fn().mockResolvedValue({ status: "cancelled" }),
    },
  };
}

const BASE_INVOICE = {
  id: "inv_1",
  organizationId: "org_1",
  invoiceNumber: "INV-001",
  status: "DUE",
  totalAmount: 1000,
  remainingAmount: 1000,
  amountPaid: 0,
  archivedAt: null,
  razorpayPaymentLinkId: null,
  razorpayPaymentLinkUrl: null,
  paymentLinkStatus: null,
  paymentLinkExpiresAt: null,
  customer: { name: "Test Customer", email: "test@example.com", phone: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({ orgId: "org_1", userId: "user_1" });
  mockRequireOrgContext.mockResolvedValue({ orgId: "org_1", userId: "user_1" });
  mockDb.invoice.findFirst.mockResolvedValue(BASE_INVOICE);
  mockDb.invoice.update.mockResolvedValue({});
  mockGetOrgRazorpayClient.mockResolvedValue(makePaymentLinkClient());
});

describe("createPaymentLink", () => {
  it("creates a new payment link for a payable invoice", async () => {
    const result = await createPaymentLink("inv_1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentLinkUrl).toBe("https://rzp.io/test");
      expect(result.data.paymentLinkId).toBe("plink_test");
    }
    expect(mockDb.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv_1" },
        data: expect.objectContaining({
          razorpayPaymentLinkId: "plink_test",
          razorpayPaymentLinkUrl: "https://rzp.io/test",
          paymentLinkStatus: "created",
        }),
      }),
    );
  });

  it("returns idempotent result when active link exists and is not expired", async () => {
    mockDb.invoice.findFirst.mockResolvedValue({
      ...BASE_INVOICE,
      razorpayPaymentLinkId: "plink_existing",
      razorpayPaymentLinkUrl: "https://rzp.io/existing",
      paymentLinkStatus: "created",
      paymentLinkExpiresAt: new Date(Date.now() + 3600_000), // 1h in future
    });

    const result = await createPaymentLink("inv_1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentLinkUrl).toBe("https://rzp.io/existing");
    }
    // Razorpay SDK should NOT be called for idempotent returns
    expect(mockGetOrgRazorpayClient).not.toHaveBeenCalled();
    expect(mockDb.invoice.update).not.toHaveBeenCalled();
  });

  it("creates a new link when existing link is expired", async () => {
    mockDb.invoice.findFirst.mockResolvedValue({
      ...BASE_INVOICE,
      razorpayPaymentLinkId: "plink_old",
      razorpayPaymentLinkUrl: "https://rzp.io/old",
      paymentLinkStatus: "created",
      paymentLinkExpiresAt: new Date(Date.now() - 3600_000), // 1h in the past
    });

    const result = await createPaymentLink("inv_1");

    expect(result.success).toBe(true);
    expect(mockGetOrgRazorpayClient).toHaveBeenCalled();
    expect(mockDb.invoice.update).toHaveBeenCalled();
  });

  it("rejects invoices with non-payable status", async () => {
    mockDb.invoice.findFirst.mockResolvedValue({ ...BASE_INVOICE, status: "PAID" });

    const result = await createPaymentLink("inv_1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("status: PAID");
    }
  });

  it("returns error when invoice is not found in org", async () => {
    mockDb.invoice.findFirst.mockResolvedValue(null);

    const result = await createPaymentLink("inv_nonexistent");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Invoice not found.");
    }
  });

  it("propagates Razorpay API errors gracefully", async () => {
    mockGetOrgRazorpayClient.mockResolvedValue({
      paymentLink: {
        create: vi.fn().mockRejectedValue(new Error("Razorpay API error")),
      },
    });

    const result = await createPaymentLink("inv_1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Razorpay API error");
    }
  });
});

describe("cancelPaymentLink", () => {
  it("cancels an active payment link", async () => {
    const mockClient = makePaymentLinkClient();
    mockGetOrgRazorpayClient.mockResolvedValue(mockClient);
    mockDb.invoice.findFirst.mockResolvedValue({
      id: "inv_1",
      razorpayPaymentLinkId: "plink_test",
      paymentLinkStatus: "created",
    });

    const result = await cancelPaymentLink("inv_1");

    expect(result.success).toBe(true);
    expect(mockClient.paymentLink.cancel).toHaveBeenCalledWith("plink_test");
    expect(mockDb.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inv_1" },
        data: expect.objectContaining({ paymentLinkStatus: "cancelled" }),
      }),
    );
  });

  it("returns success idempotently if link is already cancelled", async () => {
    mockDb.invoice.findFirst.mockResolvedValue({
      id: "inv_1",
      razorpayPaymentLinkId: "plink_test",
      paymentLinkStatus: "cancelled",
    });

    const result = await cancelPaymentLink("inv_1");

    expect(result.success).toBe(true);
    expect(mockGetOrgRazorpayClient).not.toHaveBeenCalled();
  });

  it("returns error when invoice has no payment link", async () => {
    mockDb.invoice.findFirst.mockResolvedValue({
      id: "inv_1",
      razorpayPaymentLinkId: null,
      paymentLinkStatus: null,
    });

    const result = await cancelPaymentLink("inv_1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No payment link exists");
    }
  });

  it("returns error when invoice is not found", async () => {
    mockDb.invoice.findFirst.mockResolvedValue(null);

    const result = await cancelPaymentLink("inv_1");

    expect(result.success).toBe(false);
  });
});

describe("bulkCreatePaymentLinks", () => {
  it("returns error for empty array", async () => {
    const result = await bulkCreatePaymentLinks([]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No invoices selected");
    }
  });

  it("rejects batches over 50 invoices", async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `inv_${i}`);

    const result = await bulkCreatePaymentLinks(ids);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("50");
    }
  });

  it("counts succeeded and failed correctly", async () => {
    // First call succeeds, second fails
    mockDb.invoice.findFirst
      .mockResolvedValueOnce(BASE_INVOICE)
      .mockResolvedValueOnce(null);

    const result = await bulkCreatePaymentLinks(["inv_1", "inv_2"]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.succeeded).toBe(1);
      expect(result.data.failed).toBe(1);
    }
  });
});

describe("getInvoicePaymentLinkStatus", () => {
  it("returns link status fields for an org-scoped invoice", async () => {
    const expiresAt = new Date("2025-12-31T00:00:00Z");
    mockDb.invoice.findFirst.mockResolvedValue({
      razorpayPaymentLinkId: "plink_test",
      razorpayPaymentLinkUrl: "https://rzp.io/test",
      paymentLinkStatus: "created",
      paymentLinkExpiresAt: expiresAt,
    });

    const result = await getInvoicePaymentLinkStatus("inv_1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentLinkId).toBe("plink_test");
      expect(result.data.paymentLinkStatus).toBe("created");
      expect(result.data.paymentLinkExpiresAt).toBe(expiresAt.toISOString());
    }
  });

  it("returns error for unknown invoice", async () => {
    mockDb.invoice.findFirst.mockResolvedValue(null);

    const result = await getInvoicePaymentLinkStatus("inv_missing");

    expect(result.success).toBe(false);
  });
});
