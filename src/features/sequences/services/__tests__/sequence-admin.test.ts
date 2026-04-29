import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockLogAuditStrict, mockRequireRole, mockDb } = vi.hoisted(() => ({
  mockLogAuditStrict: vi.fn(),
  mockRequireRole: vi.fn(),
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
}));

vi.mock("@/lib/audit", () => ({
  logAuditStrict: (...args: unknown[]) => mockLogAuditStrict(...args),
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

import {
  getSequenceConfig,
  updateSequenceFormat,
  updateSequencePeriodicity,
  seedSequenceContinuity,
  getSequenceAuditHistory,
  SequenceAdminError,
} from "../sequence-admin";

describe("sequence-admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAuditStrict.mockResolvedValue(undefined);
    mockRequireRole.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      role: "owner",
      representedId: null,
      proxyGrantId: null,
    });
    mockDb.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        sequenceFormat: {
          update: mockDb.sequenceFormat.update,
          create: mockDb.sequenceFormat.create,
        },
        sequence: { update: mockDb.sequence.update },
      });
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
      expect(mockLogAuditStrict).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "sequence.edited",
          metadata: expect.objectContaining({
            oldFormatId: "fmt-1",
            newFormatId: "fmt-2",
          }),
        })
      );
    });

    it("fails the mutation if strict audit logging fails", async () => {
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
      mockLogAuditStrict.mockRejectedValue(new Error("DB write failed"));

      await expect(
        updateSequenceFormat({
          orgId: "org-1",
          documentType: "INVOICE",
          formatString: "REC/{YYYY}/{NNNNN}",
        })
      ).rejects.toThrow("DB write failed");
    });
  });

  describe("updateSequencePeriodicity", () => {
    it("updates periodicity and logs audit", async () => {
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
      expect(mockDb.sequence.update).toHaveBeenCalledWith({
        where: { id: "seq-1" },
        data: { periodicity: "MONTHLY" },
      });
      expect(mockLogAuditStrict).toHaveBeenCalled();
    });

    it("fails if strict audit logging fails", async () => {
      mockDb.sequence.findFirst.mockResolvedValue({
        id: "seq-1",
        periodicity: "YEARLY",
      });
      mockDb.sequence.update.mockResolvedValue({});
      mockLogAuditStrict.mockRejectedValue(new Error("Audit DB down"));

      await expect(
        updateSequencePeriodicity({
          orgId: "org-1",
          documentType: "INVOICE",
          periodicity: "MONTHLY",
        })
      ).rejects.toThrow("Audit DB down");
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
      expect(mockDb.sequencePeriod.update).toHaveBeenCalledWith({
        where: { id: "period-1" },
        data: { currentCounter: 42 },
      });
      expect(mockLogAuditStrict).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            extractedCounter: 42,
            seededCounter: 42,
            nextPreview: 43,
          }),
        })
      );
    });

    it("fails if strict audit logging fails", async () => {
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
      mockLogAuditStrict.mockRejectedValue(new Error("Audit write failed"));

      await expect(
        seedSequenceContinuity({
          orgId: "org-1",
          documentType: "INVOICE",
          latestUsedNumber: "INV/2026/00042",
        })
      ).rejects.toThrow("Audit write failed");
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
      mockDb.auditLog.findMany.mockResolvedValue([]);
      mockDb.auditLog.count.mockResolvedValue(0);

      const result = await getSequenceAuditHistory({
        orgId: "org-1",
        documentType: "INVOICE",
      });

      expect(result.logs).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
