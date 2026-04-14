import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createGstFilingRunAction, getGstFilingWorkspace } from "./actions";
import {
  formatEnumLabel,
  formatGstFilingDate,
  formatPeriodMonth,
  gstFilingStatusBadgeVariant,
  gstReconciliationBadgeVariant,
  gstSubmissionBadgeVariant,
} from "./view-helpers";

export const metadata = {
  title: "GST Filings | Slipwise",
};

interface GstFilingsPageProps {
  searchParams: Promise<{
    status?: string;
    periodMonth?: string;
    message?: string;
    error?: string;
  }>;
}

export default async function GstFilingsPage({ searchParams }: GstFilingsPageProps) {
  const params = await searchParams;
  const result = await getGstFilingWorkspace({
    status: params.status,
    periodMonth: params.periodMonth,
  });

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const { runs, stats, filters, currentPeriodMonth } = result.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">GST Filings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track validation, submission intent, submission outcomes, and reconciliation for monthly GST filing runs.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/app/intel/gst-reports">
            <Button variant="secondary">Open GST Reports</Button>
          </Link>
        </div>
      </div>

      {params.message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {params.message}
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Runs", value: String(stats.totalRuns) },
          { label: "Ready", value: String(stats.readyRuns) },
          { label: "Blocked", value: String(stats.blockedRuns) },
          { label: "In Flight", value: String(stats.inFlightRuns) },
          { label: "Reconciled", value: String(stats.reconciledRuns) },
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

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Create filing run</h2>
          <p className="mt-1 text-sm text-slate-500">
            Start a monthly filing workspace. Creation is idempotent for the same period.
          </p>
        </CardHeader>
        <CardContent>
          <form action={createGstFilingRunAction} className="grid gap-4 lg:grid-cols-[220px,minmax(0,1fr),auto] lg:items-end">
            <Input
              id="periodMonth"
              name="periodMonth"
              type="month"
              label="Filing period"
              defaultValue={currentPeriodMonth}
              required
            />
            <Input
              id="note"
              name="note"
              label="Operator note"
              placeholder="Optional context for this filing run"
            />
            <Button type="submit">Create run</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filter filing runs</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[220px,220px,auto] md:items-end">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Status</span>
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm"
              >
                <option value="">All statuses</option>
                {["DRAFT", "BLOCKED", "READY", "SUBMISSION_PENDING", "RECONCILING", "RECONCILED", "FAILED"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {formatEnumLabel(status)}
                    </option>
                  ),
                )}
              </select>
            </label>

            <Input
              id="periodMonthFilter"
              name="periodMonth"
              type="month"
              label="Period"
              defaultValue={filters.periodMonth ?? ""}
            />

            <div className="flex items-center gap-3">
              <Button type="submit" variant="secondary">
                Apply
              </Button>
              <Link href="/app/intel/gst-filings" className="text-sm font-medium text-slate-600 hover:underline">
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filing run history</h2>
            <p className="mt-1 text-sm text-slate-500">
              Submission attempts and reconciliation state remain visible even after retries.
            </p>
          </div>
          <Badge variant="default">{runs.length} in view</Badge>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Period</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Validation</th>
                  <th className="px-6 py-3">Latest Submission</th>
                  <th className="px-6 py-3">Reconciliation</th>
                  <th className="px-6 py-3">Updated</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                      No GST filing runs found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => {
                    const latestSubmission = run.submissions[0] ?? null;
                    const latestReconciliation = run.reconciliations[0] ?? null;

                    return (
                      <tr key={run.id}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{formatPeriodMonth(run.periodMonth)}</div>
                          <div className="text-xs text-slate-500">{run.returnType}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={gstFilingStatusBadgeVariant(run.status)}>
                            {formatEnumLabel(run.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <div>{run.blockerCount} blocker(s)</div>
                          <div className="text-xs text-slate-500">{run.warningCount} warning(s)</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {latestSubmission ? (
                            <div className="space-y-1">
                              <Badge variant={gstSubmissionBadgeVariant(latestSubmission.status)}>
                                {formatEnumLabel(latestSubmission.status)}
                              </Badge>
                              <div className="text-xs text-slate-500">Attempt {latestSubmission.attempt}</div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {latestReconciliation ? (
                            <Badge variant={gstReconciliationBadgeVariant(latestReconciliation.status)}>
                              {formatEnumLabel(latestReconciliation.status)}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {formatGstFilingDate(run.updatedAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/app/intel/gst-filings/${run.id}`}
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            View detail
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
