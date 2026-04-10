import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    marketplaceTemplate: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    marketplacePurchase: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    marketplaceReview: {
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    marketplaceRevenue: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("razorpay", () => {
  const MockRazorpay = function () {
    return {
      orders: {
        create: vi.fn().mockResolvedValue({ id: "order_test123" }),
      },
    };
  };
  return { default: MockRazorpay };
});

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";

import {
  browseTemplates,
  installFreeTemplate,
  createTemplatePurchaseOrder,
  verifyTemplatePurchase,
  publishTemplate,
} from "../actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockOrg = { orgId: "org-1", userId: "user-1", role: "admin" };

function mockTemplate(overrides = {}) {
  return {
    id: "tpl-1",
    name: "Test Template",
    description: "A test template",
    templateType: "Invoice",
    category: ["Invoice"],
    tags: ["professional"],
    price: 0,
    status: "PUBLISHED",
    publisherId: "org-pub-1",
    publisherUserId: "user-pub-1",
    downloadCount: 10,
    rating: 4.5,
    reviewCount: 3,
    previewImageUrl: "https://example.com/img.png",
    templateData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(requireOrgContext).mockResolvedValue(mockOrg);
  vi.mocked(requireRole).mockResolvedValue(mockOrg);
  vi.mocked(checkFeature).mockResolvedValue(true);
});

// ─── TC-15-026: Free template installs immediately ────────────────────────────

describe("TC-15-026: Free template installs immediately", () => {
  it("creates MarketplacePurchase with amount=0 for free template", async () => {
    const template = mockTemplate({ price: 0 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      template as never
    );
    vi.mocked(db.marketplacePurchase.findUnique).mockResolvedValue(null as never);
    vi.mocked(db.marketplacePurchase.create).mockResolvedValue({
      id: "purchase-1",
    } as never);
    vi.mocked(db.marketplaceTemplate.update).mockResolvedValue({} as never);

    const result = await installFreeTemplate("tpl-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.purchaseId).toBe("purchase-1");
    }

    expect(db.marketplacePurchase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org-1",
          templateId: "tpl-1",
          amount: 0,
          status: "COMPLETED",
        }),
      })
    );

    expect(db.marketplaceTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tpl-1" },
        data: { downloadCount: { increment: 1 } },
      })
    );
  });
});

// ─── TC-15-027: Paid template requires Razorpay checkout ──────────────────────

describe("TC-15-027: Paid template requires Razorpay checkout", () => {
  it("returns orderId for paid template", async () => {
    const template = mockTemplate({ price: 499 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      template as never
    );
    vi.mocked(db.marketplacePurchase.findUnique).mockResolvedValue(null as never);

    const result = await createTemplatePurchaseOrder("tpl-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderId).toBe("order_test123");
      expect(result.data.amount).toBe(49900);
      expect(result.data.currency).toBe("INR");
    }
  });

  it("rejects free template from Razorpay checkout", async () => {
    const template = mockTemplate({ price: 0 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      template as never
    );

    const result = await createTemplatePurchaseOrder("tpl-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("free");
    }
  });
});

// ─── TC-15-028: Re-installing already-installed template is idempotent ────────

describe("TC-15-028: Idempotent install", () => {
  it("returns existing purchaseId when template already installed", async () => {
    const template = mockTemplate({ price: 0 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      template as never
    );
    vi.mocked(db.marketplacePurchase.findUnique).mockResolvedValue({
      id: "existing-purchase-1",
      organizationId: "org-1",
      templateId: "tpl-1",
    } as never);

    const result = await installFreeTemplate("tpl-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.purchaseId).toBe("existing-purchase-1");
    }

    // Should NOT create a new purchase
    expect(db.marketplacePurchase.create).not.toHaveBeenCalled();
    expect(db.marketplaceTemplate.update).not.toHaveBeenCalled();
  });
});

// ─── TC-15-029: Publisher submits template → status = PENDING_REVIEW ──────────

describe("TC-15-029: Publisher submits template", () => {
  it("creates template with status PENDING_REVIEW", async () => {
    vi.mocked(db.marketplaceTemplate.create).mockResolvedValue({
      id: "tpl-new-1",
    } as never);

    const result = await publishTemplate({
      name: "My Template",
      description: "A great template",
      templateType: "Invoice",
      category: ["Invoice", "GST"],
      tags: ["professional"],
      price: 199,
      templateData: { layout: "standard" },
      previewImageUrl: "https://example.com/preview.png",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.templateId).toBe("tpl-new-1");
    }

    expect(db.marketplaceTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "My Template",
          status: "PENDING_REVIEW",
          publisherId: "org-1",
          publisherUserId: "user-1",
        }),
      })
    );
  });

  it("rejects publish when plan feature is missing", async () => {
    vi.mocked(checkFeature).mockResolvedValue(false);

    const result = await publishTemplate({
      name: "My Template",
      description: "A great template",
      templateType: "Invoice",
      category: ["Invoice"],
      tags: [],
      price: 0,
      templateData: {},
      previewImageUrl: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Upgrade");
    }
  });
});

