import type { PlanId } from "@/lib/plans/config";
import type { PdfStudioConversionFailureCode } from "@/features/docs/pdf-studio/lib/conversion-errors";
import type { PdfStudioConversionHistoryEntry } from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { PDF_STUDIO_CONVERSION_ACTIVE_JOB_LIMIT } from "@/features/docs/pdf-studio/lib/server-conversion-policy";
import {
  getPdfStudioHistoryEntryLimit,
  getPdfStudioRetentionLabel,
} from "@/features/docs/pdf-studio/lib/plan-gates";
import { getPdfStudioTool } from "@/features/docs/pdf-studio/lib/tool-registry";

type PdfStudioReadinessStatus = "pass" | "warn" | "fail";

export type PdfStudioReadinessItem = {
  id: string;
  label: string;
  description: string;
  status: PdfStudioReadinessStatus;
  actionHref?: string;
  actionLabel?: string;
};

export type PdfStudioSupportDiagnostics = {
  historyWindow: number;
  queueDepth: number;
  activeJobLimit: number;
  totalJobs: number;
  failedJobs: number;
  retryingJobs: number;
  processingJobs: number;
  successRate: number | null;
  topFailureCodes: Array<{
    code: PdfStudioConversionFailureCode;
    label: string;
    count: number;
    helpHref: string;
  }>;
  recentIssues: Array<
    PdfStudioConversionHistoryEntry & {
      toolTitle: string;
      helpHref: string;
      recoveryHint: string;
    }
  >;
};

export function getPdfStudioFailureHelpHref(
  code?: PdfStudioConversionFailureCode,
) {
  return code
    ? `/help/troubleshooting/pdf-studio-jobs#${code}`
    : "/help/troubleshooting/pdf-studio-jobs";
}

export function getPdfStudioFailureLabel(
  code?: PdfStudioConversionFailureCode,
) {
  switch (code) {
    case "feature_not_available":
      return "Feature not available";
    case "rate_limited":
      return "Rate limited";
    case "too_many_active_jobs":
      return "Too many active jobs";
    case "unsupported_input":
      return "Unsupported input";
    case "file_too_large":
      return "File too large";
    case "page_limit_exceeded":
      return "Page limit exceeded";
    case "password_protected":
      return "Password protected";
    case "malformed_pdf":
      return "Malformed PDF";
    case "malformed_docx":
      return "Malformed DOCX";
    case "html_remote_disabled":
      return "Remote HTML blocked";
    case "html_asset_blocked":
      return "Blocked HTML asset";
    case "html_render_timeout":
      return "HTML render timeout";
    case "storage_error":
      return "Storage error";
    case "conversion_failed":
      return "Conversion failed";
    default:
      return "Unknown failure";
  }
}

export function getPdfStudioFailureRecoveryHint(
  code?: PdfStudioConversionFailureCode,
) {
  switch (code) {
    case "feature_not_available":
      return "Check the active plan and reopen the tool from the workspace lane.";
    case "rate_limited":
    case "too_many_active_jobs":
      return "Wait for the queue to settle, then retry with the same job ID.";
    case "unsupported_input":
    case "file_too_large":
    case "page_limit_exceeded":
      return "Adjust the source file to match the supported size and page limits.";
    case "password_protected":
      return "Unlock the source file first, then rerun the conversion.";
    case "malformed_pdf":
    case "malformed_docx":
      return "Repair or re-export the source file before retrying the job.";
    case "html_remote_disabled":
    case "html_asset_blocked":
      return "Inline the required assets and keep HTML exports self-contained.";
    case "html_render_timeout":
      return "Reduce page complexity or split the input before retrying.";
    case "storage_error":
      return "Retry once. If it fails again, escalate with the job ID and failure code.";
    case "conversion_failed":
    default:
      return "Open the recovery guide, keep the job ID, and escalate with the failure code if the retry fails.";
  }
}

