import { AlertCircle, CheckCircle, ExternalLink, XCircle } from "lucide-react";
import Link from "next/link";
import { requireOrgContext } from "@/lib/auth";
import { getOrgPlan, checkFeature } from "@/lib/plans/enforcement";
import {
  countActivePdfStudioConversionJobs,
  listPdfStudioConversionHistory,
} from "@/features/docs/pdf-studio/lib/conversion-jobs";
import { getPdfStudioHistoryEntryLimit } from "@/features/docs/pdf-studio/lib/plan-gates";
import {
  buildPdfStudioReadinessChecklist,
  buildPdfStudioSupportDiagnostics,
  getPdfStudioFailureLabel,
} from "@/features/docs/pdf-studio/lib/support";

export const metadata = {
  title: "PDF Studio Readiness – Slipwise",
};

const STATUS_ICON = {
  pass: <CheckCircle className="h-5 w-5 text-green-500" />,
  fail: <XCircle className="h-5 w-5 text-red-500" />,
  warn: <AlertCircle className="h-5 w-5 text-amber-500" />,
};

const STATUS_LABEL = {
  pass: { label: "Pass", className: "bg-green-50 text-green-700" },
  fail: { label: "Action required", className: "bg-red-50 text-red-700" },
  warn: { label: "Recommended", className: "bg-amber-50 text-amber-700" },
};

function MetricCard(props: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-gray-500">
        {props.label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{props.value}</p>
      <p className="mt-1 text-sm text-gray-500">{props.detail}</p>
    </div>
  );
}

export default async function PdfStudioReadinessPage() {
  const { orgId } = await requireOrgContext();
  const featureEnabled = await checkFeature(orgId, "pdfStudioTools");

  if (!featureEnabled) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-12">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            PDF Studio readiness
          </h1>
          <p className="mt-2 text-sm text-amber-900">
            This organization does not currently include PDF Studio workspace tools.
            Enable the feature first, then reopen this page to review queue health,
            recent failures, and support recovery paths.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
            >
              Review plans
            </Link>
            <Link
              href="/help/troubleshooting/pdf-studio-jobs"
              className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100"
            >
              Open troubleshooting guide
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const plan = await getOrgPlan(orgId);
  const historyWindow = getPdfStudioHistoryEntryLimit(plan.planId);
  const [queueDepth, history] = await Promise.all([
    countActivePdfStudioConversionJobs(orgId),
    listPdfStudioConversionHistory({ orgId, limit: historyWindow }),
  ]);

  const diagnostics = buildPdfStudioSupportDiagnostics({
    entries: history,
    historyWindow,
    queueDepth,
  });
  const checklist = buildPdfStudioReadinessChecklist({
    featureEnabled,
    planId: plan.planId,
    diagnostics,
  });

  const passCount = checklist.filter((item) => item.status === "pass").length;
  const failCount = checklist.filter((item) => item.status === "fail").length;
  const warnCount = checklist.filter((item) => item.status === "warn").length;
  const allPassed = failCount === 0 && warnCount === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-gray-500">
            PDF Studio launch hardening
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900 sm:text-3xl">
            Readiness &amp; diagnostics
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Review queue headroom, recent failures, support-ready job IDs, and the
            recovery links your team should use before escalating a PDF Studio issue.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/help/troubleshooting/pdf-studio-jobs"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            Troubleshooting guide
          </Link>
          <Link
            href="/app/docs/pdf-studio"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-strong)]"
          >
            Back to workspace
          </Link>
        </div>
      </div>

      <div
        className={`rounded-xl border p-5 ${
          allPassed
            ? "border-green-200 bg-green-50"
            : failCount > 0
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex items-center gap-4">
          {allPassed ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : (
            <AlertCircle
              className={`h-8 w-8 ${
                failCount > 0 ? "text-red-500" : "text-amber-500"
              }`}
            />
          )}
          <div>
            <p className="font-semibold text-gray-900">
              {allPassed
                ? "PDF Studio is ready for support handoff"
                : `${passCount} of ${checklist.length} readiness checks passed`}
            </p>
            <p className="text-sm text-gray-600">
              {failCount > 0 && `${failCount} action${failCount > 1 ? "s" : ""} required. `}
              {warnCount > 0 &&
                `${warnCount} recommendation${warnCount > 1 ? "s" : ""}.`}
              {allPassed &&
                "Queue headroom, recovery links, and support diagnostics are all in place."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Queue depth"
          value={`${diagnostics.queueDepth}/${diagnostics.activeJobLimit}`}
          detail="Active processing slots in use right now"
        />
        <MetricCard
          label="Tracked jobs"
          value={diagnostics.totalJobs}
          detail={`Current support window: last ${diagnostics.historyWindow} jobs`}
        />
        <MetricCard
          label="Success rate"
          value={
            diagnostics.successRate == null ? "—" : `${diagnostics.successRate}%`
          }
          detail="Completed vs failed jobs in the current history window"
        />
        <MetricCard
          label="Open issues"
          value={diagnostics.failedJobs + diagnostics.retryingJobs}
          detail={`${diagnostics.failedJobs} failed, ${diagnostics.retryingJobs} retrying`}
        />
      </div>

      <div className="space-y-3">
        {checklist.map((item) => {
          const badge = STATUS_LABEL[item.status];
          return (
            <div
              key={item.id}
              className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="mt-0.5 flex-shrink-0">{STATUS_ICON[item.status]}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{item.description}</p>
              </div>
              {item.actionHref && item.actionLabel ? (
                <Link
                  href={item.actionHref}
                  className="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                >
                  {item.actionLabel}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent failures and retries
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Keep the job ID and failure code when you escalate a conversion issue.
          </p>

          {diagnostics.recentIssues.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">
              No failed or retrying jobs in the current history window.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {diagnostics.recentIssues.map((issue) => (
                <div
                  key={issue.jobId}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {issue.toolTitle}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        Job ID: {issue.jobId} • {issue.sourceLabel}
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {new Date(issue.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700">
                      {issue.status === "retry_pending"
                        ? "Retry queued"
                        : "Failed"}
                    </span>
                    {issue.failureCode ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">
                        {getPdfStudioFailureLabel(issue.failureCode)}
                      </span>
                    ) : null}
                  </div>

                  {issue.error ? (
                    <p className="mt-3 text-sm text-red-700">{issue.error}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-gray-600">{issue.recoveryHint}</p>
                  {issue.nextRetryAt ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Retry scheduled for {new Date(issue.nextRetryAt).toLocaleString()}.
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                    <Link
                      href={issue.helpHref}
                      className="text-blue-600 hover:underline"
                    >
                      Open recovery guide
                    </Link>
                    <Link
                      href={`/app/docs/pdf-studio/${issue.toolId}`}
                      className="text-blue-600 hover:underline"
                    >
                      Open tool workspace
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Failure code breakdown
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Use this to spot recurring failure reasons before support volume spikes.
          </p>

          {diagnostics.topFailureCodes.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">
              No dead-letter jobs in the current support window.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {diagnostics.topFailureCodes.map((failure) => (
                <div
                  key={failure.code}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {failure.label}
                    </p>
                    <Link
                      href={failure.helpHref}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Open recovery guide
                    </Link>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {failure.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
