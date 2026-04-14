import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    organization: {
      findUnique: vi.fn(),
    },
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
      update: vi.fn(),
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
  getAuthRoutingContext: vi.fn(),
  isMarketplaceModeratorUser: vi.fn(),
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
import {
  getAuthRoutingContext,
  isMarketplaceModeratorUser,
  requireOrgContext,
  requireRole,
} from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import {
  createTemplatePurchaseOrder,
  getInstalledTemplates,
  getTemplateDetail,
  installFreeTemplate,
  publishTemplate,
  verifyTemplatePurchase,
} from "../actions";

const mockOrg = { orgId: "org-1", userId: "user-1", role: "admin" };

function mockTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: "tpl-1",
    name: "Test Template",
    description: "A test template",
    templateType: "Invoice",
    category: ["Invoice"],
    tags: ["professional"],
    price: 0,
    currency: "INR",
    status: "PUBLISHED",
    publisherOrgId: "org-pub-1",
    publisherName: "Test Publisher",
    publisherOrg: { name: "Test Publisher Org" },
    downloadCount: 10,
    rating: 4.5,
    ratingCount: 3,
    previewImageUrl: "https://example.com/img.png",
    previewPdfUrl: null,
    templateData: {},
    version: "1.0.0",
    reviewNotes: null,
    rejectionReason: null,
    publishedAt: new Date("2026-04-01T00:00:00.000Z"),
    reviews: [],
    revisions: [{ id: "rev-1", version: "1.0.0", status: "PUBLISHED" }],
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(requireOrgContext).mockResolvedValue(mockOrg);
  vi.mocked(requireRole).mockResolvedValue(mockOrg);
  vi.mocked(getAuthRoutingContext).mockResolvedValue({ isAuthenticated: false } as never);
  vi.mocked(isMarketplaceModeratorUser).mockReturnValue(false);
  vi.mocked(checkFeature).mockResolvedValue(true);
  vi.mocked(db.organization.findUnique).mockResolvedValue({ name: "Org One" } as never);
});

describe("TC-15-026: Free template installs immediately", () => {
  it("creates MarketplacePurchase with amount=0 for free template", async () => {
    const template = mockTemplate({ price: 0 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(template as never);
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
          orgId: "org-1",
          templateId: "tpl-1",
          revisionId: "rev-1",
          amount: 0,
          status: "COMPLETED",
        }),
      }),
    );

    expect(db.marketplaceTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tpl-1" },
        data: { downloadCount: { increment: 1 } },
      }),
    );
  });

  it("repairs legacy installs that are missing revision bindings", async () => {
    const template = mockTemplate({ price: 0 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(template as never);
    vi.mocked(db.marketplacePurchase.findUnique).mockResolvedValue({
      id: "existing-purchase-1",
      revisionId: null,
      status: "COMPLETED",
    } as never);
    vi.mocked(db.marketplacePurchase.update).mockResolvedValue({} as never);

    const result = await installFreeTemplate("tpl-1");

    expect(result.success).toBe(true);
    expect(db.marketplacePurchase.update).toHaveBeenCalledWith({
      where: { id: "existing-purchase-1" },
      data: { revisionId: "rev-1" },
    });
  });
});

describe("TC-15-027: Paid template requires Razorpay checkout", () => {
  it("returns orderId for paid template", async () => {
    const template = mockTemplate({ price: 499 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(template as never);
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
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(template as never);

    const result = await createTemplatePurchaseOrder("tpl-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("free");
    }
  });
});

describe("TC-15-028: Idempotent install", () => {
  it("returns existing purchaseId when template already installed", async () => {
    const template = mockTemplate({ price: 0 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(template as never);
    vi.mocked(db.marketplacePurchase.findUnique).mockResolvedValue({
      id: "existing-purchase-1",
      orgId: "org-1",
      templateId: "tpl-1",
      revisionId: "rev-1",
      status: "COMPLETED",
    } as never);

    const result = await installFreeTemplate("tpl-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.purchaseId).toBe("existing-purchase-1");
    }

    expect(db.marketplacePurchase.create).not.toHaveBeenCalled();
    expect(db.marketplaceTemplate.update).not.toHaveBeenCalled();
  });
});

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
          publisherOrgId: "org-1",
          publisherName: "Org One",
        }),
      }),
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

