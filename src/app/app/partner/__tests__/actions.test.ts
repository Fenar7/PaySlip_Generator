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
    },
    partnerClientAccessRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
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

vi.mock("@/lib/partners/access", () => ({
  withPartnerClientAccess: vi.fn(),
  PartnerAccessError: class PartnerAccessError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
      this.name = "PartnerAccessError";
    }
  },
}));

import { db } from "@/lib/db";
import {
  applyForPartner,
  getPartnerDashboard,
  requestClientAccess,
  cancelClientAccessRequest,
  reviewPartnerAccessRequest,
  removeClientOrg,
  getManagedClientInvoices,
  getPartnerProfile,
  getPartnerReports,
  getClientOrgPartnerAccess,
  revokeClientPartnerAccess,
  getPendingPartnerAccessRequests,
} from "../actions";
import { getPartnerMetrics } from "@/lib/partners/reporting";
import { withPartnerClientAccess } from "@/lib/partners/access";

type MockFn = ReturnType<typeof vi.fn>;

const mockDb = db as unknown as {
  partnerProfile: { findUnique: MockFn; create: MockFn; update: MockFn };
  partnerManagedOrg: { findUnique: MockFn; findMany: MockFn; create: MockFn; update: MockFn };
  partnerClientAccessRequest: {
    findFirst: MockFn;
    findUnique: MockFn;
    findMany: MockFn;
    create: MockFn;
    update: MockFn;
  };
  invoice: { findMany: MockFn };
  $transaction: MockFn;
};

const mockGetPartnerMetrics = getPartnerMetrics as MockFn;
const mockWithPartnerClientAccess = withPartnerClientAccess as MockFn;

