"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface PayrollSettingsData {
  pfEnabled: boolean;
  esiEnabled: boolean;
  defaultTaxRegime: string;
  professionalTaxState: string | null;
  professionalTaxSlabs: Array<{ upTo: number | null; ptMonthly: number }>;
}

export async function getPayrollSettings(): Promise<
  ActionResult<PayrollSettingsData>
> {
  const { orgId } = await requireOrgContext();
  const settings = await db.payrollSettings.findUnique({ where: { orgId } });
  if (!settings) {
    return {
      success: true,
      data: {
        pfEnabled: true,
        esiEnabled: true,
        defaultTaxRegime: "new",
        professionalTaxState: null,
        professionalTaxSlabs: [],
      },
    };
  }
  return {
    success: true,
    data: {
      pfEnabled: settings.pfEnabled,
      esiEnabled: settings.esiEnabled,
      defaultTaxRegime: settings.defaultTaxRegime,
      professionalTaxState: settings.professionalTaxState,
      professionalTaxSlabs: settings.professionalTaxSlabs as Array<{
        upTo: number | null;
        ptMonthly: number;
      }>,
    },
  };
}

export async function updatePayrollSettings(
  data: Partial<PayrollSettingsData>
): Promise<ActionResult<{ id: string }>> {
  const { orgId, userId } = await requireOrgContext();
  await requireRole("admin");

  const updated = await db.payrollSettings.upsert({
    where: { orgId },
    create: {
      orgId,
      pfEnabled: data.pfEnabled ?? true,
      esiEnabled: data.esiEnabled ?? true,
      defaultTaxRegime: data.defaultTaxRegime ?? "new",
      professionalTaxState: data.professionalTaxState ?? null,
      professionalTaxSlabs: data.professionalTaxSlabs ?? [],
    },
    update: {
      ...(data.pfEnabled !== undefined && { pfEnabled: data.pfEnabled }),
      ...(data.esiEnabled !== undefined && { esiEnabled: data.esiEnabled }),
      ...(data.defaultTaxRegime !== undefined && {
        defaultTaxRegime: data.defaultTaxRegime,
      }),
      ...(data.professionalTaxState !== undefined && {
        professionalTaxState: data.professionalTaxState,
      }),
      ...(data.professionalTaxSlabs !== undefined && {
        professionalTaxSlabs: data.professionalTaxSlabs,
      }),
    },
    select: { id: true },
  });

  await logAudit({
    orgId,
    actorId: userId,
    action: "payroll.settings.updated",
    entityType: "payrollSettings",
    entityId: updated.id,
    metadata: data,
  });

  return { success: true, data: updated };
}
