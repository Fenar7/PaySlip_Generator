"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import {
  getAgingBuckets,
  getAtRiskCustomers,
  getPaymentRecoveryMetrics,
  getGatewayMetrics,
  type AgingReport,
  type AtRiskCustomer,
  type RecoveryMetrics,
  type GatewayMetrics,
} from "@/lib/pay/collections-intelligence";
import { revalidatePath } from "next/cache";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Aging Analysis ───────────────────────────────────────────────────────────

export async function getAgingBucketsAction(): Promise<ActionResult<AgingReport>> {
  try {
    const { orgId } = await requireOrgContext();
    const report = await getAgingBuckets(orgId);
    return { success: true, data: report };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load aging data" };
  }
}

// ─── At-Risk Customers ────────────────────────────────────────────────────────

export async function getAtRiskCustomersAction(): Promise<ActionResult<AtRiskCustomer[]>> {
  try {
    const { orgId } = await requireOrgContext();
    const customers = await getAtRiskCustomers(orgId);
    return { success: true, data: customers };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load at-risk customers" };
  }
}

// ─── Recovery Metrics ─────────────────────────────────────────────────────────

export async function getRecoveryMetricsAction(months = 6): Promise<ActionResult<RecoveryMetrics>> {
  try {
    const { orgId } = await requireOrgContext();
    const metrics = await getPaymentRecoveryMetrics(orgId, months);
    return { success: true, data: metrics };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load recovery metrics" };
  }
}

// ─── Gateway Metrics ──────────────────────────────────────────────────────────

export async function getGatewayMetricsAction(periodDays = 30): Promise<ActionResult<GatewayMetrics>> {
  try {
    const { orgId } = await requireOrgContext();
    const metrics = await getGatewayMetrics(orgId, periodDays);
    return { success: true, data: metrics };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load gateway metrics" };
  }
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

/** Send a dunning reminder for invoices in a specific aging bucket. */
export async function sendBulkReminderForBucketAction(
  invoiceIds: string[]
): Promise<ActionResult<{ queued: number }>> {
  try {
    const { orgId } = await requireOrgContext();
    if (!invoiceIds.length) return { success: true, data: { queued: 0 } };

    // Validate all invoices belong to this org before queuing
    const count = await db.invoice.count({
      where: { id: { in: invoiceIds }, organizationId: orgId },
    });
    if (count !== invoiceIds.length) {
      return { success: false, error: "One or more invoices do not belong to this organisation" };
    }

    // Mark invoices as DUE to trigger dunning on the next cron run
    await db.invoice.updateMany({
      where: {
        id: { in: invoiceIds },
        organizationId: orgId,
        dunningEnabled: true,
        dunningPausedUntil: null,
      },
      data: { status: "DUE" },
    });

    revalidatePath("/app/pay/collections-intelligence");
    return { success: true, data: { queued: count } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to queue reminders" };
  }
}