describe("Partner Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation(async (ops: unknown[]) => {
      for (const op of ops) await op;
    });
  });

  // ─── applyForPartner ────────────────────────────────────────────────────

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

  // ─── SEC-01: requestClientAccess (replaces inviteClientOrg) ─────────────

  describe("requestClientAccess (SEC-01: request-based workflow)", () => {
    it("TC-15-044: creates PENDING request — no active assignment created", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue(null);
      mockDb.partnerClientAccessRequest.findFirst.mockResolvedValue(null);
      mockDb.partnerClientAccessRequest.create.mockResolvedValue({ id: "req-1" });

      const result = await requestClientAccess("client-org-1", ["view_invoices"]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requestId).toBe("req-1");
      }
      expect(mockDb.partnerClientAccessRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partnerId: "partner-1",
          clientOrgId: "client-org-1",
          scope: ["view_invoices"],
        }),
      });
      // Critical: no assignment was created (SEC-01)
      expect(mockDb.partnerManagedOrg.create).not.toHaveBeenCalled();
    });

    it("returns error when partner is not APPROVED", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
        status: "PENDING",
      });

      const result = await requestClientAccess("client-org-1", ["view_invoices"]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/APPROVED|approved|not approved/i);
      }
      expect(mockDb.partnerClientAccessRequest.create).not.toHaveBeenCalled();
    });

    it("SEC-02: returns error when scope array is empty", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED",
      });

      const result = await requestClientAccess("client-org-1", []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/scope/i);
      }
      expect(mockDb.partnerClientAccessRequest.create).not.toHaveBeenCalled();
    });

    it("returns error when scope contains invalid permission value", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED",
      });

      const result = await requestClientAccess("client-org-1", ["view_everything"]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/invalid scope/i);
      }
      expect(mockDb.partnerClientAccessRequest.create).not.toHaveBeenCalled();
    });

    it("returns error when a PENDING request already exists for the same client org", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue(null);
      mockDb.partnerClientAccessRequest.findFirst.mockResolvedValue({
        id: "req-existing",
        status: "PENDING",
      });

      const result = await requestClientAccess("client-org-1", ["view_invoices"]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/pending.*request/i);
      }
    });

    it("returns error when partner already has active assignment (no revokedAt)", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        status: "APPROVED",
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        revokedAt: null,
      });

      const result = await requestClientAccess("client-org-1", ["view_invoices"]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Already managing this organization");
      }
    });
  });

  // ─── cancelClientAccessRequest ──────────────────────────────────────────

  describe("cancelClientAccessRequest", () => {
    it("cancels a PENDING request owned by the calling partner", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({
        id: "partner-1",
        orgId: "org-1",
      });
      // cancelClientAccessRequest uses findUnique by requestId
      mockDb.partnerClientAccessRequest.findUnique.mockResolvedValue({
        id: "req-1",
        partnerId: "partner-1",
        status: "PENDING",
      });
      mockDb.partnerClientAccessRequest.update.mockResolvedValue({ id: "req-1" });

      const result = await cancelClientAccessRequest("req-1");

      expect(result.success).toBe(true);
      expect(mockDb.partnerClientAccessRequest.update).toHaveBeenCalledWith({
        where: { id: "req-1" },
        data: expect.objectContaining({ status: "CANCELLED" }),
      });
    });

    it("returns error when request not found or not PENDING", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({ id: "partner-1" });
      mockDb.partnerClientAccessRequest.findUnique.mockResolvedValue(null);

      const result = await cancelClientAccessRequest("req-nonexistent");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/not found|pending/i);
      }
    });

    it("returns error when caller is not the partner that made the request", async () => {
      mockDb.partnerProfile.findUnique.mockResolvedValue({ id: "partner-other" });
      mockDb.partnerClientAccessRequest.findUnique.mockResolvedValue(null);

      const result = await cancelClientAccessRequest("req-1");

      expect(result.success).toBe(false);
    });
  });

  // ─── reviewPartnerAccessRequest ─────────────────────────────────────────

  describe("reviewPartnerAccessRequest (SEC-04: client admin approval/rejection)", () => {
    it("APPROVE: creates PartnerManagedOrg in a transaction when no existing assignment", async () => {
      mockDb.partnerClientAccessRequest.findUnique.mockResolvedValue({
        id: "req-1",
        clientOrgId: "org-1",
        partnerId: "partner-1",
        status: "PENDING",
        scope: ["view_invoices"],
        partner: { status: "APPROVED" },
      });
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue(null);
      mockDb.partnerManagedOrg.create.mockResolvedValue({ id: "managed-new" });
      mockDb.partnerProfile.update.mockResolvedValue({});
      mockDb.partnerClientAccessRequest.update.mockResolvedValue({ id: "req-1" });

      const result = await reviewPartnerAccessRequest("req-1", "APPROVED");

      expect(result.success).toBe(true);
      expect(mockDb.partnerManagedOrg.create).toHaveBeenCalled();
      expect(mockDb.partnerClientAccessRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "req-1" },
          data: expect.objectContaining({ status: "APPROVED" }),
        }),
      );
    });

    it("REJECT: updates request status to REJECTED without creating assignment", async () => {
      mockDb.partnerClientAccessRequest.findUnique.mockResolvedValue({
        id: "req-1",
        clientOrgId: "org-1",
        partnerId: "partner-1",
        status: "PENDING",
        scope: ["view_invoices"],
        partner: { status: "APPROVED" },
      });
      mockDb.partnerClientAccessRequest.update.mockResolvedValue({ id: "req-1" });

      const result = await reviewPartnerAccessRequest("req-1", "REJECTED");

      expect(result.success).toBe(true);
      expect(mockDb.partnerManagedOrg.create).not.toHaveBeenCalled();
      expect(mockDb.partnerClientAccessRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "REJECTED" }),
        }),
      );
    });

    it("returns error when request does not belong to caller's org (cross-org blocked)", async () => {
      mockDb.partnerClientAccessRequest.findUnique.mockResolvedValue({
        id: "req-1",
        clientOrgId: "other-org", // different org
        partnerId: "partner-1",
        status: "PENDING",
        scope: ["view_invoices"],
        partner: { status: "APPROVED" },
      });

      const result = await reviewPartnerAccessRequest("req-1", "APPROVED");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/does not belong|not found|unauthorized/i);
      }
    });

    it("returns error when request is not PENDING (already reviewed)", async () => {
      mockDb.partnerClientAccessRequest.findUnique.mockResolvedValue({
        id: "req-1",
        clientOrgId: "org-1",
        partnerId: "partner-1",
        status: "APPROVED",
        scope: ["view_invoices"],
        partner: { status: "APPROVED" },
      });

      const result = await reviewPartnerAccessRequest("req-1", "APPROVED");

      expect(result.success).toBe(false);
      if (!result.success) {
        // actual: "Request is already approved" (or "already rejected", etc.)
        expect(result.error).toMatch(/already|not pending/i);
      }
    });

    it("returns error when partner is SUSPENDED (cannot approve suspended partner)", async () => {
      mockDb.partnerClientAccessRequest.findUnique.mockResolvedValue({
        id: "req-1",
        clientOrgId: "org-1",
        partnerId: "partner-1",
        status: "PENDING",
        scope: ["view_invoices"],
        partner: { status: "SUSPENDED" },
      });

      const result = await reviewPartnerAccessRequest("req-1", "APPROVED");

      expect(result.success).toBe(false);
      if (!result.success) {
        // actual: "Partner is no longer active"
        expect(result.error).toMatch(/no longer active|suspended|not approvable/i);
      }
    });
  });

  // ─── revokeClientPartnerAccess (SEC-04) ─────────────────────────────────

  describe("revokeClientPartnerAccess (SEC-04: client admin revocation)", () => {
    it("soft-revokes an active assignment when caller owns the client org", async () => {
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        orgId: "org-1",
        partnerId: "partner-1",
        revokedAt: null,
      });
      mockDb.partnerManagedOrg.update.mockResolvedValue({});
      mockDb.partnerProfile.update.mockResolvedValue({});

      const result = await revokeClientPartnerAccess("managed-1");

      expect(result.success).toBe(true);
      expect(mockDb.partnerManagedOrg.update).toHaveBeenCalledWith({
        where: { id: "managed-1" },
        data: expect.objectContaining({
          revokedBy: "user-1",
          revokedAt: expect.any(Date),
        }),
      });
      expect(mockDb.partnerProfile.update).toHaveBeenCalledWith({
        where: { id: "partner-1" },
        data: { managedOrgCount: { decrement: 1 } },
      });
    });

    it("returns error when assignment belongs to a different org (cross-org blocked)", async () => {
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        orgId: "other-org",
        partnerId: "partner-1",
        revokedAt: null,
      });

      const result = await revokeClientPartnerAccess("managed-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        // actual: "Access record does not belong to your organization"
        expect(result.error).toMatch(/does not belong|not found|unauthorized/i);
      }
      expect(mockDb.partnerManagedOrg.update).not.toHaveBeenCalled();
    });

    it("returns error when assignment not found", async () => {
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue(null);

      const result = await revokeClientPartnerAccess("managed-nonexistent");

      expect(result.success).toBe(false);
    });

    it("returns error when assignment is already revoked", async () => {
      mockDb.partnerManagedOrg.findUnique.mockResolvedValue({
        id: "managed-1",
        orgId: "org-1",
        partnerId: "partner-1",
        revokedAt: new Date("2024-01-01"),
      });

      const result = await revokeClientPartnerAccess("managed-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/already revoked|not found/i);
      }
    });
  });

  // ─── getPendingPartnerAccessRequests ────────────────────────────────────

  describe("getPendingPartnerAccessRequests", () => {
    it("returns PENDING requests for APPROVED partners only", async () => {
      const mockRequests = [
        {
          id: "req-1",
          partnerId: "partner-1",
          clientOrgId: "org-1",
          scope: ["view_invoices"],
          status: "PENDING",
          requestedAt: new Date(),
          partner: {
            id: "partner-1",
            partnerCode: "PTR-ABCD1234",
            companyName: "Test Partner",
            status: "APPROVED",
          },
        },
      ];
      mockDb.partnerClientAccessRequest.findMany.mockResolvedValue(mockRequests);

      const result = await getPendingPartnerAccessRequests();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].partnerCode).toBe("PTR-ABCD1234");
      }
      expect(mockDb.partnerClientAccessRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientOrgId: "org-1",
            status: "PENDING",
          }),
        }),
      );
    });

    it("returns empty array when no pending requests", async () => {
      mockDb.partnerClientAccessRequest.findMany.mockResolvedValue([]);

      const result = await getPendingPartnerAccessRequests();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });
  });

  // ─── getManagedClientInvoices (SEC-03: routes through withPartnerClientAccess) ──

  describe("getManagedClientInvoices (SEC-03)", () => {
    it("TC-15-045: returns invoices when guard permits access", async () => {
      const mockInvoices = [
        { id: "inv-1", invoiceNumber: "INV-001", organizationId: "client-org-1" },
        { id: "inv-2", invoiceNumber: "INV-002", organizationId: "client-org-1" },
      ];
      // withPartnerClientAccess(partnerOrgId, actorUserId, clientOrgId, requiredScope, action, entityType, entityId, fn)
      mockWithPartnerClientAccess.mockImplementation(
        async (
          _partnerOrgId: string,
          _actorUserId: string,
          _clientOrgId: string,
          _requiredScope: string,
          _action: string,
          _entityType: string | undefined,
          _entityId: string | undefined,
          fn: (ctx: unknown) => Promise<unknown>,
        ) => fn({}),
      );
      mockDb.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await getManagedClientInvoices("client-org-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].invoiceNumber).toBe("INV-001");
      }
    });

    it("returns error when access guard denies (NOT_MANAGING / SCOPE_DENIED)", async () => {
      const { PartnerAccessError } = await import("@/lib/partners/access");
      mockWithPartnerClientAccess.mockRejectedValue(
        new PartnerAccessError("Not managing org", "NOT_MANAGING"),
      );

      const result = await getManagedClientInvoices("client-org-1");

      expect(result.success).toBe(false);
    });

    it("SEC-02: empty scope causes guard to deny access (no implicit full access)", async () => {
      const { PartnerAccessError } = await import("@/lib/partners/access");
      mockWithPartnerClientAccess.mockRejectedValue(
        new PartnerAccessError("Scope denied", "SCOPE_DENIED"),
      );

      const result = await getManagedClientInvoices("client-org-1");

      expect(result.success).toBe(false);
    });
  });

  // ─── removeClientOrg ────────────────────────────────────────────────────

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

  // ─── getPartnerReports ───────────────────────────────────────────────────

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

  // ─── getClientOrgPartnerAccess ───────────────────────────────────────────

  describe("getClientOrgPartnerAccess", () => {
    it("returns active partner assignments with partnerStatus field (SEC-05)", async () => {
      const mockAssignments = [
        {
          id: "managed-1",
          partnerId: "partner-1",
          orgId: "org-1",
          scope: ["view_invoices"],
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
        expect(result.data[0].scope).toEqual(["view_invoices"]);
        // SEC-05: partnerStatus must be included so UI can show SUSPENDED badge
        expect(result.data[0]).toHaveProperty("partnerStatus");
        expect(result.data[0].partnerStatus).toBe("APPROVED");
      }
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

  // ─── getPartnerProfile ───────────────────────────────────────────────────

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

  // ─── getPartnerDashboard ─────────────────────────────────────────────────

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
