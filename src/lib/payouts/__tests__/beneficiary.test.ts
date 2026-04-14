import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDb,
  createMarketplacePayoutEvent,
  refreshMarketplaceRevenueEligibilityForPublisherOrg,
} = vi.hoisted(() => ({
  mockDb: {
    $transaction: vi.fn(),
  },
  createMarketplacePayoutEvent: vi.fn(),
  refreshMarketplaceRevenueEligibilityForPublisherOrg: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/env", () => ({
  env: {
    PAYOUT_DETAILS_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  },
}));

vi.mock("../events", () => ({
  createMarketplacePayoutEvent,
}));

vi.mock("../eligibility", () => ({
  refreshMarketplaceRevenueEligibilityForPublisherOrg,
}));

import { upsertMarketplacePayoutBeneficiary } from "../beneficiary";
import { encryptPayoutSecret, fingerprintBankAccountNumber } from "../beneficiary-secrets";

describe("upsertMarketplacePayoutBeneficiary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => undefined);

  it("resets verification when payout details change", async () => {
    const existingIfscCipher = encryptPayoutSecret("HDFC0001234");
    const tx = {
      marketplacePayoutBeneficiary: {
        findUnique: vi.fn().mockResolvedValue({
          id: "ben-1",
          publisherOrgId: "org-1",
          accountHolderName: "Existing Publisher",
          payoutMethod: "bank_transfer",
          bankAccountFingerprint: fingerprintBankAccountNumber("111122223333"),
          ifscCiphertext: existingIfscCipher,
          upiIdCiphertext: null,
          status: "verified",
          lastChangedAt: new Date("2026-03-01T00:00:00.000Z"),
        }),
        upsert: vi.fn().mockResolvedValue({
          id: "ben-1",
          publisherOrgId: "org-1",
          accountHolderName: "Updated Publisher",
          payoutMethod: "bank_transfer",
          bankAccountLast4: "4444",
          status: "pending_verification",
          providerName: null,
          providerBeneficiaryId: null,
          verifiedAt: null,
          updatedAt: new Date("2026-03-15T00:00:00.000Z"),
        }),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    mockDb.$transaction.mockImplementation(async (callback) =>
      callback(tx as never),
    );

    const result = await upsertMarketplacePayoutBeneficiary({
      publisherOrgId: "org-1",
      actorId: "user-1",
      accountHolderName: "Updated Publisher",
      bankAccountNumber: "9999888877774444",
      ifscCode: "HDFC0004321",
    });

    expect(
      tx.marketplacePayoutBeneficiary.upsert.mock.calls[0][0].update,
    ).toMatchObject({
      status: "pending_verification",
      verifiedAt: null,
      verificationReference: null,
      verificationNotes: null,
    });
    expect(createMarketplacePayoutEvent).toHaveBeenCalledTimes(1);
    expect(refreshMarketplaceRevenueEligibilityForPublisherOrg).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      "beneficiary_updated",
    );
    expect(result.status).toBe("pending_verification");
    expect(result.bankAccountMasked).toBe("****4444");
  });
});
