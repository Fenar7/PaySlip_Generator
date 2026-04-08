"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type DocumentType = "invoice" | "voucher" | "salarySlip" | "quote";

interface NumberingConfig {
  prefixField: "invoicePrefix" | "voucherPrefix" | "salarySlipPrefix" | "quotePrefix";
  counterField: "invoiceCounter" | "voucherCounter" | "salarySlipCounter" | "quoteCounter";
}

type NumberingFields = {
  invoicePrefix: string;
  invoiceCounter: number;
  voucherPrefix: string;
  voucherCounter: number;
  salarySlipPrefix: string;
  salarySlipCounter: number;
  quotePrefix: string;
  quoteCounter: number;
};

const DEFAULT_NUMBERING: NumberingFields = {
  invoicePrefix: "INV",
  invoiceCounter: 1,
  voucherPrefix: "VCH",
  voucherCounter: 1,
  salarySlipPrefix: "SAL",
  salarySlipCounter: 1,
  quotePrefix: "QTE",
  quoteCounter: 1,
};

const CONFIG: Record<DocumentType, NumberingConfig> = {
  invoice: {
    prefixField: "invoicePrefix",
    counterField: "invoiceCounter",
  },
  voucher: {
    prefixField: "voucherPrefix",
    counterField: "voucherCounter",
  },
  salarySlip: {
    prefixField: "salarySlipPrefix",
    counterField: "salarySlipCounter",
  },
  quote: {
    prefixField: "quotePrefix",
    counterField: "quoteCounter",
  },
};

function numberingSelect(config: NumberingConfig) {
  return { [config.prefixField]: true, [config.counterField]: true } as const;
}

/**
 * Get the next document number for an organization.
 * Atomically increments the counter and returns the formatted number.
 *
 * Format: {PREFIX}-{COUNTER} (e.g., "INV-001", "VCH-042")
 *
 * @param orgId - Organization ID
 * @param docType - Type of document (invoice, voucher, salarySlip)
 * @returns Formatted document number
 */
export async function nextDocumentNumber(
  orgId: string,
  docType: DocumentType
): Promise<string> {
  const config = CONFIG[docType];
  const select = numberingSelect(config);

  // Use a transaction to atomically read and increment
  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    // Get or create OrgDefaults — only fetch the two fields we need
    let defaults = await tx.orgDefaults.findUnique({
      where: { organizationId: orgId },
      select,
    });

    if (!defaults) {
      defaults = await tx.orgDefaults.create({
        data: { organizationId: orgId },
        select,
      });
    }

    const prefix = (defaults as any)[config.prefixField] as string;
    const currentCounter = (defaults as any)[config.counterField] as number;

    // Increment the counter — updateMany avoids a full-row read on return
    await tx.orgDefaults.updateMany({
      where: { organizationId: orgId },
      data: {
        [config.counterField]: currentCounter + 1,
      },
    });

    return { prefix, counter: currentCounter };
  });

  // Format: PREFIX-001, PREFIX-002, etc.
  const paddedCounter = result.counter.toString().padStart(3, "0");
  return `${result.prefix}-${paddedCounter}`;
}

/**
 * Preview the next document number without incrementing.
 * Useful for showing what the next number will be in the UI.
 */
export async function previewNextNumber(
  orgId: string,
  docType: DocumentType
): Promise<string> {
  const config = CONFIG[docType];
  const select = numberingSelect(config);

  const defaults = await db.orgDefaults.findUnique({
    where: { organizationId: orgId },
    select,
  });

  if (!defaults) {
    return `${DEFAULT_NUMBERING[config.prefixField]}-001`;
  }

  const prefix = (defaults as any)[config.prefixField] as string;
  const counter = (defaults as any)[config.counterField] as number;
  const paddedCounter = counter.toString().padStart(3, "0");

  return `${prefix}-${paddedCounter}`;
}

/**
 * Update the numbering prefix for a document type.
 */
export async function updatePrefix(
  orgId: string,
  docType: DocumentType,
  newPrefix: string
): Promise<void> {
  const config = CONFIG[docType];

  // Validate prefix (alphanumeric, max 10 chars)
  const sanitizedPrefix = newPrefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

  if (!sanitizedPrefix) {
    throw new Error("Prefix must contain at least one alphanumeric character");
  }

  const updated = await db.orgDefaults.updateMany({
    where: { organizationId: orgId },
    data: { [config.prefixField]: sanitizedPrefix },
  });

  if (updated.count === 0) {
    await db.orgDefaults.create({
      data: { organizationId: orgId, [config.prefixField]: sanitizedPrefix },
      select: { organizationId: true },
    });
  }
}

/**
 * Reset the counter for a document type (use with caution).
 */
export async function resetCounter(
  orgId: string,
  docType: DocumentType,
  startFrom: number = 1
): Promise<void> {
  const config = CONFIG[docType];

  if (startFrom < 1) {
    throw new Error("Counter must start from at least 1");
  }

  const updated = await db.orgDefaults.updateMany({
    where: { organizationId: orgId },
    data: { [config.counterField]: startFrom },
  });

  if (updated.count === 0) {
    await db.orgDefaults.create({
      data: { organizationId: orgId, [config.counterField]: startFrom },
      select: { organizationId: true },
    });
  }
}
