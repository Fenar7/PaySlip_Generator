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
      create: vi.fn(),
      delete: vi.fn(),
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

import { db } from "@/lib/db";
import {
  applyForPartner,
  getPartnerDashboard,
  inviteClientOrg,
  removeClientOrg,
  getManagedClientInvoices,
  getPartnerProfile,
} from "../actions";

const mockDb = db as unknown as {
  partnerProfile: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  partnerManagedOrg: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  invoice: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

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
        data: { partnerId: "partner-1", orgId: "client-org-1" },
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

    it("returns error when already managing the org", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        partnerId: "partner-1",
        orgId: "client-org-1",
      });

      const result = await inviteClientOrg("client-org-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Already managing this organization");
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
    it("decrements managedOrgCount on removal", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        managedOrgCount: 3,
      });
      mockDb.partnerManagedOrg.delete.mockResolvedValue({});
      mockDb.partnerProfile.update.mockResolvedValue({});

      const result = await removeClientOrg("client-org-1");

      expect(result.success).toBe(true);
      expect(mockDb.partnerManagedOrg.delete).toHaveBeenCalledWith({
        where: {
          partnerId_orgId: { partnerId: "partner-1", orgId: "client-org-1" },
        },
      });
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
