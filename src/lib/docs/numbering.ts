"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type DocumentType = "invoice" | "voucher" | "salarySlip" | "quote" | "vendorBill";

interface NumberingConfig {
  prefixField:
    | "invoicePrefix"
    | "voucherPrefix"
    | "salarySlipPrefix"
    | "quotePrefix"
    | "vendorBillPrefix";
  counterField:
    | "invoiceCounter"
    | "voucherCounter"
    | "salarySlipCounter"
    | "quoteCounter"
    | "vendorBillCounter";
}

type PrefixField = NumberingConfig["prefixField"];
type CounterField = NumberingConfig["counterField"];

type NumberingFields = {
  invoicePrefix: string;
  invoiceCounter: number;
  voucherPrefix: string;
  voucherCounter: number;
  salarySlipPrefix: string;
  salarySlipCounter: number;
  quotePrefix: string;
  quoteCounter: number;
  vendorBillPrefix: string;
  vendorBillCounter: number;
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
  vendorBillPrefix: "BILL",
  vendorBillCounter: 1,
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
  vendorBill: {
    prefixField: "vendorBillPrefix",
    counterField: "vendorBillCounter",
  },
};

function numberingSelect(config: NumberingConfig) {
  return { [config.prefixField]: true, [config.counterField]: true } as const;
}

function getNumberingFieldValue<T extends PrefixField | CounterField>(
  fields: Partial<NumberingFields>,
  key: T,
): NumberingFields[T] {
  const value = fields[key];

  if (value === undefined) {
    throw new Error(`Missing numbering field: ${key}`);
  }

  return value as NumberingFields[T];
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
export async function nextDocumentNumberTx(
  tx: Prisma.TransactionClient,
  orgId: string,
  docType: DocumentType,
): Promise<string> {
  const config = CONFIG[docType];
  const select = numberingSelect(config);

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

  const prefix = getNumberingFieldValue(defaults, config.prefixField);
  const currentCounter = getNumberingFieldValue(defaults, config.counterField);

  await tx.orgDefaults.updateMany({
    where: { organizationId: orgId },
    data: {
      [config.counterField]: currentCounter + 1,
    },
  });

  const paddedCounter = currentCounter.toString().padStart(3, "0");
  return `${prefix}-${paddedCounter}`;
}

export async function nextDocumentNumber(
  orgId: string,
  docType: DocumentType
): Promise<string> {
  return db.$transaction((tx) => nextDocumentNumberTx(tx, orgId, docType));
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

  const prefix = getNumberingFieldValue(defaults, config.prefixField);
  const counter = getNumberingFieldValue(defaults, config.counterField);
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
