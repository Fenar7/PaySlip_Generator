"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { useActiveOrg } from "@/hooks/use-active-org";
import { usePlan } from "@/hooks/use-plan";
import { PdfStudioUpgradeNotice } from "@/features/docs/pdf-studio/components/pdf-studio-upgrade-notice";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import {
  buildPdfStudioAcceptString,
  buildPdfStudioUploadSummary,
} from "@/features/docs/pdf-studio/lib/ingestion";
import {
  getPdfStudioHistoryEntryLimit,
  getPdfStudioRetentionMessaging,
  getPdfStudioToolUpgradeCopy,
  getPdfStudioWorkspaceMinimumPlan,
} from "@/features/docs/pdf-studio/lib/plan-gates";
import {
  derivePdfStudioRecoveryState,
  getPdfStudioFailureHelpHref,
  getPdfStudioFailureLabel,
  getPdfStudioFailureRecoveryHint,
} from "@/features/docs/pdf-studio/lib/support";
import { getPdfStudioTool } from "@/features/docs/pdf-studio/lib/tool-registry";
import type { PdfStudioConversionFailureCode } from "@/features/docs/pdf-studio/lib/conversion-errors";
import type {
  PdfStudioConversionJobStatus,
  PdfStudioToolId,
} from "@/features/docs/pdf-studio/types";

type ConversionOutputResponse = {
  index: number;
  sourceFileName: string;
  outputFileName: string;
  downloadUrl?: string;
};

type ConversionStatusResponse = {
  jobId: string;
  status: PdfStudioConversionJobStatus;
  downloadUrl?: string;
  outputFileName?: string;
  bundleDownloadPath?: string;
  outputs?: ConversionOutputResponse[];
  error?: string;
  failureCode?: PdfStudioConversionFailureCode;
  attempts?: number;
  totalItems?: number;
  completedItems?: number;
  failedItems?: number;
  canRetry?: boolean;
  sourceAvailable?: boolean;
  nextRetryAt?: string;
};

type ConversionHistoryEntry = {
  jobId: string;
  status: PdfStudioConversionJobStatus;
  createdAt: string;
  completedAt?: string;
  attempts: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  sourceLabel: string;
  error?: string;
  failureCode?: PdfStudioConversionFailureCode;
  canRetry: boolean;
  sourceAvailable: boolean;
  bundleAvailable: boolean;
  nextRetryAt?: string;
};

type ConversionHistoryResponse = {
  items?: ConversionHistoryEntry[];
  meta?: {
    historyLimit?: number;
  };
};

function formatJobStatus(status: PdfStudioConversionJobStatus) {
  switch (status) {
    case "pending":
      return "Queued";
    case "processing":
      return "Processing";
    case "retry_pending":
      return "Retry queued";
    case "completed":
      return "Completed";
    case "dead_letter":
      return "Failed";
  }
}

