import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/require-org", () => ({
  requireOrgContext: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    interCompanyTransfer: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/accounting/journals", () => ({
  createAndPostJournalTx: vi.fn(),
}));

vi.mock("@/lib/accounting/accounts", () => ({
  SYSTEM_ACCOUNT_KEYS: {
    PRIMARY_BANK: "PRIMARY_BANK",
    SUSPENSE_UNMATCHED: "SUSPENSE_UNMATCHED",
  },
  getRequiredSystemAccountsTx: vi.fn(),
}));

import { requireOrgContext } from "@/lib/auth/require-org";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { createAndPostJournalTx } from "@/lib/accounting/journals";
import { getRequiredSystemAccountsTx } from "@/lib/accounting/accounts";
import { postInterCompanyTransfer } from "../actions";

describe("postInterCompanyTransfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireOrgContext).mockResolvedValue({
      orgId: "org-admin",
      userId: "user-1",
      role: "admin",
      representedId: null,
      proxyGrantId: null,
      proxyScope: [],
    });
  });

  it("treats an already-posted transfer with journal links as idempotent success", async () => {
    vi.mocked(db.interCompanyTransfer.findUnique).mockResolvedValue({
      id: "ict-1",
      status: "POSTED",
      sourceJournalEntryId: "je-src",
      destinationJournalEntryId: "je-dest",
      postedAt: new Date("2026-04-20T10:00:00Z"),
      entityGroup: { adminOrgId: "org-admin" },
    } as never);

    const result = await postInterCompanyTransfer("ict-1");

    expect(result).toEqual({ success: true, data: null });
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(logAudit).not.toHaveBeenCalled();
  });

  it("refuses to post when approval metadata and journal metadata disagree", async () => {
    vi.mocked(db.interCompanyTransfer.findUnique).mockResolvedValue({
      id: "ict-1",
      status: "APPROVED",
      sourceJournalEntryId: "je-src",
      destinationJournalEntryId: null,
      postedAt: null,
      entityGroup: { adminOrgId: "org-admin" },
    } as never);

    const result = await postInterCompanyTransfer("ict-1");

    expect(result).toEqual({
      success: false,
      error: "Transfer already has posting metadata. Resolve the inconsistent state before retrying.",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("posts an approved transfer once and records both journal links", async () => {
    vi.mocked(db.interCompanyTransfer.findUnique).mockResolvedValue({
      id: "ict-1",
      status: "APPROVED",
      sourceOrgId: "org-source",
      destinationOrgId: "org-dest",
      amount: 5000,
      currency: "INR",
      description: "Funding",
      transferDate: new Date("2026-04-20T00:00:00Z"),
      referenceNumber: "ICT-001",
      sourceJournalEntryId: null,
      destinationJournalEntryId: null,
      postedAt: null,
      entityGroup: { adminOrgId: "org-admin" },
    } as never);
    vi.mocked(getRequiredSystemAccountsTx).mockResolvedValue({
      PRIMARY_BANK: { id: "bank" },
      SUSPENSE_UNMATCHED: { id: "suspense" },
    } as never);
    vi.mocked(createAndPostJournalTx)
      .mockResolvedValueOnce({ id: "je-src" } as never)
      .mockResolvedValueOnce({ id: "je-dest" } as never);
    vi.mocked(db.$transaction).mockImplementation(async (callback: any) =>
      callback({
        interCompanyTransfer: {
          update: vi.fn(),
        },
      } as any),
    );

    const result = await postInterCompanyTransfer("ict-1");

    expect(result).toEqual({ success: true, data: null });
    expect(createAndPostJournalTx).toHaveBeenCalledTimes(2);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ict.posted",
        entityId: "ict-1",
        metadata: { sourceJeId: "je-src", destJeId: "je-dest" },
      }),
    );
  });
});
