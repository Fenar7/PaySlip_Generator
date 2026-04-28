import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    salarySlip: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    salaryComponent: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
}));

vi.mock("@/lib/docs", () => ({
  nextDocumentNumber: vi.fn(),
}));

vi.mock("@/lib/document-events", () => ({
  emitSalarySlipEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/docs-vault", () => ({
  syncSalarySlipToIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma-errors", () => ({
  getSchemaDriftActionMessage: vi.fn(),
  isSchemaDriftError: vi.fn().mockReturnValue(false),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/accounting", () => ({
  postSalarySlipAccrualTx: vi.fn(),
  postSalarySlipPayoutTx: vi.fn(),
}));

vi.mock("@/lib/usage-metering", () => ({
  checkUsageLimit: vi.fn(),
}));

import { requireOrgContext } from "@/lib/auth";
import { nextDocumentNumber } from "@/lib/docs";
import { db } from "@/lib/db";
import { emitSalarySlipEvent } from "@/lib/document-events";
import { postSalarySlipAccrualTx } from "@/lib/accounting";
import { getSchemaDriftActionMessage, isSchemaDriftError } from "@/lib/prisma-errors";
import { checkUsageLimit } from "@/lib/usage-metering";
import { saveSalarySlip, updateSalarySlip } from "../actions";

const ORG_ID = "org-1";
const USER_ID = "user-1";