export function ServerConversionWorkspace(props: {
  toolId: PdfStudioToolId;
  title: string;
  description: string;
  targetFormat: "docx" | "xlsx" | "pptx" | "pdf";
  notice: string;
}) {
  const analytics = usePdfStudioAnalytics(props.toolId);
  const { activeOrg } = useActiveOrg();
  const { plan, loading: planLoading } = usePlan(activeOrg?.id);
  const tool = useMemo(() => getPdfStudioTool(props.toolId), [props.toolId]);
  const accept = useMemo(() => buildPdfStudioAcceptString(props.toolId), [props.toolId]);
  const requiredPlan = useMemo(
    () => getPdfStudioWorkspaceMinimumPlan(props.toolId),
    [props.toolId],
  );
  const historyLimit = useMemo(
    () => getPdfStudioHistoryEntryLimit(plan?.planId ?? "starter"),
    [plan?.planId],
  );
  const retentionMessaging = useMemo(
    () => getPdfStudioRetentionMessaging(plan?.planId ?? "starter"),
    [plan?.planId],
  );
  const [files, setFiles] = useState<File[]>([]);
  const [job, setJob] = useState<ConversionStatusResponse | null>(null);
  const [history, setHistory] = useState<ConversionHistoryEntry[]>([]);
  const [historyWindow, setHistoryWindow] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!activeOrg?.id || historyLimit === 0) {
      setHistory([]);
      setHistoryWindow(0);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    try {
      const response = await fetch(
        `/api/pdf-studio/conversions/history?toolId=${props.toolId}&limit=${historyLimit}`,
        {
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error("Could not load recent PDF Studio jobs.");
      }
      const payload = (await response.json()) as ConversionHistoryResponse;
      setHistory(payload.items ?? []);
      setHistoryWindow(payload.meta?.historyLimit ?? historyLimit);
    } catch (historyError) {
      console.error(historyError);
    } finally {
      setHistoryLoading(false);
    }
  }, [activeOrg?.id, historyLimit, props.toolId]);

  const refreshJob = useCallback(
    async (jobId: string) => {
      const response = await fetch(`/api/pdf-studio/conversions/${jobId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Could not load the conversion job.");
      }

      const nextJob = (await response.json()) as ConversionStatusResponse;
      setJob((previousJob) => {
        if (
          nextJob.status === "completed" &&
          previousJob?.status !== "completed"
        ) {
          analytics.trackSuccess({
            outputKind: props.targetFormat,
            batchMode: (nextJob.totalItems ?? 1) > 1,
            totalItems: nextJob.totalItems ?? 1,
          });
        }

        if (
          nextJob.status === "dead_letter" &&
          previousJob?.status !== "dead_letter"
        ) {
          analytics.trackFail({ stage: "process", reason: "processing-failed" });
        }

        return nextJob;
      });

      return nextJob;
    },
    [analytics, props.targetFormat],
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (
      !job ||
      (job.status !== "pending" &&
        job.status !== "processing" &&
        job.status !== "retry_pending")
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const nextJob = await refreshJob(job.jobId);
        if (
          nextJob.status === "completed" ||
          nextJob.status === "dead_letter"
        ) {
          void loadHistory();
        }
      } catch (pollError) {
        console.error(pollError);
      }
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [job, loadHistory, refreshJob]);

  async function handleStart() {
    if (files.length === 0) {
      setError("Upload a supported file before starting the conversion.");
      return;
    }

    setSubmitting(true);
    setError(null);
    analytics.trackStart({
      requiresProcessing: true,
      batchMode: files.length > 1,
      totalItems: files.length,
      targetFormat: props.targetFormat,
    });

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append(files.length > 1 ? "files" : "file", file, file.name);
      }
      formData.append("toolId", props.toolId);
      formData.append("targetFormat", props.targetFormat);

      const response = await fetch("/api/pdf-studio/conversions", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ConversionStatusResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not create the conversion job.");
      }

      setJob(payload);
      void loadHistory();
    } catch (jobError) {
      const message =
        jobError instanceof Error
          ? jobError.message
          : "Could not start the conversion job.";
      setError(message);
      analytics.trackFail({ stage: "process", reason: "processing-failed" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResume(jobId: string) {
    setLoadingJobId(jobId);
    setError(null);
    try {
      await refreshJob(jobId);
    } catch (resumeError) {
      setError(
        resumeError instanceof Error
          ? resumeError.message
          : "Could not resume the conversion job.",
      );
    } finally {
      setLoadingJobId(null);
    }
  }

  async function handleRetry(jobId: string) {
    setRetryingJobId(jobId);
    setError(null);
    try {
      const response = await fetch(`/api/pdf-studio/conversions/${jobId}/retry`, {
        method: "POST",
      });
      const payload = (await response.json()) as ConversionStatusResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not retry the conversion job.");
      }
      setJob(payload);
      void loadHistory();
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "Could not retry the conversion job.",
      );
    } finally {
      setRetryingJobId(null);
    }
  }

  const fileCountLabel =
    files.length === 0
      ? "No files selected"
      : files.length === 1
        ? files[0]?.name ?? "1 file selected"
        : `${files.length} files selected`;
  const planLocked =
    !planLoading &&
    requiredPlan === "pro" &&
    plan != null &&
    plan.planId !== "pro" &&
    plan.planId !== "enterprise";

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">
          {props.title}
        </h1>
        <p className="mt-2 text-sm text-[#666]">{props.description}</p>
      </div>

      {planLocked ? (
        <PdfStudioUpgradeNotice
          toolId={props.toolId}
          surface="workspace"
          requiredPlan="pro"
          title={`${props.title} needs the Pro workspace lane`}
          description={getPdfStudioToolUpgradeCopy(props.toolId)}
          ctaLabel="Upgrade to Pro"
          ctaHref="/pricing"
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#666]">{buildPdfStudioUploadSummary(props.toolId)}</p>

          <label className="block rounded-xl border border-dashed border-[#d4d4d4] px-4 py-6 text-center text-sm text-[#1a1a1a]">
            <span className="font-medium">
              {tool.limits.maxFiles > 1 ? "Choose one or more source files" : "Choose a source file"}
            </span>
            <input
              className="mt-3 block w-full text-xs text-[#666]"
              type="file"
              accept={accept}
              multiple={tool.limits.maxFiles > 1 && !planLocked}
              aria-label={`${props.title} source file upload`}
              disabled={planLocked}
              onChange={(event) => {
                const nextFiles = Array.from(event.target.files ?? []);
                setFiles(nextFiles);
                setError(null);
                if (nextFiles.length > 0) {
                  analytics.trackUpload({
                    batchMode: nextFiles.length > 1,
                    totalItems: nextFiles.length,
                    requiresProcessing: true,
                  });
                }
              }}
            />
          </label>

          <div className="rounded-xl bg-[#f5f5f5] px-4 py-3 text-sm text-[#1a1a1a]">
            <p className="font-medium">{fileCountLabel}</p>
            {files.length > 1 ? (
              <ul className="mt-2 space-y-1 text-xs text-[#666]">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`}>{file.name}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {props.notice}
            {tool.limits.maxFiles > 1 ? (
              <p className="mt-2 text-xs text-amber-900/90">
                Batch mode queues multiple source files as one tracked job and keeps the same job ID through automatic retries.
              </p>
            ) : null}
            <p className="mt-2 text-xs text-amber-900/90">
              {retentionMessaging.planNotice}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <p className="font-medium text-gray-900">Need recovery help?</p>
            <p className="mt-1">
              Keep the job ID, then use the PDF Studio troubleshooting guide or
              workspace readiness page before escalating a failed conversion.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
              <Link
                href="/help/troubleshooting/pdf-studio-jobs"
                className="text-blue-600 hover:underline"
              >
                Open troubleshooting guide
              </Link>
              <Link
                href="/app/docs/pdf-studio/readiness"
                className="text-blue-600 hover:underline"
              >
                Open readiness &amp; diagnostics
              </Link>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleStart()} disabled={submitting || planLocked}>
              {submitting
                ? "Queuing…"
                : files.length > 1
                  ? "Start batch"
                  : "Start conversion"}
            </Button>
            {files.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFiles([])}
                disabled={submitting || planLocked}
              >
                Clear files
              </Button>
            ) : null}
          </div>

          {job ? (
            <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#1a1a1a]">
                    Job status: {formatJobStatus(job.status)}
                  </p>
                  <p className="mt-1 text-xs text-[#666]">Job ID: {job.jobId}</p>
                </div>
                <div className="text-xs text-[#666]">
                  {(job.completedItems ?? 0)}/{job.totalItems ?? 1} outputs ready
                </div>
              </div>

              {(() => {
                const recovery = derivePdfStudioRecoveryState({
                  status: job.status,
                  canRetry: job.canRetry ?? false,
                  sourceAvailable: job.sourceAvailable ?? false,
                });
                if (!recovery) return null;
                return (
                  <p className={`mt-3 text-sm ${recovery.tone === "warning" ? "text-[#7a5d00]" : "text-red-700"}`}>
                    {recovery.label}
                    {job.nextRetryAt ? ` • ${new Date(job.nextRetryAt).toLocaleString()}` : ""}
                  </p>
                );
              })()}

              {job.error ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-red-700">{job.error}</p>
                  {job.failureCode ? (
                    <p className="text-xs font-medium text-red-700">
                      Failure code: {getPdfStudioFailureLabel(job.failureCode)}
                    </p>
                  ) : null}
                  <p className="text-xs text-[#666]">
                    {getPdfStudioFailureRecoveryHint(job.failureCode)}
                  </p>
                  {job.status === "dead_letter" && !job.sourceAvailable ? (
                    <p className="text-xs text-[#666]">
                      The original source file was removed or expired. Re-upload it and start a new conversion.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-3 text-xs font-medium">
                    <Link
                      href={getPdfStudioFailureHelpHref(job.failureCode)}
                      className="text-blue-600 hover:underline"
                    >
                      Open recovery guide
                    </Link>
                    <Link
                      href="/app/docs/pdf-studio/readiness"
                      className="text-blue-600 hover:underline"
                    >
                      Open readiness &amp; diagnostics
                    </Link>
                  </div>
                </div>
              ) : null}

              {job.downloadUrl && job.outputFileName ? (
                <a
                  href={job.downloadUrl}
                  className="mt-3 inline-flex items-center rounded-full border border-[#d4d4d4] px-4 py-2 text-sm font-medium text-[#1a1a1a]"
                >
                  Download {job.outputFileName}
                </a>
              ) : null}

              {job.bundleDownloadPath ? (
                <a
                  href={job.bundleDownloadPath}
                  className="mt-3 inline-flex items-center rounded-full border border-[#d4d4d4] px-4 py-2 text-sm font-medium text-[#1a1a1a]"
                >
                  Download output bundle
                </a>
              ) : null}

              {job.outputs && job.outputs.length > 1 ? (
                <ul className="mt-4 space-y-2 text-sm text-[#1a1a1a]">
                  {job.outputs.map((output) => (
                    <li
                      key={`${job.jobId}-${output.index}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ececec] bg-white px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">{output.outputFileName}</p>
                        <p className="text-xs text-[#666]">{output.sourceFileName}</p>
                      </div>
                      {output.downloadUrl ? (
                        <a
                          href={output.downloadUrl}
                          className="text-xs font-medium text-[#1a1a1a] underline underline-offset-2"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-[#666]">Pending</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}

              {(job.downloadUrl || job.bundleDownloadPath) ? (
                <p className="mt-3 text-xs text-[#666]">
                  {retentionMessaging.completionNotice}
                </p>
              ) : (
                <p className="mt-3 text-sm text-[#666]">
                  Queued and retrying jobs stay resumable from the history panel below.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-[#1a1a1a]">Recent jobs</h2>
            <p className="mt-1 text-sm text-[#666]">
              {historyWindow > 0
                ? `Resume active jobs, review failures, and reopen completed results from the last ${historyWindow} tracked jobs for this tool.`
                : "Resume active jobs, review failures, and reopen completed results for this tool."}
            </p>
          </div>

          {historyLoading ? (
            <p className="text-sm text-[#666]">Loading recent jobs…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-[#666]">
              No recent jobs yet. Start a conversion to build history for this workspace.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.jobId}
                  className="rounded-xl border border-[#ececec] bg-[#fafafa] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#1a1a1a]">
                        {entry.sourceLabel}
                      </p>
                      <p className="mt-1 text-xs text-[#666]">
                        {formatJobStatus(entry.status)} • {entry.completedItems}/{entry.totalItems} ready
                      </p>
                    </div>
                    <span className="text-[11px] text-[#666]">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {(() => {
                    const recovery = derivePdfStudioRecoveryState({
                      status: entry.status,
                      canRetry: entry.canRetry,
                      sourceAvailable: entry.sourceAvailable,
                    });
                    if (!recovery) return null;
                    return (
                      <p className={`mt-2 text-xs ${recovery.tone === "warning" ? "text-[#7a5d00]" : "text-red-700"}`}>
                        {recovery.label}
                        {entry.nextRetryAt ? ` • ${new Date(entry.nextRetryAt).toLocaleString()}` : ""}
                      </p>
                    );
                  })()}

                  {entry.error ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-red-700">{entry.error}</p>
                      {entry.failureCode ? (
                        <p className="text-[11px] font-medium text-red-700">
                          Failure code: {getPdfStudioFailureLabel(entry.failureCode)}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-[#666]">
                        {getPdfStudioFailureRecoveryHint(entry.failureCode)}
                      </p>
                      {entry.status === "dead_letter" && !entry.sourceAvailable ? (
                        <p className="text-[11px] text-[#666]">
                          The original source file was removed or expired. Re-upload it and start a new conversion.
                        </p>
                      ) : null}
                      <Link
                        href={getPdfStudioFailureHelpHref(entry.failureCode)}
                        className="inline-flex text-[11px] font-medium text-blue-600 hover:underline"
                      >
                        Open recovery guide
                      </Link>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      aria-label={`Resume PDF Studio job ${entry.jobId}`}
                      onClick={() => void handleResume(entry.jobId)}
                      disabled={loadingJobId === entry.jobId}
                    >
                      {loadingJobId === entry.jobId
                        ? "Loading…"
                        : entry.status === "completed"
                          ? "Open result"
                          : "Resume"}
                    </Button>
                    {entry.canRetry ? (
                      <Button
                        type="button"
                        size="sm"
                        aria-label={`Retry PDF Studio job ${entry.jobId}`}
                        onClick={() => void handleRetry(entry.jobId)}
                        disabled={retryingJobId === entry.jobId}
                      >
                        {retryingJobId === entry.jobId ? "Retrying…" : "Retry"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
