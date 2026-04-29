"use server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-org";
import { logAuditTx } from "@/lib/audit";
import { completeOnboardingStep } from "@/lib/onboarding-tracker";
import { headers } from "next/headers";
import { calculatePeriodBoundaries } from "@/features/sequences/engine/periodicity";
import type { SequenceDocumentType, SequencePeriodicity } from "@/features/sequences/types";

const DEFAULT_SEQUENCE_CONFIGS: Array<{
  documentType: SequenceDocumentType;
  name: string;
  formatString: string;
  periodicity: SequencePeriodicity;
  startCounter: number;
  counterPadding: number;
}> = [
  {
    documentType: "INVOICE",
    name: "Default Invoice Sequence",
    formatString: "INV/{YYYY}/{NNNNN}",
    periodicity: "YEARLY",
    startCounter: 1,
    counterPadding: 5,
  },
  {
    documentType: "VOUCHER",
    name: "Default Voucher Sequence",
    formatString: "VCH/{YYYY}/{NNNNN}",
    periodicity: "YEARLY",
    startCounter: 1,
    counterPadding: 5,
  },
];

async function getAuditHeaders() {
  const hdrs = await headers();
  return {
    ipAddress: hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || null,
    userAgent: hdrs.get("user-agent") || null,
  };
}

export async function saveOnboardingSequences({
  organizationId,
}: {
  organizationId: string;
}) {
  const ctx = await requireRole("owner");

  if (ctx.orgId !== organizationId) {
    throw new Error("Cannot configure sequences for a different organization.");
  }

  const auditHeaders = await getAuditHeaders();
  const created: string[] = [];

  for (const config of DEFAULT_SEQUENCE_CONFIGS) {
    const existing = await db.sequence.findFirst({
      where: {
        organizationId,
        documentType: config.documentType,
      },
    });

    if (existing) continue;

    await db.$transaction(async (tx) => {
      const sequence = await tx.sequence.create({
        data: {
          organizationId,
          name: config.name,
          documentType: config.documentType,
          periodicity: config.periodicity,
        },
      });

      await tx.sequenceFormat.create({
        data: {
          sequenceId: sequence.id,
          formatString: config.formatString,
          startCounter: config.startCounter,
          counterPadding: config.counterPadding,
          isDefault: true,
        },
      });

      if (config.periodicity !== "NONE") {
        const now = new Date();
        const boundaries = calculatePeriodBoundaries(now, config.periodicity);
        await tx.sequencePeriod.create({
          data: {
            sequenceId: sequence.id,
            startDate: boundaries.startDate,
            endDate: boundaries.endDate,
            currentCounter: config.startCounter - 1,
            status: "OPEN",
          },
        });
      }

      await logAuditTx(tx, {
        orgId: organizationId,
        actorId: ctx.userId,
        entityType: "sequence",
        entityId: sequence.id,
        action: "sequence.created",
        metadata: {
          documentType: config.documentType,
          formatString: config.formatString,
          periodicity: config.periodicity,
          source: "onboarding",
        },
        ...auditHeaders,
      });

      created.push(config.documentType);
    });
  }

  // Mark the Document Numbering onboarding step complete server-side.
  // This is authoritative — onboarding completion must not rely on
  // client-only state.
  await completeOnboardingStep(ctx.userId, "documentNumbering");

  return { success: true, created };
}

export async function saveOnboardingBranding({
  organizationId,
  accentColor,
  fontFamily,
}: {
  organizationId: string;
  accentColor: string;
  fontFamily: string;
}) {
  await db.brandingProfile.upsert({
    where: { organizationId },
    create: { organizationId, accentColor, fontFamily },
    update: { accentColor, fontFamily },
  });
}

export async function saveOnboardingFinancials({
  organizationId,
  bankName,
  bankAccount,
  bankIFSC,
  taxId,
  gstin,
  businessAddress,
}: {
  organizationId: string;
  bankName: string;
  bankAccount: string;
  bankIFSC: string;
  taxId: string;
  gstin: string;
  businessAddress: string;
}) {
  await db.orgDefaults.upsert({
    where: { organizationId },
    create: { organizationId, bankName, bankAccount, bankIFSC, taxId, gstin, businessAddress },
    update: { bankName, bankAccount, bankIFSC, taxId, gstin, businessAddress },
  });
}

export async function saveOnboardingTemplates({
  organizationId,
  invoiceTemplate,
  slipTemplate,
  voucherTemplate,
}: {
  organizationId: string;
  invoiceTemplate: string;
  slipTemplate: string;
  voucherTemplate: string;
}) {
  await db.orgDefaults.upsert({
    where: { organizationId },
    create: {
      organizationId,
      defaultInvoiceTemplate: invoiceTemplate,
      defaultSlipTemplate: slipTemplate,
      defaultVoucherTemplate: voucherTemplate,
    },
    update: {
      defaultInvoiceTemplate: invoiceTemplate,
      defaultSlipTemplate: slipTemplate,
      defaultVoucherTemplate: voucherTemplate,
    },
  });
}
