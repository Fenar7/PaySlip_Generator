"use server";

import { requireOrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import {
  getCashFlowSnapshot,
  getAgingReport,
  getCustomerHealthSummary,
  getCashFlowForecast,
  calculateDSO,
} from "@/lib/cash-flow";
import type {
  CashFlowSnapshot,
  AgingBucket,
  CustomerHealthSummary,
  MonthForecast,
  DSOResult,
} from "@/lib/cash-flow";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── 1. Full Cash Flow Data ─────────────────────────────────────────────────

export async function getCashFlowData(): Promise<
  ActionResult<{
    snapshot: CashFlowSnapshot;
    dso: DSOResult;
    aging: AgingBucket[];
    forecast: MonthForecast[];
  }>
> {
  try {
    const { orgId } = await requireOrgContext();

    const hasFeature = await checkFeature(orgId, "cashFlowForecast");
    if (!hasFeature) {
      return {
        success: false,
        error: "Cash flow intelligence requires the Pro plan or higher",
      };
    }

    const [snapshot, dso, aging, forecast] = await Promise.all([
      getCashFlowSnapshot(orgId),
      calculateDSO(orgId),
      getAgingReport(orgId),
      getCashFlowForecast(orgId),
    ]);

    return { success: true, data: { snapshot, dso, aging, forecast } };
  } catch (error) {
    console.error("getCashFlowData error:", error);
    return { success: false, error: "Failed to load cash flow data" };
  }
}

// ─── 2. Aging Data ──────────────────────────────────────────────────────────

export async function getAgingData(): Promise<ActionResult<AgingBucket[]>> {
  try {
    const { orgId } = await requireOrgContext();
    const aging = await getAgingReport(orgId);
    return { success: true, data: aging };
  } catch (error) {
    console.error("getAgingData error:", error);
    return { success: false, error: "Failed to load aging report" };
  }
}

// ─── 3. Health Data ─────────────────────────────────────────────────────────

export async function getHealthData(): Promise<ActionResult<CustomerHealthSummary>> {
  try {
    const { orgId } = await requireOrgContext();

    const hasFeature = await checkFeature(orgId, "customerHealthScores");
    if (!hasFeature) {
      return {
        success: false,
        error: "Customer health scores require the Pro plan or higher",
      };
    }

    const summary = await getCustomerHealthSummary(orgId);
    return { success: true, data: summary };
  } catch (error) {
    console.error("getHealthData error:", error);
    return { success: false, error: "Failed to load health data" };
  }
}
