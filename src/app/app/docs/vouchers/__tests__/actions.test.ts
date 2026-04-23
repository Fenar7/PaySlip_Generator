import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    voucher: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    voucherLine: {
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

vi.mock("@/lib/prisma-errors", () => ({
  getSchemaDriftActionMessage: vi.fn(),
  isSchemaDriftError: vi.fn().mockReturnValue(false),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/accounting", () => ({
  postVoucherTx: vi.fn(),
}));

vi.mock("@/lib/document-events", () => ({
  emitVoucherEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/docs-vault", () => ({
  syncVoucherToIndex: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/usage-metering", () => ({
  checkUsageLimit: vi.fn(),
}));

vi.mock("@/lib/flow/workflow-engine", () => ({
  fireWorkflowTrigger: vi.fn().mockResolvedValue(undefined),
}));

import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { nextDocumentNumber } from "@/lib/docs";
import { postVoucherTx } from "@/lib/accounting";
import { checkUsageLimit } from "@/lib/usage-metering";
import { saveVoucher } from "../actions";

const ORG_ID = "org-1";
const USER_ID = "user-1";

describe("voucher save actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) => callback(db));
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: ORG_ID,
      userId: USER_ID,
      role: "admin",
    });
    vi.mocked(checkUsageLimit).mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 999,
    });
  });

  it("rejects zero-value voucher lines before posting", async () => {
    const result = await saveVoucher(
      {
        voucherDate: "2026-04-23",
        type: "payment",
        formData: { source: "test" },
        lines: [{ description: "Office rent", amount: 0 }],
      },
      "approved",
    );

    expect(result).toEqual({
      success: false,
      error: "Voucher line amounts must be greater than zero.",
    });
    expect(db.voucher.create).not.toHaveBeenCalled();
    expect(postVoucherTx).not.toHaveBeenCalled();
  });

  it("posts approved vouchers once the normalized total is positive", async () => {
    vi.mocked(nextDocumentNumber).mockResolvedValue("VCH-001");
    vi.mocked(db.voucher.create).mockResolvedValue({
      id: "voucher-1",
      voucherNumber: "VCH-001",
      totalAmount: 1250,
      type: "payment",
    } as any);
    vi.mocked(db.voucher.findFirst).mockResolvedValue({
      id: "voucher-1",
      organizationId: ORG_ID,
      voucherNumber: "VCH-001",
      status: "approved",
      voucherDate: "2026-04-23",
      totalAmount: 1250,
      type: "payment",
      archivedAt: null,
      vendor: null,
    } as any);

    const result = await saveVoucher(
      {
        voucherDate: "2026-04-23",
        type: "payment",
        formData: { source: "test" },
        lines: [{ description: "Office rent", amount: 1250 }],
      },
      "approved",
    );

    expect(result.success).toBe(true);
    expect(postVoucherTx).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        orgId: ORG_ID,
        voucherId: "voucher-1",
        actorId: USER_ID,
      }),
    );
  });
});
