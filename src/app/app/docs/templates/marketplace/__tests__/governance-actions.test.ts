import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireMarketplaceModerator: vi.fn(),
  requireOrgContext: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    marketplaceTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    marketplaceTemplateRevision: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(globalThis.__mockDbTransaction)),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { requireMarketplaceModerator } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  approveTemplate,
  archiveTemplate,
  getReviewQueue,
  rejectTemplate,
} from "../../review/actions";

describe("template governance actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.__mockDbTransaction = {
      marketplaceTemplate: db.marketplaceTemplate,
      marketplaceTemplateRevision: db.marketplaceTemplateRevision,
    };
  });

  describe("getReviewQueue", () => {
    it("denies access to non-moderators", async () => {
      vi.mocked(requireMarketplaceModerator).mockRejectedValue(new Error("Unauthorized"));

      const res = await getReviewQueue();

      expect(res.success).toBe(false);
      expect(requireMarketplaceModerator).toHaveBeenCalled();
    });
  });

  describe("approveTemplate", () => {
    it("requires marketplace moderator access", async () => {
      vi.mocked(requireMarketplaceModerator).mockRejectedValue(new Error("Unauthorized"));

      const res = await approveTemplate("t1");

      expect(res.success).toBe(false);
      expect(requireMarketplaceModerator).toHaveBeenCalled();
    });

    it("approves a pending template and creates one stable revision", async () => {
      vi.mocked(requireMarketplaceModerator).mockResolvedValue({
        userId: "u1",
        orgId: "o1",
        role: "admin",
      });
      (db.marketplaceTemplate.findUnique as any).mockResolvedValue({
        id: "t1",
        name: "Quarterly Invoice",
        description: "Stable invoice template",
        templateType: "Invoice",
        version: "1.0.0",
        templateData: { test: true },
        previewImageUrl: "https://example.com/preview.png",
        previewPdfUrl: null,
        status: "PENDING_REVIEW",
        publisherOrgId: "o1",
        publisherName: "Acme Publishing",
        publisherOrg: { name: "Acme Publishing" },
      });
      (db.marketplaceTemplate.updateMany as any).mockResolvedValue({ count: 1 });
      (db.marketplaceTemplateRevision.create as any).mockResolvedValue({ id: "rev-1" });

      const res = await approveTemplate("t1");

      expect(res.success).toBe(true);
      expect(db.marketplaceTemplate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t1", status: "PENDING_REVIEW" },
          data: expect.objectContaining({
            status: "PUBLISHED",
            reviewedByUserId: "u1",
          }),
        }),
      );
      expect(db.marketplaceTemplateRevision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateId: "t1",
            name: "Quarterly Invoice",
            description: "Stable invoice template",
            templateType: "Invoice",
            publisherDisplayName: "Acme Publishing",
            status: "PUBLISHED",
            createdByOrgId: "o1",
            reviewedByUserId: "u1",
          }),
        }),
      );
    });

    it("treats repeated approval of a published template as idempotent", async () => {
      vi.mocked(requireMarketplaceModerator).mockResolvedValue({
        userId: "u1",
        orgId: "o1",
        role: "admin",
      });
      (db.marketplaceTemplate.findUnique as any).mockResolvedValue({
        id: "t1",
        status: "PUBLISHED",
      });

      const res = await approveTemplate("t1");

      expect(res.success).toBe(true);
      expect(db.marketplaceTemplate.updateMany).not.toHaveBeenCalled();
      expect(db.marketplaceTemplateRevision.create).not.toHaveBeenCalled();
    });
  });

  describe("rejectTemplate", () => {
    it("rejects a pending template and stores moderation metadata", async () => {
      vi.mocked(requireMarketplaceModerator).mockResolvedValue({
        userId: "u1",
        orgId: "o1",
        role: "admin",
      });
      (db.marketplaceTemplate.updateMany as any).mockResolvedValue({ count: 1 });

      const res = await rejectTemplate("t1", "Not well designed");

      expect(res.success).toBe(true);
      expect(db.marketplaceTemplate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t1", status: "PENDING_REVIEW" },
          data: expect.objectContaining({
            status: "REJECTED",
            rejectionReason: "Not well designed",
            reviewedByUserId: "u1",
          }),
        }),
      );
    });

    it("rejects invalid status transitions safely", async () => {
      vi.mocked(requireMarketplaceModerator).mockResolvedValue({
        userId: "u1",
        orgId: "o1",
        role: "admin",
      });
      (db.marketplaceTemplate.updateMany as any).mockResolvedValue({ count: 0 });
      (db.marketplaceTemplate.findUnique as any).mockResolvedValue({ status: "PUBLISHED" });

      const res = await rejectTemplate("t1", "Needs work");

      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain("Cannot reject");
      }
    });
  });

  describe("archiveTemplate", () => {
    it("archives published or rejected templates", async () => {
      vi.mocked(requireMarketplaceModerator).mockResolvedValue({
        userId: "u1",
        orgId: "o1",
        role: "admin",
      });
      (db.marketplaceTemplate.updateMany as any).mockResolvedValue({ count: 1 });

      const res = await archiveTemplate("t1");

      expect(res.success).toBe(true);
      expect(db.marketplaceTemplate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "t1",
            status: { in: ["PUBLISHED", "REJECTED"] },
          },
          data: expect.objectContaining({
            status: "ARCHIVED",
            reviewedByUserId: "u1",
          }),
        }),
      );
    });

    it("treats repeated archive as idempotent", async () => {
      vi.mocked(requireMarketplaceModerator).mockResolvedValue({
        userId: "u1",
        orgId: "o1",
        role: "admin",
      });
      (db.marketplaceTemplate.updateMany as any).mockResolvedValue({ count: 0 });
      (db.marketplaceTemplate.findUnique as any).mockResolvedValue({ status: "ARCHIVED" });

      const res = await archiveTemplate("t1");

      expect(res.success).toBe(true);
    });
  });
});

declare global {
  var __mockDbTransaction: any;
}
