import "server-only";

import { db } from "@/lib/db";
import { computeTax } from "./index";
import { taxRound2 } from "./engine";
import type { TaxBreakdownLine } from "./engine";
import type { Prisma } from "@/generated/prisma/client";

export interface LiabilityEstimateResult {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  outputTaxTotal: number;
  inputTaxTotal: number;
  netLiability: number;
  outputBreakdown: TaxBreakdownLine[];
  inputBreakdown: TaxBreakdownLine[];
  currency: string;
}

/**
 * Compute and persist a tax liability estimate for an org + taxConfig + period.
 * Scans posted invoices (output tax) and posted vendor bills (input tax / ITC).
 */
export async function computeTaxLiability(
  orgId: string,
  taxConfigId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<LiabilityEstimateResult> {
  const taxConfig = await db.taxConfig.findFirst({
    where: { id: taxConfigId, orgId, isActive: true },
  });
  if (!taxConfig) throw new Error("Tax configuration not found or inactive");

  // Fetch posted invoices (output tax = tax collected on sales)
  const invoices = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["ISSUED", "PARTIALLY_PAID", "PAID"] },
      issuedAt: { gte: periodStart, lte: periodEnd },
    },
    select: {
      totalAmount: true,
      gstTotalCgst: true,
      gstTotalSgst: true,
      gstTotalIgst: true,
      gstTotalCess: true,
      lineItems: { select: { amount: true, taxRate: true } },
    },
  });

  const periodStartStr = periodStart.toISOString().slice(0, 10);
  const periodEndStr = periodEnd.toISOString().slice(0, 10);

  // Fetch posted vendor bills (input tax = ITC receivable)
  const bills = await db.vendorBill.findMany({
    where: {
      orgId,
      status: { in: ["APPROVED", "PARTIALLY_PAID", "PAID"] },
      billDate: { gte: periodStartStr, lte: periodEndStr },
    },
    select: {
      totalAmount: true,
      taxAmount: true,
      lines: { select: { lineTotal: true, taxRate: true } },
    },
  });

  const configJson = taxConfig.config as Record<string, unknown>;

  // Compute output tax from invoice line items
  const outputResult = computeTax(taxConfig.region, {
    lines: invoices.flatMap((inv) =>
      inv.lineItems.map((li) => ({
        amount: Number(li.amount),
        taxRate: li.taxRate !== null ? Number(li.taxRate) : undefined,
      })),
    ),
    config: configJson,
  });

  // Compute input tax (ITC) from vendor bill line items
  const inputResult = computeTax(taxConfig.region, {
    lines: bills.flatMap((bill) =>
      bill.lines.map((li) => ({
        amount: Number(li.lineTotal),
        taxRate: li.taxRate !== null ? Number(li.taxRate) : undefined,
      })),
    ),
    config: configJson,
  });

  const outputTaxTotal = taxRound2(outputResult.totalTax);
  const inputTaxTotal = taxRound2(inputResult.totalTax);
  const netLiability = taxRound2(outputTaxTotal - inputTaxTotal);

  const estimate = await db.taxLiabilityEstimate.create({
    data: {
      orgId,
      taxConfigId,
      periodStart,
      periodEnd,
      outputTax: outputResult.breakdown as unknown as Prisma.InputJsonValue,
      outputTaxTotal,
      inputTax: inputResult.breakdown as unknown as Prisma.InputJsonValue,
      inputTaxTotal,
      netLiability,
      currency: outputResult.currency,
    },
    select: { id: true },
  });

  return {
    id: estimate.id,
    periodStart,
    periodEnd,
    outputTaxTotal,
    inputTaxTotal,
    netLiability,
    outputBreakdown: outputResult.breakdown,
    inputBreakdown: inputResult.breakdown,
    currency: outputResult.currency,
  };
}

/**
 * Get the latest tax liability estimate for a config.
 */
export async function getLatestLiabilityEstimate(
  orgId: string,
  taxConfigId: string,
): Promise<LiabilityEstimateResult | null> {
  const row = await db.taxLiabilityEstimate.findFirst({
    where: { orgId, taxConfigId },
    orderBy: { generatedAt: "desc" },
  });
  if (!row) return null;

  return {
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    outputTaxTotal: Number(row.outputTaxTotal),
    inputTaxTotal: Number(row.inputTaxTotal),
    netLiability: Number(row.netLiability),
    outputBreakdown: row.outputTax as unknown as TaxBreakdownLine[],
    inputBreakdown: row.inputTax as unknown as TaxBreakdownLine[],
    currency: row.currency,
  };
}
