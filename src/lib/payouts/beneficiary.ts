import { db } from "@/lib/db";
import { createMarketplacePayoutEvent } from "./events";
import {
  decryptPayoutSecret,
  encryptPayoutSecret,
  fingerprintBankAccountNumber,
  maskBankAccountNumber,
  normalizeBankAccountNumber,
} from "./beneficiary-secrets";
import { refreshMarketplaceRevenueEligibilityForPublisherOrg } from "./eligibility";

export interface MarketplacePayoutBeneficiarySummary {
  id: string;
  publisherOrgId: string;
  accountHolderName: string;
  payoutMethod: string;
  bankAccountMasked: string | null;
  status: string;
  providerName: string | null;
  providerBeneficiaryId: string | null;
  verifiedAt: string | null;
  updatedAt: string;
}

export interface UpsertMarketplacePayoutBeneficiaryInput {
  publisherOrgId: string;
  actorId: string;
  accountHolderName: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeIfscCode(value?: string): string | null {
  const normalized = normalizeOptionalText(value)?.replace(/\s+/g, "").toUpperCase();
  return normalized ?? null;
}

function normalizeUpiId(value?: string): string | null {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  return normalized ?? null;
}

function validateBeneficiaryInput(
  input: UpsertMarketplacePayoutBeneficiaryInput,
): {
  accountHolderName: string;
  payoutMethod: string;
  bankAccountNumber: string | null;
  ifscCode: string | null;
  upiId: string | null;
} {
  const accountHolderName = input.accountHolderName.trim();
  const bankAccountNumber = normalizeOptionalText(input.bankAccountNumber)
    ? normalizeBankAccountNumber(input.bankAccountNumber!)
    : null;
  const ifscCode = normalizeIfscCode(input.ifscCode);
  const upiId = normalizeUpiId(input.upiId);

  if (accountHolderName.length < 2) {
    throw new Error("Account holder name is required.");
  }

  if (!bankAccountNumber && !upiId) {
    throw new Error("Provide either a bank account number or a UPI ID.");
  }

  if (bankAccountNumber && !/^\d{9,18}$/.test(bankAccountNumber)) {
    throw new Error("Bank account number must be 9 to 18 digits.");
  }

  if (bankAccountNumber && !ifscCode) {
    throw new Error("IFSC code is required for bank transfer payouts.");
  }

  if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
    throw new Error("IFSC code must be a valid 11-character bank code.");
  }

  if (upiId && !/^[a-z0-9.\-_]{2,256}@[a-z]{2,64}$/i.test(upiId)) {
    throw new Error("UPI ID must be a valid handle.");
  }

  return {
    accountHolderName,
    payoutMethod: bankAccountNumber ? "bank_transfer" : "upi",
    bankAccountNumber,
    ifscCode,
    upiId,
  };
}

