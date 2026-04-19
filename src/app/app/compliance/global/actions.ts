"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { requireFeature } from "@/lib/plans/enforcement";
import { db } from "@/lib/db";
import { listSupportedRegions } from "@/lib/tax";
import { computeTaxLiability, getLatestLiabilityEstimate } from "@/lib/tax/liability";
import type { LiabilityEstimateResult } from "@/lib/tax/liability";
import { logAudit } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface TaxConfigSummary {
  id: string;
  region: string;
  registrationNumber: string;
  registrationName: string | null;
  isDefault: boolean;
  isActive: boolean;
  filingFrequency: string;
  latestEstimate: LiabilityEstimateResult | null;
}

export interface TaxDashboardData {
  configs: TaxConfigSummary[];
  supportedRegions: Array<{ region: string; displayName: string; currency: string }>;
  orgPrimaryRegion: string | null;
}

/**
 * Load tax dashboard data — all active configs with their latest estimates.
 */
export async function getTaxDashboardData(): Promise<ActionResult<TaxDashboardData>> {
  try {
    const { orgId } = await requireOrgContext();
    await requireFeature(orgId, "globalTax");

    const [configs, org] = await Promise.all([
      db.taxConfig.findMany({
        where: { orgId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      }),
      db.organization.findUniqueOrThrow({
        where: { id: orgId },
        select: { primaryTaxRegion: true },
      }),
    ]);

    const configSummaries: TaxConfigSummary[] = await Promise.all(
      configs.map(async (c) => {
        const latestEstimate = await getLatestLiabilityEstimate(orgId, c.id);
        return {
          id: c.id,
          region: c.region,
          registrationNumber: c.registrationNumber,
          registrationName: c.registrationName,
          isDefault: c.isDefault,
          isActive: c.isActive,
          filingFrequency: c.filingFrequency,
          latestEstimate,
        };
      }),
    );

    return {
      success: true,
      data: {
        configs: configSummaries,
        supportedRegions: listSupportedRegions(),
        orgPrimaryRegion: org.primaryTaxRegion,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load tax data" };
  }
}

/**
 * Compute tax liability for a specific config and period. Admin-only.
 */
export async function computeTaxLiabilityAction(
  taxConfigId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ActionResult<LiabilityEstimateResult>> {
  try {
    const { orgId, userId } = await requireRole("admin");
    await requireFeature(orgId, "globalTax");

    const result = await computeTaxLiability(
      orgId,
      taxConfigId,
      new Date(periodStart),
      new Date(periodEnd),
    );

    await logAudit({
      orgId,
      actorId: userId,
      action: "tax.liability.computed",
      entityType: "TaxLiabilityEstimate",
      entityId: result.id,
      metadata: { taxConfigId, periodStart, periodEnd, netLiability: result.netLiability },
    });

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to compute liability" };
  }
}

/**
 * Create or update a tax config. Admin-only.
 */
export async function upsertTaxConfigAction(data: {
  id?: string;
  region: string;
  registrationNumber: string;
  registrationName?: string;
  isDefault?: boolean;
  config: Record<string, unknown>;
  filingFrequency?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId, userId } = await requireRole("admin");
    await requireFeature(orgId, "globalTax");

    if (data.id) {
      // Verify ownership
      const existing = await db.taxConfig.findFirst({
        where: { id: data.id, orgId },
      });
      if (!existing) return { success: false, error: "Tax config not found" };

      await db.taxConfig.update({
        where: { id: data.id },
        data: {
          registrationNumber: data.registrationNumber,
          registrationName: data.registrationName,
          isDefault: data.isDefault ?? false,
          config: data.config as Prisma.InputJsonValue,
          filingFrequency: (data.filingFrequency as "MONTHLY" | "QUARTERLY" | "ANNUAL") ?? "MONTHLY",
        },
      });

      await logAudit({
        orgId,
        actorId: userId,
        action: "tax.config.updated",
        entityType: "TaxConfig",
        entityId: data.id,
      });

      return { success: true, data: { id: data.id } };
    }

    const created = await db.taxConfig.create({
      data: {
        orgId,
        region: data.region as "IN_GST" | "UK_VAT" | "EU_VAT" | "US_SALES" | "AU_GST" | "NZ_GST" | "SG_GST" | "EXEMPT",
        registrationNumber: data.registrationNumber,
        registrationName: data.registrationName,
        isDefault: data.isDefault ?? false,
        config: data.config as Prisma.InputJsonValue,
        filingFrequency: (data.filingFrequency as "MONTHLY" | "QUARTERLY" | "ANNUAL") ?? "MONTHLY",
      },
      select: { id: true },
    });

    await logAudit({
      orgId,
      actorId: userId,
      action: "tax.config.created",
      entityType: "TaxConfig",
      entityId: created.id,
    });

    return { success: true, data: { id: created.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save tax config" };
  }
}
