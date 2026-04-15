"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  GstFilingReconciliationStatus,
  GstFilingRunStatus,
} from "@/generated/prisma/client";
import { requireOrgContext, requireRole } from "@/lib/auth";
import {
  createGstFilingRun,
  getGstFilingRunDetail,
  listGstFilingRuns,
  recordGstFilingReconciliation,
  recordGstFilingSubmissionIntent,
  recordGstFilingSubmissionResult,
  validateGstFilingRun,
} from "@/lib/gst/filings";
import { checkFeature } from "@/lib/plans/enforcement";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

const GST_FILING_RUN_STATUSES: GstFilingRunStatus[] = [
  "DRAFT",
  "BLOCKED",
  "READY",
  "SUBMISSION_PENDING",
  "RECONCILING",
  "RECONCILED",
  "FAILED",
];

const GST_RECONCILIATION_STATUSES: GstFilingReconciliationStatus[] = [
  "MATCHED",
  "VARIANCE",
  "ACTION_REQUIRED",
];

function currentPeriodMonth() {
  return new Date().toISOString().slice(0, 7);
}

function withFlash(path: string, key: "message" | "error", value: string) {
  const url = new URL(path, "https://slipwise.local");
  url.searchParams.set(key, value);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function parseRunStatus(value: string | undefined): GstFilingRunStatus | undefined {
  if (!value) return undefined;
  return GST_FILING_RUN_STATUSES.includes(value as GstFilingRunStatus)
    ? (value as GstFilingRunStatus)
    : undefined;
}

function parseReconciliationStatus(
  value: string | undefined,
): GstFilingReconciliationStatus {
  if (!value || !GST_RECONCILIATION_STATUSES.includes(value as GstFilingReconciliationStatus)) {
    throw new Error("Invalid reconciliation status.");
  }

  return value as GstFilingReconciliationStatus;
}

async function requireGstReadAccess() {
  const context = await requireOrgContext();
  const allowed = await checkFeature(context.orgId, "gstrExport");
  if (!allowed) {
    throw new Error("GST filings require a Pro plan or above.");
  }

  return context;
}

async function requireGstWriteAccess() {
  const context = await requireRole("admin");
  const allowed = await checkFeature(context.orgId, "gstrExport");
  if (!allowed) {
    throw new Error("GST filings require a Pro plan or above.");
  }

  return context;
}

export async function getGstFilingWorkspace(input: {
  status?: string;
  periodMonth?: string;
}): Promise<
  ActionResult<{
    runs: Awaited<ReturnType<typeof listGstFilingRuns>>;
    stats: {
      totalRuns: number;
      readyRuns: number;
      blockedRuns: number;
      inFlightRuns: number;
      reconciledRuns: number;
    };
    filters: {
      status?: GstFilingRunStatus;
      periodMonth?: string;
    };
    currentPeriodMonth: string;
  }>
> {
  try {
    const context = await requireGstReadAccess();
    const status = parseRunStatus(input.status);
    const [runs, allRuns] = await Promise.all([
      listGstFilingRuns({
        orgId: context.orgId,
        status,
        periodMonth: input.periodMonth || undefined,
      }),
      listGstFilingRuns({
        orgId: context.orgId,
      }),
    ]);

    return {
      success: true,
      data: {
        runs,
        stats: {
          totalRuns: allRuns.length,
          readyRuns: allRuns.filter((run) => run.status === "READY").length,
          blockedRuns: allRuns.filter((run) => run.status === "BLOCKED").length,
          inFlightRuns: allRuns.filter((run) =>
            ["SUBMISSION_PENDING", "RECONCILING"].includes(run.status),
          ).length,
          reconciledRuns: allRuns.filter((run) => run.status === "RECONCILED").length,
        },
        filters: {
          status,
          periodMonth: input.periodMonth || undefined,
        },
        currentPeriodMonth: currentPeriodMonth(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load GST filing workspace.",
    };
  }
}

export async function getGstFilingRunPage(
  runId: string,
): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof getGstFilingRunDetail>>>>> {
  try {
    const context = await requireGstReadAccess();
    const detail = await getGstFilingRunDetail({
      orgId: context.orgId,
      runId,
    });

    if (!detail) {
      return { success: false, error: "GST filing run not found." };
    }

    return { success: true, data: detail };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load GST filing run.",
    };
  }
}

export async function createGstFilingRunAction(formData: FormData) {
  const context = await requireGstWriteAccess();
  const periodMonth = String(formData.get("periodMonth") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  let redirectTarget: string;
  try {
    const run = await createGstFilingRun({
      orgId: context.orgId,
      actorId: context.userId,
      periodMonth,
      note,
    });

    revalidatePath("/app/intel/gst-filings");
    redirectTarget = withFlash(
      `/app/intel/gst-filings/${run.id}`,
      "message",
      "GST filing run created.",
    );
  } catch (error) {
    redirectTarget = withFlash(
      "/app/intel/gst-filings",
      "error",
      error instanceof Error ? error.message : "Failed to create GST filing run.",
    );
  }

  redirect(redirectTarget);
}

export async function validateGstFilingRunAction(formData: FormData) {
  const context = await requireGstWriteAccess();
  const runId = String(formData.get("runId") ?? "").trim();

  let redirectTarget: string;
  try {
    await validateGstFilingRun({
      orgId: context.orgId,
      actorId: context.userId,
      runId,
    });

    revalidatePath("/app/intel/gst-filings");
    revalidatePath(`/app/intel/gst-filings/${runId}`);
    redirectTarget = withFlash(
      `/app/intel/gst-filings/${runId}`,
      "message",
      "GST filing validation completed.",
    );
  } catch (error) {
    redirectTarget = withFlash(
      `/app/intel/gst-filings/${runId}`,
      "error",
      error instanceof Error ? error.message : "Failed to validate GST filing run.",
    );
  }

  redirect(redirectTarget);
}

export async function recordGstSubmissionIntentAction(formData: FormData) {
  const context = await requireGstWriteAccess();
  const runId = String(formData.get("runId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  let redirectTarget: string;
  try {
    await recordGstFilingSubmissionIntent({
      orgId: context.orgId,
      actorId: context.userId,
      runId,
      note,
    });

    revalidatePath("/app/intel/gst-filings");
    revalidatePath(`/app/intel/gst-filings/${runId}`);
    redirectTarget = withFlash(
      `/app/intel/gst-filings/${runId}`,
      "message",
      "Submission intent recorded.",
    );
  } catch (error) {
    redirectTarget = withFlash(
      `/app/intel/gst-filings/${runId}`,
      "error",
      error instanceof Error ? error.message : "Failed to record submission intent.",
    );
  }

  redirect(redirectTarget);
}

export async function recordGstSubmissionResultAction(formData: FormData) {
  const context = await requireGstWriteAccess();
  const runId = String(formData.get("runId") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();
  const externalReference = String(formData.get("externalReference") ?? "").trim();
  const acknowledgementNumber = String(formData.get("acknowledgementNumber") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const errorMessage = String(formData.get("errorMessage") ?? "").trim();

  let redirectTarget: string;
  try {
    await recordGstFilingSubmissionResult({
      orgId: context.orgId,
      actorId: context.userId,
      runId,
      outcome: outcome === "failed" ? "failed" : "submitted",
      externalReference,
      acknowledgementNumber,
      note,
      errorMessage,
    });

    revalidatePath("/app/intel/gst-filings");
    revalidatePath(`/app/intel/gst-filings/${runId}`);
    redirectTarget = withFlash(
      `/app/intel/gst-filings/${runId}`,
      "message",
      "Submission result recorded.",
    );
  } catch (error) {
    redirectTarget = withFlash(
      `/app/intel/gst-filings/${runId}`,
      "error",
      error instanceof Error ? error.message : "Failed to record submission result.",
    );
  }

  redirect(redirectTarget);
}

export async function recordGstReconciliationAction(formData: FormData) {
  const context = await requireGstWriteAccess();
  const runId = String(formData.get("runId") ?? "").trim();
  const status = parseReconciliationStatus(String(formData.get("status") ?? "").trim());
  const matchedCount = Number.parseInt(String(formData.get("matchedCount") ?? "0"), 10) || 0;
  const varianceCount = Number.parseInt(String(formData.get("varianceCount") ?? "0"), 10) || 0;
  const note = String(formData.get("note") ?? "").trim();

  let redirectTarget: string;
  try {
    await recordGstFilingReconciliation({
      orgId: context.orgId,
      actorId: context.userId,
      runId,
      status,
      matchedCount,
      varianceCount,
      note,
    });

    revalidatePath("/app/intel/gst-filings");
    revalidatePath(`/app/intel/gst-filings/${runId}`);
    redirectTarget = withFlash(
      `/app/intel/gst-filings/${runId}`,
      "message",
      "Reconciliation update recorded.",
    );
  } catch (error) {
    redirectTarget = withFlash(
      `/app/intel/gst-filings/${runId}`,
      "error",
      error instanceof Error ? error.message : "Failed to record reconciliation update.",
    );
  }

  redirect(redirectTarget);
}