export function buildPdfStudioSupportDiagnostics(params: {
  entries: PdfStudioConversionHistoryEntry[];
  historyWindow: number;
  queueDepth: number;
}) {
  const failedJobs = params.entries.filter(
    (entry) => entry.status === "dead_letter",
  );
  const retryingJobs = params.entries.filter(
    (entry) => entry.status === "retry_pending",
  );
  const processingJobs = params.entries.filter(
    (entry) => entry.status === "processing" || entry.status === "pending",
  );
  const completedJobs = params.entries.filter(
    (entry) => entry.status === "completed",
  );
  const settledJobs = completedJobs.length + failedJobs.length;
  const successRate =
    settledJobs > 0 ? Math.round((completedJobs.length / settledJobs) * 100) : null;

  const failureCounts = new Map<PdfStudioConversionFailureCode, number>();
  for (const entry of failedJobs) {
    if (!entry.failureCode) {
      continue;
    }
    failureCounts.set(
      entry.failureCode,
      (failureCounts.get(entry.failureCode) ?? 0) + 1,
    );
  }

  return {
    historyWindow: params.historyWindow,
    queueDepth: params.queueDepth,
    activeJobLimit: PDF_STUDIO_CONVERSION_ACTIVE_JOB_LIMIT,
    totalJobs: params.entries.length,
    failedJobs: failedJobs.length,
    retryingJobs: retryingJobs.length,
    processingJobs: processingJobs.length,
    successRate,
    topFailureCodes: [...failureCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([code, count]) => ({
        code,
        label: getPdfStudioFailureLabel(code),
        count,
        helpHref: getPdfStudioFailureHelpHref(code),
      })),
    recentIssues: params.entries
      .filter(
        (entry) =>
          entry.status === "dead_letter" || entry.status === "retry_pending",
      )
      .slice(0, 8)
      .map((entry) => ({
        ...entry,
        toolTitle: getPdfStudioTool(entry.toolId).title,
        helpHref: getPdfStudioFailureHelpHref(entry.failureCode),
        recoveryHint: getPdfStudioFailureRecoveryHint(entry.failureCode),
      })),
  } satisfies PdfStudioSupportDiagnostics;
}

export function buildPdfStudioReadinessChecklist(params: {
  featureEnabled: boolean;
  planId: PlanId;
  diagnostics: PdfStudioSupportDiagnostics;
}) {
  const queueStatus: PdfStudioReadinessStatus =
    params.diagnostics.queueDepth >= params.diagnostics.activeJobLimit
      ? "fail"
      : params.diagnostics.queueDepth >=
          Math.max(params.diagnostics.activeJobLimit - 1, 2)
        ? "warn"
        : "pass";

  const items: PdfStudioReadinessItem[] = [
    {
      id: "pdf-studio-access",
      label: "PDF Studio workspace access enabled",
      description: params.featureEnabled
        ? "This organization can open the PDF Studio workspace and keep tracked job history."
        : "PDF Studio tools are not enabled for this organization yet.",
      status: params.featureEnabled ? "pass" : "fail",
      actionHref: params.featureEnabled ? "/app/docs/pdf-studio" : "/pricing",
      actionLabel: params.featureEnabled ? "Open workspace" : "Review plans",
    },
    {
      id: "plan-window",
      label: "History and retention window known",
      description: `The active plan keeps ${getPdfStudioHistoryEntryLimit(
        params.planId,
      )} tracked jobs and ${getPdfStudioRetentionLabel(params.planId)} download retention in view for support.`,
      status:
        params.planId === "pro" || params.planId === "enterprise"
          ? "pass"
          : "warn",
      actionHref:
        params.planId === "starter" ? "/pricing" : "/app/docs/pdf-studio",
      actionLabel:
        params.planId === "starter" ? "Upgrade for longer windows" : "Review hub",
    },
    {
      id: "queue-headroom",
      label: "Processing queue has headroom",
      description: `${params.diagnostics.queueDepth} of ${params.diagnostics.activeJobLimit} active processing slots are in use right now.`,
      status: queueStatus,
      actionHref: "/app/docs/pdf-studio/readiness",
      actionLabel: "Review diagnostics",
    },
    {
      id: "recovery-paths",
      label: "Recovery paths are available for recent failures",
      description:
        params.diagnostics.failedJobs > 0
          ? `${params.diagnostics.failedJobs} failed jobs are visible in the current history window with job IDs, failure codes, and troubleshooting links.`
          : "No failed jobs are visible in the current history window, and the troubleshooting guide is ready if one appears.",
      status: params.diagnostics.failedJobs > 0 ? "warn" : "pass",
      actionHref: "/help/troubleshooting/pdf-studio-jobs",
      actionLabel: "Open troubleshooting guide",
    },
  ];

  return items;
}

