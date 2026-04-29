import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockDb, mockLogAuditTx, mockRequireRole, mockCompleteStep } = vi.hoisted(() => ({
  mockDb: {
    sequence: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    sequenceFormat: {
      create: vi.fn(),
    },
    sequencePeriod: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  mockLogAuditTx: vi.fn(),
  mockRequireRole: vi.fn(),
  mockCompleteStep: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/audit", () => ({ logAuditTx: mockLogAuditTx }));
vi.mock("@/lib/auth/require-org", () => ({ requireRole: mockRequireRole }));
vi.mock("@/lib/onboarding-tracker", () => ({
  completeOnboardingStep: mockCompleteStep,
}));
vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    new Map([
      ["x-forwarded-for", "127.0.0.1"],
      ["user-agent", "vitest"],
    ])
  ),
}));
vi.mock("@/features/sequences/engine/periodicity", () => ({
  calculatePeriodBoundaries: vi.fn(() => ({
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
  })),
}));

import { saveOnboardingSequences } from "../actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveOnboardingSequences", () => {
  it("rejects non-owner callers", async () => {
    mockRequireRole.mockRejectedValue(new Error("Insufficient permissions"));

    await expect(
      saveOnboardingSequences({ organizationId: "org-1" })
    ).rejects.toThrow("Insufficient permissions");
  });

  it("rejects cross-org access", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-2", userId: "user-1", role: "owner" });

    await expect(
      saveOnboardingSequences({ organizationId: "org-1" })
    ).rejects.toThrow("Cannot configure sequences for a different organization");
  });

  it("creates invoice and voucher sequences with defaults", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });

    mockDb.sequence.findFirst.mockResolvedValue(null);

    mockDb.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const txClient = {
          sequence: {
            create: vi.fn().mockResolvedValue({ id: "seq-inv-1" }),
          },
          sequenceFormat: {
            create: vi.fn().mockResolvedValue({ id: "fmt-1" }),
          },
          sequencePeriod: {
            create: vi.fn().mockResolvedValue({ id: "per-1" }),
          },
        };
        return fn(txClient);
      }
    );

    mockLogAuditTx.mockResolvedValue(null);
    mockCompleteStep.mockResolvedValue(undefined);

    const result = await saveOnboardingSequences({ organizationId: "org-1" });

    expect(result.success).toBe(true);
    expect(result.created).toContain("INVOICE");
    expect(result.created).toContain("VOUCHER");
    expect(mockDb.sequence.findFirst).toHaveBeenCalledTimes(2);
    expect(mockDb.$transaction).toHaveBeenCalledTimes(2);

    // Must record the onboarding step as complete server-side
    expect(mockCompleteStep).toHaveBeenCalledWith("owner-1", "documentNumbering");
  });

  it("marks documentNumbering complete even when sequences already exist (idempotent)", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });

    mockDb.sequence.findFirst
      .mockResolvedValueOnce({ id: "existing-inv" })
      .mockResolvedValueOnce(null);

    mockDb.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const txClient = {
          sequence: {
            create: vi.fn().mockResolvedValue({ id: "seq-vch-1" }),
          },
          sequenceFormat: {
            create: vi.fn().mockResolvedValue({ id: "fmt-1" }),
          },
          sequencePeriod: {
            create: vi.fn().mockResolvedValue({ id: "per-1" }),
          },
        };
        return fn(txClient);
      }
    );

    mockLogAuditTx.mockResolvedValue(null);
    mockCompleteStep.mockResolvedValue(undefined);

    const result = await saveOnboardingSequences({ organizationId: "org-1" });

    expect(result.success).toBe(true);
    expect(result.created).toHaveLength(1);
    expect(result.created).toContain("VOUCHER");
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    expect(mockCompleteStep).toHaveBeenCalledWith("owner-1", "documentNumbering");
  });

  it("marks documentNumbering complete even when both sequences already exist", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });

    mockDb.sequence.findFirst.mockResolvedValue({ id: "existing" });
    mockCompleteStep.mockResolvedValue(undefined);

    const result = await saveOnboardingSequences({ organizationId: "org-1" });

    expect(result.success).toBe(true);
    expect(result.created).toHaveLength(0);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
    // Step must still be recorded complete
    expect(mockCompleteStep).toHaveBeenCalledWith("owner-1", "documentNumbering");
  });

  it("does NOT mark documentNumbering complete when sequence creation fails", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });

    mockDb.sequence.findFirst.mockResolvedValue(null);
    mockDb.$transaction.mockRejectedValue(new Error("DB write failed"));

    await expect(
      saveOnboardingSequences({ organizationId: "org-1" })
    ).rejects.toThrow("DB write failed");

    // Step completion must not be recorded on failure
    expect(mockCompleteStep).not.toHaveBeenCalled();
  });
});
