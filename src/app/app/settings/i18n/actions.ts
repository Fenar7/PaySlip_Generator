"use server";

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { revalidatePath } from "next/cache";

type ActionResult<T = null> = { success: true; data: T } | { success: false; error: string };

// ── Read i18n settings ──────────────────────────────────────────────────────

export async function getOrgI18nSettings(): Promise<
  ActionResult<{
    defaultLanguage: string;
    defaultDocLanguage: string;
    country: string;
    baseCurrency: string;
    timezone: string;
    vatRegNumber: string | null;
    vatRate: number | null;
    fiscalYearStart: number;
  }>
> {
  try {
    const { orgId } = await requireOrgContext();

    const defaults = await db.orgDefaults.findUnique({
      where: { organizationId: orgId },
      select: {
        defaultLanguage: true,
        defaultDocLanguage: true,
        country: true,
        baseCurrency: true,
        timezone: true,
        vatRegNumber: true,
        vatRate: true,
        fiscalYearStart: true,
      },
    });

    if (!defaults) {
      return {
        success: true,
        data: {
          defaultLanguage: "en",
          defaultDocLanguage: "en",
          country: "IN",
          baseCurrency: "INR",
          timezone: "Asia/Kolkata",
          vatRegNumber: null,
          vatRate: null,
          fiscalYearStart: 4,
        },
      };
    }

    return {
      success: true,
      data: {
        defaultLanguage: defaults.defaultLanguage,
        defaultDocLanguage: defaults.defaultDocLanguage,
        country: defaults.country,
        baseCurrency: defaults.baseCurrency,
        timezone: defaults.timezone,
        vatRegNumber: defaults.vatRegNumber,
        vatRate: defaults.vatRate ? Number(defaults.vatRate) : null,
        fiscalYearStart: defaults.fiscalYearStart,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load i18n settings",
    };
  }
}

// ── Update language settings ────────────────────────────────────────────────

export async function updateOrgLanguageSettings(input: {
  defaultLanguage: string;
  defaultDocLanguage: string;
}): Promise<ActionResult> {
  try {
    const { orgId } = await requireRole("admin");

    const allowed = await checkFeature(orgId, "multiCurrency");
    if (!allowed) {
      return {
        success: false,
        error: "Multi-language support requires an upgraded plan.",
      };
    }

    await db.orgDefaults.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        defaultLanguage: input.defaultLanguage,
        defaultDocLanguage: input.defaultDocLanguage,
      },
      update: {
        defaultLanguage: input.defaultLanguage,
        defaultDocLanguage: input.defaultDocLanguage,
      },
    });

    revalidatePath("/app/settings/i18n");
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update language settings",
    };
  }
}

// ── Update country / currency / tax settings ────────────────────────────────

export async function updateOrgCountrySettings(input: {
  country: string;
  baseCurrency: string;
  timezone: string;
  vatRegNumber?: string;
  vatRate?: number;
  fiscalYearStart?: number;
}): Promise<ActionResult> {
  try {
    const { orgId } = await requireRole("admin");

    const allowed = await checkFeature(orgId, "multiCurrency");
    if (!allowed) {
      return {
        success: false,
        error: "Multi-currency support requires an upgraded plan.",
      };
    }

    const data = {
      country: input.country,
      baseCurrency: input.baseCurrency,
      timezone: input.timezone,
      vatRegNumber: input.vatRegNumber ?? null,
      vatRate: input.vatRate ?? null,
      fiscalYearStart: input.fiscalYearStart ?? 4,
    };

    await db.orgDefaults.upsert({
      where: { organizationId: orgId },
      create: { organizationId: orgId, ...data },
      update: data,
    });

    revalidatePath("/app/settings/i18n");
    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update country settings",
    };
  }
}

// ── Update customer preferred language ──────────────────────────────────────

export async function updateCustomerLanguage(
  customerId: string,
  preferredLanguage: string,
): Promise<ActionResult> {
  try {
    const { orgId } = await requireRole("admin");

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { organizationId: true },
    });

    if (!customer || customer.organizationId !== orgId) {
      return { success: false, error: "Customer not found" };
    }

    await db.customer.update({
      where: { id: customerId },
      data: { preferredLanguage },
    });

    return { success: true, data: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update customer language",
    };
  }
}