function serializeBeneficiary(record: {
  id: string;
  publisherOrgId: string;
  accountHolderName: string;
  payoutMethod: string;
  bankAccountLast4: string | null;
  status: string;
  providerName: string | null;
  providerBeneficiaryId: string | null;
  verifiedAt: Date | null;
  updatedAt: Date;
}): MarketplacePayoutBeneficiarySummary {
  return {
    id: record.id,
    publisherOrgId: record.publisherOrgId,
    accountHolderName: record.accountHolderName,
    payoutMethod: record.payoutMethod,
    bankAccountMasked: record.bankAccountLast4
      ? `****${record.bankAccountLast4}`
      : null,
    status: record.status,
    providerName: record.providerName,
    providerBeneficiaryId: record.providerBeneficiaryId,
    verifiedAt: record.verifiedAt?.toISOString() ?? null,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getMarketplacePayoutBeneficiarySummary(
  publisherOrgId: string,
): Promise<MarketplacePayoutBeneficiarySummary | null> {
  const beneficiary = await db.marketplacePayoutBeneficiary.findUnique({
    where: { publisherOrgId },
    select: {
      id: true,
      publisherOrgId: true,
      accountHolderName: true,
      payoutMethod: true,
      bankAccountLast4: true,
      status: true,
      providerName: true,
      providerBeneficiaryId: true,
      verifiedAt: true,
      updatedAt: true,
    },
  });

  return beneficiary ? serializeBeneficiary(beneficiary) : null;
}

export async function upsertMarketplacePayoutBeneficiary(
  input: UpsertMarketplacePayoutBeneficiaryInput,
): Promise<MarketplacePayoutBeneficiarySummary> {
  const normalized = validateBeneficiaryInput(input);

  const beneficiary = await db.$transaction(async (tx) => {
    const existing = await tx.marketplacePayoutBeneficiary.findUnique({
      where: { publisherOrgId: input.publisherOrgId },
    });

    const nextBankFingerprint = normalized.bankAccountNumber
      ? fingerprintBankAccountNumber(normalized.bankAccountNumber)
      : null;
    const existingIfscCode = existing?.ifscCiphertext
      ? decryptPayoutSecret(existing.ifscCiphertext)
      : null;
    const existingUpiId = existing?.upiIdCiphertext
      ? decryptPayoutSecret(existing.upiIdCiphertext)
      : null;

    const detailsChanged = Boolean(
      !existing ||
        existing.accountHolderName !== normalized.accountHolderName ||
        existing.payoutMethod !== normalized.payoutMethod ||
        existing.bankAccountFingerprint !== nextBankFingerprint ||
        existingIfscCode !== normalized.ifscCode ||
        existingUpiId !== normalized.upiId,
    );

    const record = await tx.marketplacePayoutBeneficiary.upsert({
      where: { publisherOrgId: input.publisherOrgId },
      create: {
        publisherOrgId: input.publisherOrgId,
        accountHolderName: normalized.accountHolderName,
        payoutMethod: normalized.payoutMethod,
        bankAccountCiphertext: normalized.bankAccountNumber
          ? encryptPayoutSecret(normalized.bankAccountNumber)
          : null,
        bankAccountLast4: normalized.bankAccountNumber
          ? normalized.bankAccountNumber.slice(-4)
          : null,
        bankAccountFingerprint: nextBankFingerprint,
        ifscCiphertext: normalized.ifscCode
          ? encryptPayoutSecret(normalized.ifscCode)
          : null,
        upiIdCiphertext: normalized.upiId
          ? encryptPayoutSecret(normalized.upiId)
          : null,
        status: "pending_verification",
        createdByUserId: input.actorId,
        updatedByUserId: input.actorId,
      },
      update: {
        accountHolderName: normalized.accountHolderName,
        payoutMethod: normalized.payoutMethod,
        bankAccountCiphertext: normalized.bankAccountNumber
          ? encryptPayoutSecret(normalized.bankAccountNumber)
          : null,
        bankAccountLast4: normalized.bankAccountNumber
          ? normalized.bankAccountNumber.slice(-4)
          : null,
        bankAccountFingerprint: nextBankFingerprint,
        ifscCiphertext: normalized.ifscCode
          ? encryptPayoutSecret(normalized.ifscCode)
          : null,
        upiIdCiphertext: normalized.upiId
          ? encryptPayoutSecret(normalized.upiId)
          : null,
        status: detailsChanged
          ? "pending_verification"
          : existing?.status ?? "pending_verification",
        ...(detailsChanged
          ? {
              verifiedAt: null,
              verificationReference: null,
              verificationNotes: null,
            }
          : {}),
        lastChangedAt: detailsChanged ? new Date() : existing?.lastChangedAt,
        updatedByUserId: input.actorId,
      },
      select: {
        id: true,
        publisherOrgId: true,
        accountHolderName: true,
        payoutMethod: true,
        bankAccountLast4: true,
        status: true,
        providerName: true,
        providerBeneficiaryId: true,
        verifiedAt: true,
        updatedAt: true,
      },
    });

    await createMarketplacePayoutEvent(tx, {
      publisherOrgId: input.publisherOrgId,
      beneficiaryId: record.id,
      actorId: input.actorId,
      eventType: existing
        ? "marketplace.payout_beneficiary.updated"
        : "marketplace.payout_beneficiary.created",
      fromStatus: existing?.status ?? null,
      toStatus: record.status,
      metadata: {
        payoutMethod: record.payoutMethod,
        bankAccountMasked: normalized.bankAccountNumber
          ? maskBankAccountNumber(normalized.bankAccountNumber)
          : null,
        upiConfigured: Boolean(normalized.upiId),
      },
    });

    await tx.auditLog.create({
      data: {
        orgId: input.publisherOrgId,
        actorId: input.actorId,
        action: "marketplace.payout_beneficiary.updated",
        entityType: "marketplace_payout_beneficiary",
        entityId: record.id,
        metadata: {
          payoutMethod: record.payoutMethod,
          detailsChanged,
          verifiedAt: record.verifiedAt?.toISOString() ?? null,
        },
      },
    });

    return record;
  });

  await refreshMarketplaceRevenueEligibilityForPublisherOrg(
    input.publisherOrgId,
    input.actorId,
    "beneficiary_updated",
  );

  return serializeBeneficiary(beneficiary);
}

export async function verifyMarketplacePayoutBeneficiary(input: {
  publisherOrgId: string;
  actorId: string;
  verificationReference?: string;
  verificationNotes?: string;
}): Promise<MarketplacePayoutBeneficiarySummary> {
  const beneficiary = await db.$transaction(async (tx) => {
    const existing = await tx.marketplacePayoutBeneficiary.findUnique({
      where: { publisherOrgId: input.publisherOrgId },
      select: {
        id: true,
        publisherOrgId: true,
        accountHolderName: true,
        payoutMethod: true,
        bankAccountLast4: true,
        status: true,
        providerName: true,
        providerBeneficiaryId: true,
        verifiedAt: true,
        updatedAt: true,
      },
    });

    if (!existing) {
      throw new Error("Payout beneficiary has not been configured yet.");
    }

    const updated = await tx.marketplacePayoutBeneficiary.update({
      where: { publisherOrgId: input.publisherOrgId },
      data: {
        status: "verified",
        verifiedAt: new Date(),
        verificationReference: normalizeOptionalText(input.verificationReference),
        verificationNotes: normalizeOptionalText(input.verificationNotes),
        updatedByUserId: input.actorId,
      },
      select: {
        id: true,
        publisherOrgId: true,
        accountHolderName: true,
        payoutMethod: true,
        bankAccountLast4: true,
        status: true,
        providerName: true,
        providerBeneficiaryId: true,
        verifiedAt: true,
        updatedAt: true,
      },
    });

    await createMarketplacePayoutEvent(tx, {
      publisherOrgId: input.publisherOrgId,
      beneficiaryId: updated.id,
      actorId: input.actorId,
      eventType: "marketplace.payout_beneficiary.verified",
      fromStatus: existing.status,
      toStatus: updated.status,
      metadata: {
        verificationReference:
          normalizeOptionalText(input.verificationReference) ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        orgId: input.publisherOrgId,
        actorId: input.actorId,
        action: "marketplace.payout_beneficiary.verified",
        entityType: "marketplace_payout_beneficiary",
        entityId: updated.id,
        metadata: {
          verificationReference:
            normalizeOptionalText(input.verificationReference) ?? null,
        },
      },
    });

    return updated;
  });

  await refreshMarketplaceRevenueEligibilityForPublisherOrg(
    input.publisherOrgId,
    input.actorId,
    "beneficiary_verified",
  );

  return serializeBeneficiary(beneficiary);
}