describe("salary slip audit remediations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: ORG_ID,
      userId: USER_ID,
      role: "admin",
    });
    vi.mocked(nextDocumentNumber).mockResolvedValue("SAL-001");
    vi.mocked(checkUsageLimit).mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 999,
    });
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback(db));
    vi.mocked(isSchemaDriftError).mockReturnValue(false);
  });

  it("creates and releases a salary slip when the normalized totals are valid", async () => {
    vi.mocked(db.salarySlip.create).mockResolvedValue({
      id: "slip-1",
      slipNumber: "SAL-001",
    } as any);
    vi.mocked(db.salarySlip.findFirst).mockResolvedValue({
      id: "slip-1",
      organizationId: ORG_ID,
      slipNumber: "SAL-001",
      status: "released",
      month: 4,
      year: 2026,
      netPay: 900,
      archivedAt: null,
      employee: null,
    } as any);

    const result = await saveSalarySlip(
      {
        month: 4,
        year: 2026,
        formData: { source: "test" },
        components: [
          { label: "Basic", amount: 1000, type: "earning" },
          { label: "PF", amount: 100, type: "deduction" },
        ],
      },
      "released",
    );

    expect(result.success).toBe(true);
    expect(postSalarySlipAccrualTx).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        orgId: ORG_ID,
        salarySlipId: "slip-1",
        actorId: USER_ID,
      }),
    );
    expect(emitSalarySlipEvent).toHaveBeenCalledWith(
      ORG_ID,
      "slip-1",
      "released",
      expect.objectContaining({ actorId: USER_ID }),
    );
  });

  it("saves draft salary slips even when the current form only has partial components", async () => {
    vi.mocked(db.salarySlip.create).mockResolvedValue({
      id: "slip-1",
      slipNumber: "SAL-001",
    } as any);

    const result = await saveSalarySlip(
      {
        month: 4,
        year: 2026,
        formData: {
          month: "April",
          year: "2026",
          earnings: [{ label: "Basic", amount: "" }],
          deductions: [{ label: "", amount: "" }],
        },
        components: [
          { label: "Basic", amount: 0, type: "earning" },
          { label: "", amount: 0, type: "deduction" },
        ],
      },
      "draft",
    );

    expect(result.success).toBe(true);
    expect(postSalarySlipAccrualTx).not.toHaveBeenCalled();
    expect(vi.mocked(db.salarySlip.create).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          grossPay: 0,
          netPay: 0,
        }),
      }),
    );
    expect(vi.mocked(db.salarySlip.create).mock.calls[0]?.[0]?.data.components).toBeUndefined();
  });

  it("returns a schema drift message when salary-slip creation hits a Prisma mismatch", async () => {
    vi.mocked(isSchemaDriftError).mockReturnValue(true);
    vi.mocked(getSchemaDriftActionMessage).mockReturnValue(
      "Failed to save the salary slip. The database schema is not up to date. Run the Prisma migrations and try again.",
    );
    vi.mocked(db.salarySlip.create).mockRejectedValue(new Error("drift"));

    const result = await saveSalarySlip(
      {
        month: 4,
        year: 2026,
        formData: { source: "test" },
        components: [{ label: "Basic", amount: 1000, type: "earning" }],
      },
      "draft",
    );

    expect(result).toEqual({
      success: false,
      error:
        "Failed to save the salary slip. The database schema is not up to date. Run the Prisma migrations and try again.",
      });
  });

  it("keeps release validation strict when deductions exceed earnings", async () => {
    const result = await saveSalarySlip(
      {
        month: 4,
        year: 2026,
        formData: { source: "test" },
        components: [
          { label: "Basic", amount: 100, type: "earning" },
          { label: "Advance recovery", amount: 150, type: "deduction" },
        ],
      },
      "released",
    );

    expect(result).toEqual({
      success: false,
      error: "Net pay cannot be negative. Adjust deductions.",
    });
    expect(db.salarySlip.create).not.toHaveBeenCalled();
  });

  it("blocks edits once a salary slip is released", async () => {
    vi.mocked(db.salarySlip.findFirst).mockResolvedValue({
      id: "slip-1",
      grossPay: 1000,
      netPay: 900,
      status: "released",
      accountingStatus: "PENDING",
    } as any);

    const result = await updateSalarySlip("slip-1", {
      components: [{ label: "Basic", amount: 1000, type: "earning" }],
    });

    expect(result).toEqual({
      success: false,
      error: "Released salary slips are immutable. Create a corrective payout entry instead.",
    });
  });

  it("updates draft salary slips without recreating incomplete components", async () => {
    vi.mocked(db.salarySlip.findFirst).mockResolvedValue({
      id: "slip-1",
      grossPay: 1000,
      netPay: 900,
      status: "draft",
      accountingStatus: "PENDING",
    } as any);
    vi.mocked(db.salarySlip.update).mockResolvedValue({} as any);
    vi.mocked(db.salaryComponent.deleteMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(db.salarySlip.findUnique).mockResolvedValue({
      id: "slip-1",
      organizationId: ORG_ID,
      slipNumber: "SLIP-001",
      status: "draft",
      month: 4,
      year: 2026,
      netPay: 0,
      archivedAt: null,
      employee: null,
    } as any);

    const result = await updateSalarySlip("slip-1", {
      formData: {
        month: "April",
        year: "2026",
        earnings: [{ label: "Basic", amount: "" }],
      },
      components: [{ label: "Basic", amount: 0, type: "earning" }],
    });

    expect(result.success).toBe(true);
    expect(db.salaryComponent.deleteMany).toHaveBeenCalledWith({
      where: { salarySlipId: "slip-1" },
    });
    expect(db.salaryComponent.createMany).not.toHaveBeenCalled();
  });

  it("records the acting user when a draft salary slip is updated", async () => {
    vi.mocked(db.salarySlip.findFirst).mockResolvedValue({
      id: "slip-1",
      grossPay: 1000,
      netPay: 900,
      status: "draft",
      accountingStatus: "PENDING",
    } as any);
    vi.mocked(db.salarySlip.update).mockResolvedValue({} as any);
    vi.mocked(db.salaryComponent.deleteMany).mockResolvedValue({ count: 1 } as any);
    vi.mocked(db.salaryComponent.createMany).mockResolvedValue({ count: 2 } as any);
    vi.mocked(db.salarySlip.findUnique).mockResolvedValue({
      id: "slip-1",
      organizationId: ORG_ID,
      slipNumber: "SLIP-001",
      status: "draft",
      month: 4,
      year: 2026,
      netPay: 900,
      archivedAt: null,
      employee: null,
    } as any);

    const result = await updateSalarySlip("slip-1", {
      components: [
        { label: "Basic", amount: 1000, type: "earning" },
        { label: "PF", amount: 100, type: "deduction" },
      ],
    });

    expect(result.success).toBe(true);
    expect(emitSalarySlipEvent).toHaveBeenCalledWith(
      ORG_ID,
      "slip-1",
      "updated",
      expect.objectContaining({ actorId: USER_ID }),
    );
  });
});
