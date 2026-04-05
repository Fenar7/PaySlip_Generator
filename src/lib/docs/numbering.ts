"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type DocumentType = "invoice" | "voucher" | "salarySlip";

interface NumberingConfig {
  prefixField: "invoicePrefix" | "voucherPrefix" | "salarySlipPrefix";
  counterField: "invoiceCounter" | "voucherCounter" | "salarySlipCounter";
}

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
};

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

  // Use a transaction to atomically read and increment
  const result = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    // Get or create OrgDefaults
    let defaults = await tx.orgDefaults.findUnique({
      where: { organizationId: orgId },
    });

    if (!defaults) {
      // Create defaults if they don't exist
      defaults = await tx.orgDefaults.create({
        data: { organizationId: orgId },
      });
    }

    const prefix = defaults[config.prefixField];
    const currentCounter = defaults[config.counterField];

    // Increment the counter
    await tx.orgDefaults.update({
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

  const defaults = await db.orgDefaults.findUnique({
    where: { organizationId: orgId },
  });

  if (!defaults) {
    // Return default preview
    const defaultPrefixes = {
      invoice: "INV",
      voucher: "VCH",
      salarySlip: "SAL",
    };
    return `${defaultPrefixes[docType]}-001`;
  }

  const prefix = defaults[config.prefixField];
  const counter = defaults[config.counterField];
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

  await db.orgDefaults.upsert({
    where: { organizationId: orgId },
    update: { [config.prefixField]: sanitizedPrefix },
    create: {
      organizationId: orgId,
      [config.prefixField]: sanitizedPrefix,
    },
  });
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

  await db.orgDefaults.upsert({
    where: { organizationId: orgId },
    update: { [config.counterField]: startFrom },
    create: {
      organizationId: orgId,
      [config.counterField]: startFrom,
    },
  });
}
