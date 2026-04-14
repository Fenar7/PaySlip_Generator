import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getGstFilingRunPage,
  recordGstReconciliationAction,
  recordGstSubmissionIntentAction,
  recordGstSubmissionResultAction,
  validateGstFilingRunAction,
} from "../actions";
import {
  formatEnumLabel,
  formatGstFilingDate,
  formatPeriodMonth,
  gstFilingStatusBadgeVariant,
  gstReconciliationBadgeVariant,
  gstSubmissionBadgeVariant,
} from "../view-helpers";

export const metadata = {
  title: "GST Filing Detail | Slipwise",
};

interface GstFilingDetailPageProps {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ message?: string; error?: string }>;
}

export default async function GstFilingDetailPage({
  params,
  searchParams,
}: GstFilingDetailPageProps) {
  const { runId } = await params;
  const flash = await searchParams;
  const result = await getGstFilingRunPage(runId);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const { run, isValidationStale, latestSubmission, latestReconciliation } = result.data;
  const canValidate = ["DRAFT", "BLOCKED", "READY", "FAILED"].includes(run.status);
  const canRecordIntent = ["READY", "FAILED"].includes(run.status);
  const canRecordSubmissionResult =
    latestSubmission !== null &&
    ["INTENT_RECORDED", "SUBMITTED", "ACKNOWLEDGED"].includes(latestSubmission.status);
  const canRecordReconciliation = latestSubmission !== null && ["RECONCILING", "RECONCILED"].includes(run.status);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/app/intel/gst-filings" className="text-sm font-medium text-blue-600 hover:underline">
            ← Back to GST Filings
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {formatPeriodMonth(run.periodMonth)} filing
            </h1>
            <Badge variant={gstFilingStatusBadgeVariant(run.status)}>
              {formatEnumLabel(run.status)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {run.returnType} • Created {formatGstFilingDate(run.createdAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={`/api/export/gst-filings/${run.id}`}>
            <Button variant="secondary">Export Filing Package</Button>
          </Link>
        </div>
      </div>

      {flash.message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {flash.message}
        </div>
      )}

      {flash.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {flash.error}
        </div>
      )}

      {isValidationStale && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Source tax data changed after the last validation. Re-run validation before recording a submission.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Blockers", value: String(run.blockerCount) },
          { label: "Warnings", value: String(run.warningCount) },
          { label: "Last Validated", value: formatGstFilingDate(run.lastValidatedAt) },
          { label: "Submitted", value: formatGstFilingDate(run.submittedAt) },
          { label: "Reconciled", value: formatGstFilingDate(run.reconciledAt) },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold text-slate-900">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr),minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Validation issues</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Blockers must be cleared before submission intent can be recorded.
                </p>
              </div>
              {canValidate && (
                <form action={validateGstFilingRunAction}>
                  <input type="hidden" name="runId" value={run.id} />
                  <Button type="submit">Run validation</Button>
                </form>
              )}
            </CardHeader>
            <CardContent className="px-0 py-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3">Severity</th>
                      <th className="px-6 py-3">Code</th>
                      <th className="px-6 py-3">Issue</th>
                      <th className="px-6 py-3">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {run.validationIssues.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                          No validation issues recorded yet.
                        </td>
                      </tr>
                    ) : (
                      run.validationIssues.map((issue) => (
                        <tr key={issue.id}>
                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                issue.severity === "ERROR"
                                  ? "danger"
                                  : issue.severity === "WARNING"
                                    ? "warning"
                                    : "default"
                              }
                            >
                              {formatEnumLabel(issue.severity)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{issue.code}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{issue.message}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {issue.invoiceNumber ?? issue.invoiceId ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Submission attempts</h2>
              <p className="mt-1 text-sm text-slate-500">
                Submission intent and result are tracked separately so retries stay auditable.
              </p>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3">Attempt</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Reference</th>
                      <th className="px-6 py-3">Acknowledgement</th>
                      <th className="px-6 py-3">Started</th>
                      <th className="px-6 py-3">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {run.submissions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                          No submission attempts have been recorded.
                        </td>
                      </tr>
                    ) : (
                      run.submissions.map((submission) => (
                        <tr key={submission.id}>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{submission.attempt}</td>
                          <td className="px-6 py-4">
                            <Badge variant={gstSubmissionBadgeVariant(submission.status)}>
                              {formatEnumLabel(submission.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {submission.externalReference ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {submission.acknowledgementNumber ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {formatGstFilingDate(submission.initiatedAt)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {formatGstFilingDate(submission.completedAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Reconciliation history</h2>
              <p className="mt-1 text-sm text-slate-500">
                Variances remain visible until an operator records a matched outcome.
              </p>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Matched</th>
                      <th className="px-6 py-3">Variance</th>
                      <th className="px-6 py-3">Resolved</th>
                      <th className="px-6 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {run.reconciliations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                          No reconciliation updates recorded yet.
                        </td>
                      </tr>
                    ) : (
                      run.reconciliations.map((reconciliation) => (
                        <tr key={reconciliation.id}>
                          <td className="px-6 py-4">
                            <Badge variant={gstReconciliationBadgeVariant(reconciliation.status)}>
                              {formatEnumLabel(reconciliation.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">{reconciliation.matchedCount}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{reconciliation.varianceCount}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">
                            {formatGstFilingDate(reconciliation.resolvedAt)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700">{reconciliation.note ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Submission operations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Record intent before leaving the app, then capture the external outcome once the portal action completes.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {canRecordIntent ? (
                <form action={recordGstSubmissionIntentAction} className="space-y-3">
                  <input type="hidden" name="runId" value={run.id} />
                  <Input
                    id="intentNote"
                    name="note"
                    label="Intent note"
                    placeholder="Optional note for the operator handoff"
                  />
                  <Button type="submit">Record submission intent</Button>
                </form>
              ) : (
                <p className="text-sm text-slate-500">
                  This run must be ready or failed before a new submission attempt can be recorded.
                </p>
              )}

              {latestSubmission && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Latest attempt</p>
                      <p className="text-xs text-slate-500">Attempt {latestSubmission.attempt}</p>
                    </div>
                    <Badge variant={gstSubmissionBadgeVariant(latestSubmission.status)}>
                      {formatEnumLabel(latestSubmission.status)}
                    </Badge>
                  </div>
                </div>
              )}

              {canRecordSubmissionResult && (
                <form action={recordGstSubmissionResultAction} className="space-y-3">
                  <input type="hidden" name="runId" value={run.id} />
                  <Input
                    id="externalReference"
                    name="externalReference"
                    label="External reference"
                    defaultValue={latestSubmission?.externalReference ?? ""}
                    placeholder="Portal ARN / reference ID"
                  />
                  <Input
                    id="acknowledgementNumber"
                    name="acknowledgementNumber"
                    label="Acknowledgement number"
                    defaultValue={latestSubmission?.acknowledgementNumber ?? ""}
                    placeholder="Optional acknowledgement number"
                  />
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Operator note</span>
                    <textarea
                      name="note"
                      rows={3}
                      className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm"
                      placeholder="What happened in the external portal?"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Failure reason</span>
                    <textarea
                      name="errorMessage"
                      rows={3}
                      className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm"
                      placeholder="Required when marking the attempt failed"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" name="outcome" value="submitted">
                      Record submitted
                    </Button>
                    <Button type="submit" variant="danger" name="outcome" value="failed">
                      Record failed
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Reconciliation operations</h2>
              <p className="mt-1 text-sm text-slate-500">
                Capture whether the books, filing portal, and acknowledgement trail line up.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {latestReconciliation && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Latest reconciliation</p>
                      <p className="text-xs text-slate-500">
                        Resolved {formatGstFilingDate(latestReconciliation.resolvedAt)}
                      </p>
                    </div>
                    <Badge variant={gstReconciliationBadgeVariant(latestReconciliation.status)}>
                      {formatEnumLabel(latestReconciliation.status)}
                    </Badge>
                  </div>
                </div>
              )}

              {canRecordReconciliation ? (
                <form action={recordGstReconciliationAction} className="space-y-3">
                  <input type="hidden" name="runId" value={run.id} />
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Status</span>
                    <select
                      name="status"
                      defaultValue={latestReconciliation?.status ?? "MATCHED"}
                      className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="MATCHED">Matched</option>
                      <option value="VARIANCE">Variance</option>
                      <option value="ACTION_REQUIRED">Action Required</option>
                    </select>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      id="matchedCount"
                      name="matchedCount"
                      type="number"
                      min={0}
                      label="Matched count"
                      defaultValue={latestReconciliation?.matchedCount ?? 0}
                    />
                    <Input
                      id="varianceCount"
                      name="varianceCount"
                      type="number"
                      min={0}
                      label="Variance count"
                      defaultValue={latestReconciliation?.varianceCount ?? 0}
                    />
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Note</span>
                    <textarea
                      name="note"
                      rows={3}
                      className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm"
                      placeholder="Explain the reconciliation outcome"
                    />
                  </label>
                  <Button type="submit">Record reconciliation</Button>
                </form>
              ) : (
                <p className="text-sm text-slate-500">
                  Reconciliation becomes available once a submission outcome has been recorded.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900">Event history</h2>
              <p className="mt-1 text-sm text-slate-500">Append-only lifecycle trail for operators and audit review.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {run.events.length === 0 ? (
                  <p className="text-sm text-slate-500">No events recorded yet.</p>
                ) : (
                  run.events.map((event) => (
                    <div key={event.id} className="border-l-2 border-slate-200 pl-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default">{formatEnumLabel(event.eventType)}</Badge>
                        <span className="text-xs text-slate-500">{formatGstFilingDate(event.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{event.note ?? "No operator note."}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
