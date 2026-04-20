import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    salarySlip: {
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

vi.mock("@/lib/document-events", () => ({
  emitSalarySlipEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/docs-vault", () => ({
  syncSalarySlipToIndex: vi.fn().mockResolvedValue(undefined),
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
import { db } from "@/lib/db";
import { emitSalarySlipEvent } from "@/lib/document-events";
import { updateSalarySlip } from "../actions";

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
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback(db));
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
