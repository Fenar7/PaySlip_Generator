"use server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth/require-org";
import { logAuditTx } from "@/lib/audit";
import { completeOnboardingStep } from "@/lib/onboarding-tracker";
import { headers } from "next/headers";
import { calculatePeriodBoundaries } from "@/features/sequences/engine/periodicity";
import { validateFormat, tokenize } from "@/features/sequences/engine/tokenizer";
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

export interface SequenceCustomConfig {
  documentType: SequenceDocumentType;
  formatString: string;
  periodicity: SequencePeriodicity;
  latestUsedNumber?: string;
}

async function getAuditHeaders() {
  const hdrs = await headers();
  return {
    ipAddress: hdrs.get("x-forwarded-for") || hdrs.get("x-real-ip") || null,
    userAgent: hdrs.get("user-agent") || null,
  };
}

/**
 * Validate a custom sequence config against the format engine.
 * Throws a descriptive error on failure.
 */
function validateCustomConfig(config: SequenceCustomConfig): void {
  const validation = validateFormat(config.formatString);
  if (!validation.valid) {
    throw new Error(
      `${config.documentType} format: ${validation.errors.join("; ")}`
    );
  }

  if (config.latestUsedNumber) {
    const match = extractCounterFromNumber(
      config.latestUsedNumber,
      config.formatString
    );
    if (match === null) {
      throw new Error(
        `${config.documentType} latest used number "${config.latestUsedNumber}" does not match format "${config.formatString}"`
      );
    }
  }
}

/**
 * Extract the counter value from a formatted number by matching
 * against a format string.  Uses the same tokenize → regex approach
 * as the sequence-admin service.
 */
function extractCounterFromNumber(
  formattedNumber: string,
  formatString: string
): number | null {
  const tokens = tokenize(formatString);
  let pattern = "^";
  let hasRunningNumber = false;

  for (const token of tokens) {
    if (token.type === "literal") {
      pattern += escapeRegex(token.value);
    } else if (token.type === "token" && /^N{2,}$/.test(token.value)) {
      pattern += "(\\d+)";
      hasRunningNumber = true;
    } else if (token.type === "token") {
      if (token.value === "YYYY") pattern += "(\\d{4})";
      else if (token.value === "MM") pattern += "(\\d{2})";
      else if (token.value === "DD") pattern += "(\\d{2})";
      else if (token.value === "FY") pattern += "FY[\\w\\-]+";
      else pattern += ".*?";
    }
  }
  pattern += "$";

  if (!hasRunningNumber) return null;

  const regex = new RegExp(pattern);
  const match = formattedNumber.match(regex);
  if (!match) return null;

  let captureIndex = 1;
  for (const token of tokens) {
    if (token.type === "token" && /^N{2,}$/.test(token.value)) break;
    if (token.type === "token" && ["YYYY", "MM", "DD"].includes(token.value)) captureIndex++;
  }

  const counterStr = match[captureIndex];
  if (!counterStr) return null;
  const counter = parseInt(counterStr, 10);
  return isNaN(counter) ? null : counter;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function saveOnboardingSequences({
  organizationId,
  customConfigs,
}: {
  organizationId: string;
  customConfigs?: SequenceCustomConfig[];
}) {
  const ctx = await requireRole("owner");

  if (ctx.orgId !== organizationId) {
    throw new Error("Cannot configure sequences for a different organization.");
  }

  // When the user chose custom, validate every config before touching the DB.
  if (customConfigs && customConfigs.length > 0) {
    for (const config of customConfigs) {
      validateCustomConfig(config);
    }
  }

  const auditHeaders = await getAuditHeaders();
  const created: string[] = [];
  const configs = customConfigs?.length
    ? customConfigs
    : DEFAULT_SEQUENCE_CONFIGS;

  for (const config of configs) {
    const existing = await db.sequence.findFirst({
      where: { organizationId, documentType: config.documentType },
    });

    if (existing) continue;

    // Derive the initial counter: if a continuity seed was supplied,
    // set currentCounter = extracted value so the next consume yields +1.
    const seedCounter = config.latestUsedNumber
      ? extractCounterFromNumber(config.latestUsedNumber, config.formatString) ?? 0
      : null;
    const periodCounter = seedCounter !== null ? seedCounter : config.startCounter - 1;

    await db.$transaction(async (tx) => {
      const sequence = await tx.sequence.create({
        data: {
          organizationId,
          name: `${config.documentType === "INVOICE" ? "Invoice" : "Voucher"} Sequence`,
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
            currentCounter: periodCounter,
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
          continuitySeeded:
            config.latestUsedNumber != null
              ? { latestUsedNumber: config.latestUsedNumber, seedCounter: periodCounter }
              : undefined,
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
