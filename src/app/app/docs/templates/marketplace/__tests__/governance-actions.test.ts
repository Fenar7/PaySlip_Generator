import { describe, expect, it, vi, beforeEach } from "vitest";

// Mocks
vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(),
  requireOrgContext: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    marketplaceTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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

// We'll import after mocks
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { approveTemplate, rejectTemplate } from "../../review/actions";

describe("Template Governance Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.__mockDbTransaction = {
      marketplaceTemplate: db.marketplaceTemplate,
      marketplaceTemplateRevision: db.marketplaceTemplateRevision,
    };
  });

  describe("approveTemplate", () => {
    it("should require admin role", async () => {
      (requireRole as any).mockRejectedValue(new Error("Unauthorized"));
      const res = await approveTemplate("t1");
      expect(res.success).toBe(false);
      expect(requireRole).toHaveBeenCalledWith("admin");
    });

    it("should approve template and create a stable revision", async () => {
      (requireRole as any).mockResolvedValue({ userId: "u1", orgId: "o1" });
      const mockTemplate = {
        id: "t1",
        version: "1.0.0",
        templateData: { test: true },
        publisherOrgId: "o1",
      };
      
      (db.marketplaceTemplate.findUnique as any).mockResolvedValue(mockTemplate);
      (db.marketplaceTemplateRevision.create as any).mockResolvedValue({});
      (db.marketplaceTemplate.update as any).mockResolvedValue({});

      const res = await approveTemplate("t1");
      
      expect(res.success).toBe(true);
      expect(db.marketplaceTemplateRevision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            templateId: "t1",
            status: "PUBLISHED",
            reviewedBy: "u1",
          }),
        })
      );
      expect(db.marketplaceTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t1" },
          data: expect.objectContaining({
            status: "PUBLISHED",
            rejectionReason: null,
          }),
        })
      );
    });
  });

  describe("rejectTemplate", () => {
    it("should reject the template and save the reason", async () => {
      (requireRole as any).mockResolvedValue({ userId: "u1", orgId: "o1" });
      (db.marketplaceTemplate.update as any).mockResolvedValue({});

      const res = await rejectTemplate("t1", "Not well designed");
      
      expect(res.success).toBe(true);
      expect(db.marketplaceTemplate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t1" },
          data: expect.objectContaining({
            status: "REJECTED",
            rejectionReason: "Not well designed",
            reviewedBy: "u1",
          }),
        })
      );
    });
  });
});

// Type declaration for the mock db transaction
declare global {
  var __mockDbTransaction: any;
}