describe("TC-15-030: Cannot install unpublished template", () => {
  it("rejects install of PENDING_REVIEW template", async () => {
    const template = mockTemplate({ status: "PENDING_REVIEW", price: 0 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(template as never);

    const result = await installFreeTemplate("tpl-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not available");
    }
  });

  it("rejects install of REJECTED template", async () => {
    const template = mockTemplate({ status: "REJECTED", price: 0 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(template as never);

    const result = await installFreeTemplate("tpl-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not available");
    }
  });

  it("rejects Razorpay order for unpublished paid template", async () => {
    const template = mockTemplate({ status: "DRAFT", price: 499 });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(template as never);

    const result = await createTemplatePurchaseOrder("tpl-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not available");
    }
  });
});

describe("TC-15-031: Revenue split 70/30", () => {
  it("creates MarketplaceRevenue with correct split", async () => {
    const template = mockTemplate({ price: 1000, publisherOrgId: "org-pub-1" });
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(template as never);
    vi.mocked(db.marketplacePurchase.findUnique).mockResolvedValue(null as never);

    vi.mocked(db.$transaction).mockImplementation(async (callback) => {
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
      return callback(mockTx as never);
    });

    const cryptoModule = await import("crypto");
    const orderId = "order_razorpay_1";
    const paymentId = "pay_razorpay_1";
    const secret = "test_secret";

    const originalSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_SECRET = secret;

    const expectedSig = cryptoModule
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

    expect(db.$transaction).toHaveBeenCalled();

    const txCallback = vi.mocked(db.$transaction).mock.calls[0][0] as (
      tx: {
        marketplacePurchase: { create: ReturnType<typeof vi.fn> };
        marketplaceRevenue: { create: ReturnType<typeof vi.fn> };
        marketplaceTemplate: { update: ReturnType<typeof vi.fn> };
      },
    ) => Promise<unknown>;
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
          totalAmount: 1000,
          publisherShare: 700,
          platformShare: 300,
          publisherOrgId: "org-pub-1",
        }),
      }),
    );

    process.env.RAZORPAY_KEY_SECRET = originalSecret;
  });
});

describe("template detail visibility", () => {
  it("allows public access to published templates and strips moderation-only fields", async () => {
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      mockTemplate({
        status: "PUBLISHED",
        reviewNotes: "Internal moderation notes",
        rejectionReason: "No longer relevant",
        reviews: [
          {
            id: "review-1",
            rating: 5,
            review: "Great",
            createdAt: new Date("2026-04-01T00:00:00.000Z"),
          },
        ],
      }) as never,
    );

    const result = await getTemplateDetail("tpl-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publisherDisplayName).toBe("Test Publisher Org");
      expect(result.data.reviewNotes).toBeUndefined();
      expect(result.data.rejectionReason).toBeUndefined();
      expect(result.data.reviews).toEqual([
        expect.objectContaining({
          id: "review-1",
          rating: 5,
          review: "Great",
        }),
      ]);
    }
  });

  it("blocks public access to draft templates", async () => {
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      mockTemplate({ status: "DRAFT" }) as never,
    );

    const result = await getTemplateDetail("tpl-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Template not found");
    }
  });

  it("allows publishers to access their own rejected templates", async () => {
    vi.mocked(getAuthRoutingContext).mockResolvedValue({
      isAuthenticated: true,
      userId: "user-1",
      hasOrg: true,
      orgId: "org-pub-1",
      role: "admin",
    } as never);
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      mockTemplate({
        status: "REJECTED",
        publisherOrgId: "org-pub-1",
        rejectionReason: "Needs improvement",
      }) as never,
    );

    const result = await getTemplateDetail("tpl-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rejectionReason).toBe("Needs improvement");
    }
  });

  it("allows marketplace moderators to access pending templates", async () => {
    vi.mocked(getAuthRoutingContext).mockResolvedValue({
      isAuthenticated: true,
      userId: "moderator-1",
      hasOrg: false,
    } as never);
    vi.mocked(isMarketplaceModeratorUser).mockReturnValue(true);
    vi.mocked(db.marketplaceTemplate.findUnique).mockResolvedValue(
      mockTemplate({ status: "PENDING_REVIEW" }) as never,
    );

    const result = await getTemplateDetail("tpl-1");

    expect(result.success).toBe(true);
  });
});

describe("installed template contract", () => {
  it("returns revision-bound installed template data", async () => {
    vi.mocked(db.marketplacePurchase.findMany).mockResolvedValue([
      {
        id: "purchase-1",
        templateId: "tpl-1",
        revisionId: "rev-1",
        installedAt: new Date("2026-04-02T00:00:00.000Z"),
        revision: {
          id: "rev-1",
          version: "1.0.0",
          name: "Locked Invoice",
          description: "Revision snapshot",
          templateType: "Invoice",
          publisherDisplayName: "Snapshot Publisher",
          previewImageUrl: "https://example.com/revision.png",
        },
      },
    ] as never);

    const result = await getInstalledTemplates();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([
        {
          purchaseId: "purchase-1",
          templateId: "tpl-1",
          revisionId: "rev-1",
          revisionVersion: "1.0.0",
          displayName: "Locked Invoice",
          description: "Revision snapshot",
          templateType: "Invoice",
          publisherDisplayName: "Snapshot Publisher",
          previewImageUrl: "https://example.com/revision.png",
          installedAt: "2026-04-02T00:00:00.000Z",
        },
      ]);
    }
  });

  it("fails loudly when a completed purchase is missing a revision binding", async () => {
    vi.mocked(db.marketplacePurchase.findMany).mockResolvedValue([
      {
        id: "purchase-1",
        templateId: "tpl-1",
        revisionId: null,
        installedAt: new Date(),
        revision: null,
      },
    ] as never);

    const result = await getInstalledTemplates();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("backfill-template-revisions");
    }
  });
});
