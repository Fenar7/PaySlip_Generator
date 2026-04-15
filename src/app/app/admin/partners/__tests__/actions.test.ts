import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  requirePlatformAdmin: vi.fn().mockResolvedValue({ userId: "admin-user-1" }),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/partners/lifecycle", () => ({
  executePartnerTransition: vi.fn(),
}));

vi.mock("@/lib/partners/reporting", () => ({
  getPartnerAdminOverview: vi.fn(),
  getPartnerAdminDetail: vi.fn(),
  listPartnersForAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    partnerProfile: { findUnique: vi.fn() },
    partnerManagedOrg: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { requirePlatformAdmin } from "@/lib/auth";
import { executePartnerTransition } from "@/lib/partners/lifecycle";
import { db } from "@/lib/db";
import {
  adminApprovePartner,
  adminSuspendPartner,
  adminRevokePartner,
  adminRevokePartnerClientAssignment,
  adminRejectPartner,
  adminReinstatePartner,
} from "../actions";
import { PartnerStatus } from "@/generated/prisma/client";

type MockFn = ReturnType<typeof vi.fn>;
const mockRequirePlatformAdmin = requirePlatformAdmin as MockFn;
const mockExecuteTransition = executePartnerTransition as MockFn;
const mockDb = db as unknown as {
  partnerProfile: { findUnique: MockFn };
  partnerManagedOrg: { findUnique: MockFn; update: MockFn };
};

describe("Admin partner governance actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePlatformAdmin.mockResolvedValue({ userId: "admin-user-1" });
  });

  describe("Authorization", () => {
    it("calls requirePlatformAdmin before any governance action", async () => {
      mockExecuteTransition.mockResolvedValue({
        success: true,
        newStatus: "APPROVED" as PartnerStatus,
      });
      mockDb.partnerProfile.findUnique.mockResolvedValue({ orgId: "org-1" });

      await adminApprovePartner("partner-1", "looks good");

      expect(mockRequirePlatformAdmin).toHaveBeenCalledOnce();
    });
  });

  describe("adminApprovePartner", () => {
    it("calls executePartnerTransition with approve action", async () => {
      mockExecuteTransition.mockResolvedValue({
        success: true,
        newStatus: "APPROVED" as PartnerStatus,
      });
      mockDb.partnerProfile.findUnique.mockResolvedValue({ orgId: "org-1" });

      const result = await adminApprovePartner("partner-1", "all docs verified");

      expect(mockExecuteTransition).toHaveBeenCalledWith(
        "partner-1",
        "admin-user-1",
        "approve",
        "all docs verified"
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.newStatus).toBe("APPROVED");
      }
    });

    it("propagates transition errors", async () => {
      mockExecuteTransition.mockResolvedValue({
        success: false,
        error: "Cannot approve a partner in status REVOKED",
      });

      const result = await adminApprovePartner("partner-1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("REVOKED");
      }
    });
  });

  describe("adminSuspendPartner", () => {
    it("requires a non-empty reason", async () => {
      const result = await adminSuspendPartner("partner-1", "");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Suspension reason is required");
      }
      expect(mockExecuteTransition).not.toHaveBeenCalled();
    });

    it("calls executePartnerTransition with suspend action and reason", async () => {
      mockExecuteTransition.mockResolvedValue({
        success: true,
        newStatus: "SUSPENDED" as PartnerStatus,
      });
      mockDb.partnerProfile.findUnique.mockResolvedValue({ orgId: "org-1" });

      const result = await adminSuspendPartner("partner-1", "Compliance issue");

      expect(mockExecuteTransition).toHaveBeenCalledWith(
        "partner-1",
        "admin-user-1",
        "suspend",
        "Compliance issue"
      );
      expect(result.success).toBe(true);
    });
  });

  describe("adminRevokePartner", () => {
    it("requires a non-empty reason", async () => {
      const result = await adminRevokePartner("partner-1", "");
      expect(result.success).toBe(false);
      expect(mockExecuteTransition).not.toHaveBeenCalled();
    });

    it("calls executePartnerTransition with revoke action", async () => {
      mockExecuteTransition.mockResolvedValue({
        success: true,
        newStatus: "REVOKED" as PartnerStatus,
      });
      mockDb.partnerProfile.findUnique.mockResolvedValue({ orgId: "org-1" });

      const result = await adminRevokePartner("partner-1", "Fraud confirmed");

      expect(mockExecuteTransition).toHaveBeenCalledWith(
        "partner-1",
        "admin-user-1",
        "revoke",
        "Fraud confirmed"
      );
      expect(result.success).toBe(true);
    });
  });

  describe("adminRejectPartner", () => {
    it("calls executePartnerTransition with reject action", async () => {
      mockExecuteTransition.mockResolvedValue({
        success: true,
        newStatus: "REVOKED" as PartnerStatus,
      });
      mockDb.partnerProfile.findUnique.mockResolvedValue({ orgId: "org-1" });

      const result = await adminRejectPartner("partner-1", "Incomplete documentation");

      expect(mockExecuteTransition).toHaveBeenCalledWith(
        "partner-1",
        "admin-user-1",
        "reject",
        "Incomplete documentation"
      );
      expect(result.success).toBe(true);
    });
  });

  describe("adminReinstatePartner", () => {
    it("calls executePartnerTransition with reinstate action", async () => {
      mockExecuteTransition.mockResolvedValue({
        success: true,
        newStatus: "APPROVED" as PartnerStatus,
      });
      mockDb.partnerProfile.findUnique.mockResolvedValue({ orgId: "org-1" });

      const result = await adminReinstatePartner("partner-1", "Resolved compliance");

      expect(mockExecuteTransition).toHaveBeenCalledWith(
        "partner-1",
        "admin-user-1",
        "reinstate",
        "Resolved compliance"
      );
      expect(result.success).toBe(true);
    });
  });

  describe("adminRevokePartnerClientAssignment", () => {
    it("returns error when assignment not found", async () => {
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue(null);

      const result = await adminRevokePartnerClientAssignment("managed-1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Assignment not found");
      }
    });

    it("returns error when assignment is already revoked", async () => {
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        revokedAt: new Date(),
        partnerId: "partner-1",
        orgId: "client-org-1",
      });

      const result = await adminRevokePartnerClientAssignment("managed-1");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Assignment is already revoked");
      }
      expect(mockDb.partnerManagedOrg.update).not.toHaveBeenCalled();
    });

    it("soft-revokes an active assignment", async () => {
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        revokedAt: null,
        partnerId: "partner-1",
        orgId: "client-org-1",
      });
      mockDb.partnerManagedOrg.update.mockResolvedValue({});
      mockDb.partnerProfile.findUnique.mockResolvedValue({ orgId: "org-1" });

      const result = await adminRevokePartnerClientAssignment("managed-1", "Client requested removal");

      expect(mockDb.partnerManagedOrg.update).toHaveBeenCalledWith({
        where: { id: "managed-1" },
        data: {
          revokedAt: expect.any(Date),
          revokedBy: "admin-user-1",
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
