import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockLogAudit, mockRequireRole, mockDb } = vi.hoisted(() => ({
  mockLogAudit: vi.fn(),
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
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
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
    mockRequireRole.mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
      role: "owner",
      representedId: null,
      proxyGrantId: null,
    });
    mockDb.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        sequenceFormat: { update: mockDb.sequenceFormat.update, create: mockDb.sequenceFormat.create },
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

    it("updates format and logs audit", async () => {
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

      const result = await updateSequenceFormat({
        orgId: "org-1",
        documentType: "INVOICE",
        formatString: "REC/{YYYY}/{NNNNN}",
      });
      expect(result.success).toBe(true);
      expect(mockDb.sequenceFormat.update).toHaveBeenCalled();
      expect(mockLogAudit).toHaveBeenCalled();
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
      expect(mockLogAudit).toHaveBeenCalled();
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

    it("accepts valid number and updates counter", async () => {
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
      expect(result.success).toBe(true);
      expect(result.nextCounter).toBe(43);
      expect(mockDb.sequencePeriod.update).toHaveBeenCalledWith({
        where: { id: "period-1" },
        data: { currentCounter: 43 },
      });
      expect(mockLogAudit).toHaveBeenCalled();
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
  });
});
