import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    partnerProfile: {
      findUnique: vi.fn(),
    },
    partnerManagedOrg: {
      findUnique: vi.fn(),
    },
    partnerActivityLog: {
      create: vi.fn(),
    },
  },
}));

// Mock reporting to avoid circular import issues
vi.mock("../reporting", () => ({
  logPartnerActivity: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "@/lib/db";
import {
  requirePartnerClientAccess,
  withPartnerClientAccess,
  PartnerAccessError,
} from "../access";

type MockDb = {
  partnerProfile: { findUnique: ReturnType<typeof vi.fn> };
  partnerManagedOrg: { findUnique: ReturnType<typeof vi.fn> };
  partnerActivityLog: { create: ReturnType<typeof vi.fn> };
};

const mockDb = db as unknown as MockDb;

describe("Partner cross-org access guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requirePartnerClientAccess", () => {
    it("throws NOT_A_PARTNER when no profile exists", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue(null);

      await expect(
        requirePartnerClientAccess("org-1", "client-org-1", "view_invoices")
      ).rejects.toThrow(PartnerAccessError);

      try {
        await requirePartnerClientAccess("org-1", "client-org-1", "view_invoices");
      } catch (err) {
        expect(err).toBeInstanceOf(PartnerAccessError);
        expect((err as PartnerAccessError).code).toBe("NOT_A_PARTNER");
      }
    });

    it("throws PARTNER_NOT_APPROVED when partner is SUSPENDED", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "SUSPENDED",
      });

      try {
        await requirePartnerClientAccess("org-1", "client-org-1", "view_invoices");
        throw new Error("Should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(PartnerAccessError);
        expect((err as PartnerAccessError).code).toBe("PARTNER_NOT_APPROVED");
      }
    });

    it("throws PARTNER_NOT_APPROVED when partner is REVOKED", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "REVOKED",
      });

      try {
        await requirePartnerClientAccess("org-1", "client-org-1", "view_invoices");
        throw new Error("Should have thrown");
      } catch (err) {
        expect((err as PartnerAccessError).code).toBe("PARTNER_NOT_APPROVED");
      }
    });

    it("throws NOT_ASSIGNED when no active assignment exists", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue(null);

      try {
        await requirePartnerClientAccess("org-1", "client-org-1", "view_invoices");
        throw new Error("Should have thrown");
      } catch (err) {
        expect((err as PartnerAccessError).code).toBe("NOT_ASSIGNED");
      }
    });

    it("throws NOT_ASSIGNED when assignment is revoked", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        scope: ["view_invoices"],
        revokedAt: new Date(),
      });

      try {
        await requirePartnerClientAccess("org-1", "client-org-1", "view_invoices");
        throw new Error("Should have thrown");
      } catch (err) {
        expect((err as PartnerAccessError).code).toBe("NOT_ASSIGNED");
      }
    });

    it("throws SCOPE_DENIED when scope does not include required action", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        scope: ["view_invoices"],
        revokedAt: null,
      });

      try {
        await requirePartnerClientAccess("org-1", "client-org-1", "manage_documents");
        throw new Error("Should have thrown");
      } catch (err) {
        expect((err as PartnerAccessError).code).toBe("SCOPE_DENIED");
      }
    });

    it("allows access when partner is approved, assignment active, and scope matches", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        scope: ["view_invoices", "manage_documents"],
        revokedAt: null,
      });

      const ctx = await requirePartnerClientAccess(
        "org-1",
        "client-org-1",
        "view_invoices"
      );

      expect(ctx.partnerProfileId).toBe("partner-1");
      expect(ctx.managedOrgId).toBe("managed-1");
      expect(ctx.clientOrgId).toBe("client-org-1");
    });

    it("allows access when scope is empty (full access)", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        scope: ["view_invoices"],
        revokedAt: null,
      });

      // Scope includes the required action explicitly
      const ctx = await requirePartnerClientAccess(
        "org-1",
        "client-org-1",
        "view_invoices"
      );
      expect(ctx).toBeDefined();
    });
  });

  describe("withPartnerClientAccess", () => {
    it("executes fn and returns result when access is granted", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        scope: ["view_invoices"],
        revokedAt: null,
      });

      const mockFn = vi.fn().mockResolvedValue({ invoices: [] });

      const result = await withPartnerClientAccess(
        "org-1",
        "user-1",
        "client-org-1",
        "view_invoices",
        "view_invoices",
        "invoice",
        undefined,
        mockFn
      );

      expect(mockFn).toHaveBeenCalledOnce();
      expect(result).toEqual({ invoices: [] });
    });

    it("does not execute fn when access is denied", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue(null);

      const mockFn = vi.fn().mockResolvedValue({ invoices: [] });

      await expect(
        withPartnerClientAccess(
          "org-1",
          "user-1",
          "client-org-1",
          "view_invoices",
          "view_invoices",
          "invoice",
          undefined,
          mockFn
        )
      ).rejects.toThrow(PartnerAccessError);

      expect(mockFn).not.toHaveBeenCalled();
    });
  });
});
