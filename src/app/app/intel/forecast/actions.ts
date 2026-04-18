"use server";

import { requireOrgContext, requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { generateForecast, getLatestForecast } from "@/lib/intel/forecast";
import type { ForecastResult } from "@/lib/intel/forecast";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Load the latest persisted forecast for the current org.
 * Read-only — available to all members on starter+ plans.
 */
export async function getForecastData(): Promise<ActionResult<ForecastResult | null>> {
  try {
    const { orgId } = await requireOrgContext();
    await checkFeature(orgId, "forecastBasic");
    const data = await getLatestForecast(orgId);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load forecast" };
  }
}

/**
 * Regenerate the forecast. Admin-only write operation.
 * horizonMonths is capped: starter=1 (30-day), pro/enterprise=3 (90-day).
 */
export async function regenerateForecastAction(
  horizonMonths?: number,
): Promise<ActionResult<ForecastResult>> {
  try {
    const { orgId } = await requireRole("admin");
    await checkFeature(orgId, "forecastBasic");

    // Determine max horizon based on plan
    let maxHorizon = 1;
    try {
      await checkFeature(orgId, "forecastPro");
      maxHorizon = 3;
    } catch {
      // forecastPro not available — cap at 1
    }

    const horizon = Math.min(horizonMonths ?? maxHorizon, maxHorizon);
    const includeAnomalies = maxHorizon >= 3; // anomalies only for pro+

    const data = await generateForecast(orgId, horizon, "MANUAL", includeAnomalies);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to generate forecast" };
  }
}
