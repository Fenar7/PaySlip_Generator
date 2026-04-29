import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  mockLogAuditTx,
  mockRequireRole,
  mockGetOrgContext,
  mockDb,
} = vi.hoisted(() => ({
  mockLogAuditTx: vi.fn(),
  mockRequireRole: vi.fn(),
  mockGetOrgContext: vi.fn(),
  mockDb: {
    sequence: { findFirst: vi.fn(), update: vi.fn() },
    sequenceFormat: { update: vi.fn(), create: vi.fn() },
    sequencePeriod: { update: vi.fn() },
    auditLog: { findMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth/require-org", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  getOrgContext: (...args: unknown[]) => mockGetOrgContext(...args),
}));

vi.mock("@/lib/audit", () => ({
  logAuditTx: (...args: unknown[]) => mockLogAuditTx(...args),
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

// Suppress next/headers since we read headers inside getAuditHeaders
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map()),
}));

import {
  getSequenceConfig,
  updateSequenceFormat,
  updateSequencePeriodicity,
  seedSequenceContinuity,
  getSequenceAuditHistory,
  updateSequenceSettingsAtomic,
  SequenceAdminError,
} from "../sequence-admin";

describe("sequence-admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAuditTx.mockResolvedValue(undefined);
    mockRequireRole.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      role: "owner",
      representedId: null,
      proxyGrantId: null,
    });
    mockGetOrgContext.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      role: "owner",
      representedId: null,
      proxyGrantId: null,
      proxyScope: [],
    });
    mockDb.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txClient = {
        sequenceFormat: {
          update: mockDb.sequenceFormat.update,
          create: mockDb.sequenceFormat.create,
        },
        sequence: { update: mockDb.sequence.update },
        sequencePeriod: { update: mockDb.sequencePeriod.update },
        auditLog: { create: vi.fn() },
        proxyGrant: { findFirst: vi.fn().mockResolvedValue(null) },
      };
      return fn(txClient);
    });
  });

  describe("getSequenceConfig", () => {
    it("returns null when no sequence exists", async () => {
      mockDb.sequence.findFirst.mockResolvedValue(null);
      const result = await getSequenceConfig({
        orgId: "org-1",
        documentType: "INVOICE",
      });
      expect(result).toBeNull();
    });

    it("returns config with format and period", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        name: "Invoice Sequence",
        documentType: "INVOICE",
        periodicity: "YEARLY",
        isActive: true,
        formats: [
          {
            formatString: "INV/{YYYY}/{NNNNN}",
            startCounter: 1,
            counterPadding: 5,
          },
        ],
        periods: [
          {
            id: "period-1",
            currentCounter: 42,
            startDate: new Date("2026-01-01"),
            endDate: new Date("2026-12-31"),
          },
        ],
      });
      const result = await getSequenceConfig({
        orgId: "org-1",
        documentType: "INVOICE",
      });
      expect(result).toMatchObject({
        sequenceId: "seq-1",
        periodicity: "YEARLY",
        formatString: "INV/{YYYY}/{NNNNN}",
        currentCounter: 42,
      });
    });

    it("rejects cross-org read", async () => {
      mockGetOrgContext.mockResolvedValue({
        userId: "user-1",
        orgId: "org-1",
        role: "member",
        representedId: null,
        proxyGrantId: null,
        proxyScope: [],
      });

      await expect(
        getSequenceConfig({ orgId: "org-2", documentType: "INVOICE" })
      ).rejects.toThrow(SequenceAdminError);

      await expect(
        getSequenceConfig({ orgId: "org-2", documentType: "INVOICE" })
      ).rejects.toThrow(/Cross-org access denied/);
    });
  });

  describe("authorization", () => {
    it("rejects non-owner mutations", async () => {
      mockRequireRole.mockRejectedValue(
        new Error("Insufficient permissions. Required: owner, Have: admin")
      );

      await expect(
        updateSequenceFormat({
          orgId: "org-1",
          documentType: "INVOICE",
          formatString: "INV/{YYYY}/{NNNNN}",
        })
      ).rejects.toThrow(/Insufficient permissions/);
    });

    it("rejects cross-org mutation even when caller is owner of another org", async () => {
      mockRequireRole.mockResolvedValue({
        userId: "user-1",
        orgId: "org-1",
        role: "owner",
        representedId: null,
        proxyGrantId: null,
      });

      await expect(
        updateSequenceFormat({
          orgId: "org-2",
          documentType: "INVOICE",
          formatString: "INV/{YYYY}/{NNNNN}",
        })
      ).rejects.toThrow(SequenceAdminError);

      await expect(
        updateSequenceFormat({
          orgId: "org-2",
          documentType: "INVOICE",
          formatString: "INV/{YYYY}/{NNNNN}",
        })
      ).rejects.toThrow(/Cross-org access denied/);
    });

    it("allows owner to mutate their own org", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        formats: [
          {
            id: "fmt-1",
            formatString: "INV/{YYYY}/{NNNNN}",
            startCounter: 1,
            counterPadding: 5,
          },
        ],
      });
      mockDb.sequenceFormat.create.mockResolvedValue({
        id: "fmt-2",
        formatString: "REC/{YYYY}/{NNNNN}",
        startCounter: 1,
        counterPadding: 5,
      });

      const result = await updateSequenceFormat({
        orgId: "org-1",
        documentType: "INVOICE",
        formatString: "REC/{YYYY}/{NNNNN}",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateSequenceFormat", () => {
    it("rejects invalid format strings", async () => {
      await expect(
        updateSequenceFormat({
          orgId: "org-1",
          documentType: "INVOICE",
          formatString: "INVALID",
        })
      ).rejects.toThrow(SequenceAdminError);
    });

    it("creates a new format version and preserves the old one", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        formats: [
          {
            id: "fmt-1",
            formatString: "INV/{YYYY}/{NNNNN}",
            startCounter: 1,
            counterPadding: 5,
          },
        ],
      });
      mockDb.sequenceFormat.create.mockResolvedValue({
        id: "fmt-2",
        formatString: "REC/{YYYY}/{NNNNN}",
        startCounter: 1,
        counterPadding: 5,
        isDefault: true,
      });

      const result = await updateSequenceFormat({
        orgId: "org-1",
        documentType: "INVOICE",
        formatString: "REC/{YYYY}/{NNNNN}",
      });
      expect(result.success).toBe(true);
      expect(mockDb.sequenceFormat.update).toHaveBeenCalledWith({
        where: { id: "fmt-1" },
        data: { isDefault: false },
      });
      expect(mockDb.sequenceFormat.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sequenceId: "seq-1",
            formatString: "REC/{YYYY}/{NNNNN}",
            isDefault: true,
          }),
        })
      );
    });

    it("rolls back the mutation if audit logging fails inside the transaction", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        formats: [
          {
            id: "fmt-1",
            formatString: "INV/{YYYY}/{NNNNN}",
            startCounter: 1,
            counterPadding: 5,
          },
        ],
      });

      // Simulate transaction rollback: the transaction callback throws,
      // so neither the format update nor the audit row persist.
      mockDb.$transaction.mockImplementation(async () => {
        throw new Error("Audit write failed");
      });

      await expect(
        updateSequenceFormat({
          orgId: "org-1",
          documentType: "INVOICE",
          formatString: "REC/{YYYY}/{NNNNN}",
        })
      ).rejects.toThrow("Audit write failed");

      expect(mockDb.sequenceFormat.update).not.toHaveBeenCalled();
      expect(mockDb.sequenceFormat.create).not.toHaveBeenCalled();
    });
  });

  describe("updateSequencePeriodicity", () => {
    it("updates periodicity and logs audit transactionally", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        periodicity: "YEARLY",
      });
      mockDb.sequence.update.mockResolvedValue({});

      const result = await updateSequencePeriodicity({
        orgId: "org-1",
        documentType: "INVOICE",
        periodicity: "MONTHLY",
      });
      expect(result.success).toBe(true);
      expect(mockDb.$transaction).toHaveBeenCalled();
    });

    it("rolls back if transactional audit fails", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        periodicity: "YEARLY",
      });

      mockDb.$transaction.mockImplementation(async () => {
        throw new Error("Audit DB down");
      });

      await expect(
        updateSequencePeriodicity({
          orgId: "org-1",
          documentType: "INVOICE",
          periodicity: "MONTHLY",
        })
      ).rejects.toThrow("Audit DB down");

      expect(mockDb.sequence.update).not.toHaveBeenCalled();
    });
  });

  describe("seedSequenceContinuity", () => {
    it("rejects numbers that do not match format", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        formats: [
          {
            formatString: "INV/{YYYY}/{NNNNN}",
          },
        ],
        periods: [{ id: "period-1", currentCounter: 1 }],
      });

      await expect(
        seedSequenceContinuity({
          orgId: "org-1",
          documentType: "INVOICE",
          latestUsedNumber: "WRONG-FORMAT",
        })
      ).rejects.toThrow(SequenceAdminError);
    });

    it("sets currentCounter to extracted counter (last issued), next preview = +1", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        formats: [
          {
            formatString: "INV/{YYYY}/{NNNNN}",
          },
        ],
        periods: [{ id: "period-1", currentCounter: 1 }],
      });
      mockDb.sequencePeriod.update.mockResolvedValue({});

      const result = await seedSequenceContinuity({
        orgId: "org-1",
        documentType: "INVOICE",
        latestUsedNumber: "INV/2026/00042",
      });

      // Phase 1 invariant: currentCounter = last issued number
      expect(result.success).toBe(true);
      expect(result.nextPreview).toBe(43);
      expect(mockDb.$transaction).toHaveBeenCalled();
    });

    it("rolls back if transactional audit fails", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        formats: [
          {
            formatString: "INV/{YYYY}/{NNNNN}",
          },
        ],
        periods: [{ id: "period-1", currentCounter: 1 }],
      });

      mockDb.$transaction.mockImplementation(async () => {
        throw new Error("Audit write failed");
      });

      await expect(
        seedSequenceContinuity({
          orgId: "org-1",
          documentType: "INVOICE",
          latestUsedNumber: "INV/2026/00042",
        })
      ).rejects.toThrow("Audit write failed");

      expect(mockDb.sequencePeriod.update).not.toHaveBeenCalled();
    });
  });

  describe("updateSequenceSettingsAtomic", () => {
    it("applies format and periodicity changes atomically", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        periodicity: "YEARLY",
        formats: [
          {
            id: "fmt-1",
            formatString: "INV/{YYYY}/{NNNNN}",
            startCounter: 1,
            counterPadding: 5,
          },
        ],
      });
      mockDb.sequenceFormat.create.mockResolvedValue({
        id: "fmt-2",
        formatString: "REC/{YYYY}/{NNNNN}",
        startCounter: 1,
        counterPadding: 5,
      });

      const result = await updateSequenceSettingsAtomic({
        orgId: "org-1",
        documentType: "INVOICE",
        formatString: "REC/{YYYY}/{NNNNN}",
        periodicity: "MONTHLY",
      });

      expect(result.success).toBe(true);
      expect(mockDb.$transaction).toHaveBeenCalled();
    });

    it("rolls back both changes if any part fails", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        periodicity: "YEARLY",
        formats: [
          {
            id: "fmt-1",
            formatString: "INV/{YYYY}/{NNNNN}",
            startCounter: 1,
            counterPadding: 5,
          },
        ],
      });

      mockDb.$transaction.mockImplementation(async () => {
        throw new Error("Format create failed");
      });

      await expect(
        updateSequenceSettingsAtomic({
          orgId: "org-1",
          documentType: "INVOICE",
          formatString: "REC/{YYYY}/{NNNNN}",
          periodicity: "MONTHLY",
        })
      ).rejects.toThrow("Format create failed");

      expect(mockDb.sequence.update).not.toHaveBeenCalled();
    });
  });

  describe("getSequenceAuditHistory", () => {
    it("returns paginated audit logs", async () => {
      mockDb.auditLog.findMany.mockResolvedValue([
        {
          id: "log-1",
          action: "sequence.edited",
          actor: { id: "user-1", fullName: "Test User", email: "test@example.com" },
          entityId: "seq-1",
          metadata: { formatString: "INV/{YYYY}/{NNNNN}" },
          createdAt: new Date("2026-04-29"),
        },
      ]);
      mockDb.auditLog.count.mockResolvedValue(1);

      const result = await getSequenceAuditHistory({ orgId: "org-1" });
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe("sequence.edited");
      expect(result.total).toBe(1);
    });

    it("filters by documentType when provided", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({ id: "seq-inv-1" });
      mockDb.auditLog.findMany.mockResolvedValue([
        {
          id: "log-1",
          action: "sequence.edited",
          actor: { id: "user-1", fullName: "Test User", email: "test@example.com" },
          entityId: "seq-inv-1",
          metadata: { documentType: "INVOICE" },
          createdAt: new Date("2026-04-29"),
        },
      ]);
      mockDb.auditLog.count.mockResolvedValue(1);

      const result = await getSequenceAuditHistory({
        orgId: "org-1",
        documentType: "INVOICE",
      });

      expect(mockDb.sequence.findFirst).toHaveBeenCalledWith({
        where: { organizationId: "org-1", documentType: "INVOICE" },
        select: { id: true },
      });
      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: "org-1",
            entityId: "seq-inv-1",
          }),
        })
      );
      expect(result.logs).toHaveLength(1);
    });

    it("returns empty when documentType has no sequence", async () => {
      mockDb.sequence.findFirst.mockResolvedValue(null);

      const result = await getSequenceAuditHistory({
        orgId: "org-1",
        documentType: "INVOICE",
      });

      expect(result.logs).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(mockDb.auditLog.findMany).not.toHaveBeenCalled();
    });

    it("rejects cross-org history reads", async () => {
      mockGetOrgContext.mockResolvedValue({
        userId: "user-1",
        orgId: "org-1",
        role: "member",
        representedId: null,
        proxyGrantId: null,
        proxyScope: [],
      });

      await expect(
        getSequenceAuditHistory({ orgId: "org-2" })
      ).rejects.toThrow(/Cross-org access denied/);
    });
  });
});
