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
  completeOnboardingStepStrict: mockCompleteStep,
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

  // ── Custom config tests ──────────────────────────────────────────

  it("creates sequences with custom format and periodicity", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });
    mockDb.sequence.findFirst.mockResolvedValue(null);

    mockDb.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const txClient = {
          sequence: { create: vi.fn().mockResolvedValue({ id: "s1" }) },
          sequenceFormat: { create: vi.fn().mockResolvedValue({ id: "f1" }) },
          sequencePeriod: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        };
        return fn(txClient);
      }
    );
    mockLogAuditTx.mockResolvedValue(null);
    mockCompleteStep.mockResolvedValue(undefined);

    const result = await saveOnboardingSequences({
      organizationId: "org-1",
      customConfigs: [
        { documentType: "INVOICE", formatString: "MYINV/{YYYY}/{MM}/{NNNNN}", periodicity: "MONTHLY" },
        { documentType: "VOUCHER", formatString: "PYMT/{FY}/{NNN}", periodicity: "FINANCIAL_YEAR" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.created).toContain("INVOICE");
    expect(result.created).toContain("VOUCHER");
    expect(mockDb.$transaction).toHaveBeenCalledTimes(2);
    expect(mockCompleteStep).toHaveBeenCalledWith("owner-1", "documentNumbering");
  });

  it("rejects invalid format string in custom config", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });

    await expect(
      saveOnboardingSequences({
        organizationId: "org-1",
        customConfigs: [
          { documentType: "INVOICE", formatString: "INV/{YYYY}", periodicity: "YEARLY" },
        ],
      })
    ).rejects.toThrow(/INVOICE format:.*running number/i);

    // Must not reach step completion
    expect(mockCompleteStep).not.toHaveBeenCalled();
  });

  it("rejects continuity seed that does not match format", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });

    await expect(
      saveOnboardingSequences({
        organizationId: "org-1",
        customConfigs: [
          {
            documentType: "INVOICE",
            formatString: "INV/{YYYY}/{NNNNN}",
            periodicity: "YEARLY",
            latestUsedNumber: "VCH/2026/00042",
          },
        ],
      })
    ).rejects.toThrow(/does not match format/i);

    expect(mockCompleteStep).not.toHaveBeenCalled();
  });

  it("applies valid continuity seed during custom creation", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });
    mockDb.sequence.findFirst.mockResolvedValue(null);

    let capturedPeriodCounter: number | undefined;

    mockDb.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const txClient = {
          sequence: { create: vi.fn().mockResolvedValue({ id: "s1" }) },
          sequenceFormat: { create: vi.fn().mockResolvedValue({ id: "f1" }) },
          sequencePeriod: {
            create: vi.fn((args: { data: { currentCounter: number } }) => {
              capturedPeriodCounter = args.data.currentCounter;
              return { id: "p1" };
            }),
          },
        };
        return fn(txClient);
      }
    );
    mockLogAuditTx.mockResolvedValue(null);
    mockCompleteStep.mockResolvedValue(undefined);

    await saveOnboardingSequences({
      organizationId: "org-1",
      customConfigs: [
        {
          documentType: "INVOICE",
          formatString: "INV/{YYYY}/{NNNNN}",
          periodicity: "YEARLY",
          latestUsedNumber: "INV/2026/00042",
        },
      ],
    });

    // currentCounter should be set to 42 (the extracted counter),
    // so the next consume yields 43.
    expect(capturedPeriodCounter).toBe(42);
    expect(mockCompleteStep).toHaveBeenCalled();
  });

  // ── Periodicity/token alignment tests ────────────────────────────

  it("rejects yearly periodicity without date token", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });

    await expect(
      saveOnboardingSequences({
        organizationId: "org-1",
        customConfigs: [
          { documentType: "INVOICE", formatString: "INV/{NNNNN}", periodicity: "YEARLY" },
        ],
      })
    ).rejects.toThrow(/periodicity.*YEARLY.*requires.*YYYY.*FY/i);

    expect(mockCompleteStep).not.toHaveBeenCalled();
  });

  it("rejects financial year periodicity without {FY} token", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });

    await expect(
      saveOnboardingSequences({
        organizationId: "org-1",
        customConfigs: [
          { documentType: "VOUCHER", formatString: "VCH/{YYYY}/{NNNNN}", periodicity: "FINANCIAL_YEAR" },
        ],
      })
    ).rejects.toThrow(/financial_year.*requires.*FY/i);

    expect(mockCompleteStep).not.toHaveBeenCalled();
  });

  it("accepts NONE periodicity without date token (continuous)", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });
    mockDb.sequence.findFirst.mockResolvedValue(null);

    mockDb.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const txClient = {
          sequence: { create: vi.fn().mockResolvedValue({ id: "s1" }) },
          sequenceFormat: { create: vi.fn().mockResolvedValue({ id: "f1" }) },
          sequencePeriod: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        };
        return fn(txClient);
      }
    );
    mockLogAuditTx.mockResolvedValue(null);
    mockCompleteStep.mockResolvedValue(undefined);

    const result = await saveOnboardingSequences({
      organizationId: "org-1",
      customConfigs: [
        { documentType: "INVOICE", formatString: "INV/{NNNNN}", periodicity: "NONE" },
      ],
    });

    expect(result.success).toBe(true);
    expect(mockCompleteStep).toHaveBeenCalled();
  });

  it("rejects MONTHLY periodicity without {MM} or {FY} token", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });

    await expect(
      saveOnboardingSequences({
        organizationId: "org-1",
        customConfigs: [
          { documentType: "INVOICE", formatString: "INV/{YYYY}/{NNNNN}", periodicity: "MONTHLY" },
        ],
      })
    ).rejects.toThrow(/monthly periodicity requires.*MM.*FY/i);

    expect(mockCompleteStep).not.toHaveBeenCalled();
  });

  // ── Strict completion tests ──────────────────────────────────────

  it("fails the action when completion persistence fails", async () => {
    mockRequireRole.mockResolvedValue({ orgId: "org-1", userId: "owner-1", role: "owner" });
    mockDb.sequence.findFirst.mockResolvedValue(null);

    mockDb.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const txClient = {
          sequence: { create: vi.fn().mockResolvedValue({ id: "s1" }) },
          sequenceFormat: { create: vi.fn().mockResolvedValue({ id: "f1" }) },
          sequencePeriod: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
        };
        return fn(txClient);
      }
    );
    mockLogAuditTx.mockResolvedValue(null);

    // Simulate the completion write failing
    mockCompleteStep.mockRejectedValue(new Error("Onboarding progress write failed"));

    await expect(
      saveOnboardingSequences({ organizationId: "org-1" })
    ).rejects.toThrow("Onboarding progress write failed");

    // Sequence creation succeeded but completion failed — the action
    // must surface the failure so the caller knows the step was not
    // recorded.
  });
});