// ─── TC-15-030: Cannot install template with status !== PUBLISHED ─────────────

describe("TC-15-030: Cannot install unpublished template", () => {
  it("rejects install of PENDING_REVIEW template", async () => {
    const template = mockTemplate({ status: "PENDING_REVIEW", price: 0 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      template as never
    );

    const result = await installFreeTemplate("tpl-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not available");
    }
  });

  it("rejects install of REJECTED template", async () => {
    const template = mockTemplate({ status: "REJECTED", price: 0 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      template as never
    );

    const result = await installFreeTemplate("tpl-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not available");
    }
  });

  it("rejects Razorpay order for unpublished paid template", async () => {
    const template = mockTemplate({ status: "DRAFT", price: 499 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      template as never
    );

    const result = await createTemplatePurchaseOrder("tpl-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not available");
    }
  });
});

// ─── TC-15-031: Revenue split: 70% publisher, 30% platform ───────────────────

describe("TC-15-031: Revenue split 70/30", () => {
  it("creates MarketplaceRevenue with correct split", async () => {
    const template = mockTemplate({ price: 1000, publisherId: "org-pub-1" });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      template as never
    );
    vi.mocked(db.marketplacePurchase.findUnique).mockResolvedValue(null as never);

    // Mock $transaction to execute the callback
    vi.mocked(db.$transaction).mockImplementation(async (cb: any) => {
      const mockTx = {
        marketplacePurchase: {
          create: vi.fn().mockResolvedValue({ id: "purchase-paid-1" }),
        },
        marketplaceRevenue: {
          create: vi.fn().mockResolvedValue({ id: "rev-1" }),
        },
        marketplaceTemplate: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(mockTx);
    });

    // Create a valid HMAC signature for testing
    const crypto = await import("crypto");
    const orderId = "order_razorpay_1";
    const paymentId = "pay_razorpay_1";
    const secret = "test_secret";

    // Set env var for the test
    const originalSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_SECRET = secret;

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const result = await verifyTemplatePurchase({
      templateId: "tpl-1",
      razorpayPaymentId: paymentId,
      razorpayOrderId: orderId,
      razorpaySignature: expectedSig,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.purchaseId).toBe("purchase-paid-1");
    }

    // Verify the $transaction callback was called
    expect(db.$transaction).toHaveBeenCalled();

    // Verify revenue split by inspecting the transaction callback
    const txCallback = vi.mocked(db.$transaction).mock.calls[0][0] as any;
    const mockTx = {
      marketplacePurchase: {
        create: vi.fn().mockResolvedValue({ id: "purchase-paid-1" }),
      },
      marketplaceRevenue: {
        create: vi.fn().mockResolvedValue({ id: "rev-1" }),
      },
      marketplaceTemplate: {
        update: vi.fn().mockResolvedValue({}),
      },
    };
    await txCallback(mockTx);

    expect(mockTx.marketplaceRevenue.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amount: 1000,
          publisherShare: 700,
          platformShare: 300,
          publisherId: "org-pub-1",
        }),
      })
    );

    // Restore env
    process.env.RAZORPAY_KEY_SECRET = originalSecret;
  });
});
