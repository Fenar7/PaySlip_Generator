import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  db: {
    partnerProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    partnerManagedOrg: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    partnerActivityLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    invoice: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi
    .fn()
    .mockResolvedValue({ orgId: "org-1", userId: "user-1", role: "admin" }),
  requireRole: vi
    .fn()
    .mockResolvedValue({ orgId: "org-1", userId: "user-1", role: "admin" }),
}));

vi.mock("@/lib/plans/enforcement", () => ({
  checkFeature: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/partners/reporting", () => ({
  getPartnerMetrics: vi.fn(),
}));

import { db } from "@/lib/db";
import {
  applyForPartner,
  getPartnerDashboard,
  inviteClientOrg,
  removeClientOrg,
  getManagedClientInvoices,
  getPartnerProfile,
  getPartnerReports,
  getClientOrgPartnerAccess,
} from "../actions";
import { getPartnerMetrics } from "@/lib/partners/reporting";

const mockDb = db as unknown as {
  partnerProfile: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  partnerManagedOrg: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  partnerActivityLog: { create: ReturnType<typeof vi.fn> };
  invoice: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const mockGetPartnerMetrics = getPartnerMetrics as ReturnType<typeof vi.fn>;

describe("Partner Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("applyForPartner", () => {
    it("TC-15-043: creates PartnerProfile with status PENDING", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue(null);
      mockDb.partnerProfile.create.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        type: "ACCOUNTANT",
        companyName: "Test CA Firm",
        status: "PENDING",
        partnerCode: "PTR-ABCD1234",
      });

      const result = await applyForPartner({
        type: "ACCOUNTANT",
        companyName: "Test CA Firm",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.profileId).toBe("partner-1");
        expect(result.data.partnerCode).toMatch(/^PTR-[A-F0-9]{8}$/);
      }

      expect(mockDb.partnerProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: "org-1",
          type: "ACCOUNTANT",
          companyName: "Test CA Firm",
          revenueShare: 20.0,
        }),
      });
    });

    it("returns error for duplicate application", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "PENDING",
      });

      const result = await applyForPartner({
        type: "ACCOUNTANT",
        companyName: "Test CA Firm",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Partner application already exists");
      }
      expect(mockDb.partnerProfile.create).not.toHaveBeenCalled();
    });
  });

  describe("inviteClientOrg", () => {
    it("TC-15-044: creates PartnerManagedOrg when partner is approved", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue(null);
      mockDb.partnerManagedOrg.create.mockResolvedValue({
        id: "managed-1",
        partnerId: "partner-1",
        orgId: "client-org-1",
      });
      mockDb.partnerProfile.update.mockResolvedValue({});

      const result = await inviteClientOrg("client-org-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.managedOrgId).toBe("managed-1");
      }

      expect(mockDb.partnerManagedOrg.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partnerId: "partner-1",
          orgId: "client-org-1",
          addedByUserId: "user-1",
          scope: [],
        }),
      });
      expect(mockDb.partnerProfile.update).toHaveBeenCalledWith({
        where: { id: "partner-1" },
        data: { managedOrgCount: { increment: 1 } },
      });
    });

    it("returns error when partner is not approved", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "PENDING",
      });

      const result = await inviteClientOrg("client-org-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Partner not approved");
      }
      expect(mockDb.partnerManagedOrg.create).not.toHaveBeenCalled();
    });

    it("returns error when already managing the org (active assignment)", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        partnerId: "partner-1",
        orgId: "client-org-1",
        revokedAt: null,
      });

      const result = await inviteClientOrg("client-org-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Already managing this organization");
      }
    });

    it("returns error for previously revoked assignment (requires admin re-approval)", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        partnerId: "partner-1",
        orgId: "client-org-1",
        revokedAt: new Date(),
      });

      const result = await inviteClientOrg("client-org-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("revoked");
      }
    });
  });

  describe("getManagedClientInvoices", () => {
    it("TC-15-045: returns invoices for managed client", async () => {
      const mockInvoices = [
        { id: "inv-1", invoiceNumber: "INV-001", organizationId: "client-org-1" },
        { id: "inv-2", invoiceNumber: "INV-002", organizationId: "client-org-1" },
      ];

      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        partnerId: "partner-1",
        orgId: "client-org-1",
        revokedAt: null,
        scope: [],
      });
      mockDb.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await getManagedClientInvoices("client-org-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].invoiceNumber).toBe("INV-001");
      }

      expect(mockDb.invoice.findMany).toHaveBeenCalledWith({
        where: { organizationId: "client-org-1" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    });

    it("returns error when not managing the org", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue(null);

      const result = await getManagedClientInvoices("client-org-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Not managing this organization");
      }
    });

    it("returns error when assignment is revoked", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        partnerId: "partner-1",
        orgId: "client-org-1",
        revokedAt: new Date(),
        scope: [],
      });

      const result = await getManagedClientInvoices("client-org-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Not managing this organization");
      }
    });

    it("returns error when partner is not approved", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "PENDING",
      });

      const result = await getManagedClientInvoices("client-org-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Partner not approved");
      }
    });
  });

  describe("removeClientOrg", () => {
    it("soft-revokes assignment and decrements managedOrgCount", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        managedOrgCount: 3,
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        partnerId: "partner-1",
        orgId: "client-org-1",
        revokedAt: null,
      });
      mockDb.partnerManagedOrg.update.mockResolvedValue({});
      mockDb.partnerProfile.update.mockResolvedValue({});

      const result = await removeClientOrg("client-org-1");

      expect(result.success).toBe(true);
      // Soft-revoke: update by id, set revokedAt + revokedBy
      expect(mockDb.partnerManagedOrg.update).toHaveBeenCalledWith({
        where: { id: "managed-1" },
        data: expect.objectContaining({ revokedBy: "user-1" }),
      });
      const updateCall = mockDb.partnerManagedOrg.update.mock.calls[0][0];
      expect(updateCall.data.revokedAt).toBeInstanceOf(Date);
      expect(mockDb.partnerProfile.update).toHaveBeenCalledWith({
        where: { id: "partner-1" },
        data: { managedOrgCount: { decrement: 1 } },
      });
    });

    it("returns error when not a partner", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue(null);

      const result = await removeClientOrg("client-org-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Not a partner");
      }
    });

    it("returns error when assignment not found", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        managedOrgCount: 1,
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue(null);

      const result = await removeClientOrg("client-org-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Client assignment not found or already removed");
      }
    });

    it("returns error when assignment already revoked", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        managedOrgCount: 1,
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        partnerId: "partner-1",
        orgId: "client-org-1",
        revokedAt: new Date("2024-01-01"),
      });

      const result = await removeClientOrg("client-org-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Client assignment not found or already removed");
      }
    });
  });

  describe("getPartnerReports", () => {
    it("returns partner metrics from reporting module", async () => {
      mockGetPartnerMetrics.mockResolvedValue({
        partnerId: "partner-1",
        managedClientCount: 5,
        activeAssignments: 4,
        recentActivityCount: 12,
        recentActivity: [],
      });

      const result = await getPartnerReports();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.managedClientCount).toBe(5);
        expect(result.data.activeAssignments).toBe(4);
      }
      // getPartnerReports passes orgId ("org-1") to getPartnerMetrics
      expect(mockGetPartnerMetrics).toHaveBeenCalledWith("org-1");
    });

    it("returns error when no partner profile exists (metrics returns null)", async () => {
      mockGetPartnerMetrics.mockResolvedValue(null);

      const result = await getPartnerReports();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Not a partner");
      }
    });
  });

  describe("getClientOrgPartnerAccess", () => {
    it("returns active partner assignments for the org", async () => {
      const mockAssignments = [
        {
          id: "managed-1",
          partnerId: "partner-1",
          orgId: "org-1",
          scope: ["read_invoices"],
          revokedAt: null,
          addedAt: new Date("2024-01-15"),
          partner: {
            id: "partner-1",
            partnerCode: "PTR-ABCD1234",
            companyName: "Test Partner",
            type: "ACCOUNTANT",
            status: "APPROVED",
          },
        },
      ];
      mockDb.partnerManagedOrg.findMany.mockResolvedValue(mockAssignments);

      const result = await getClientOrgPartnerAccess();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].companyName).toBe("Test Partner");
        expect(result.data[0].partnerCode).toBe("PTR-ABCD1234");
        expect(result.data[0].scope).toEqual(["read_invoices"]);
      }
      expect(mockDb.partnerManagedOrg.findMany).toHaveBeenCalledWith({
        where: { orgId: "org-1", revokedAt: null },
        include: { partner: expect.any(Object) },
        orderBy: { addedAt: "desc" },
      });
    });

    it("returns empty array when no active partner access", async () => {
      mockDb.partnerManagedOrg.findMany.mockResolvedValue([]);

      const result = await getClientOrgPartnerAccess();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  describe("getPartnerProfile", () => {
    it("returns profile for current org", async () => {
      const profile = {
        id: "partner-1",
        orgId: "org-1",
        type: "ACCOUNTANT",
        status: "APPROVED",
      };
      mockDb.partnerProfile.findUnique.mockResolvedValue(profile);

      const result = await getPartnerProfile();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(profile);
      }
    });

    it("returns null when no partner profile", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue(null);

      const result = await getPartnerProfile();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });
  });

  describe("getPartnerDashboard", () => {
    it("returns dashboard data with managed orgs", async () => {
      const profile = {
        id: "partner-1",
        orgId: "org-1",
        type: "ACCOUNTANT",
        status: "APPROVED",
        managedOrgs: [
          { id: "managed-1", org: { id: "client-1", name: "Client A", slug: "client-a" } },
        ],
      };
      mockDb.partnerProfile.findUnique.mockResolvedValue(profile);

      const result = await getPartnerDashboard();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.managedOrgCount).toBe(1);
        expect(result.data.managedOrgs).toHaveLength(1);
      }
    });

    it("returns error when not a partner", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue(null);

      const result = await getPartnerDashboard();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Not a partner");
      }
    });
  });
});
