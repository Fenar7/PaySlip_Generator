import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksCloseWorkspace, getBooksOverview } from "../actions";
import { AuditPackageDownloadButton } from "../components/audit-package-download-button";
import { CloseTaskReviewButtons } from "../components/close-task-review-buttons";
import { CompleteCloseButton } from "../components/complete-close-button";
import { ReopenClosedPeriodButton } from "../components/reopen-closed-period-button";
import { booksStatusBadgeVariant, formatBooksMoney } from "../view-helpers";

export const metadata = {
  title: "Financial Close | Slipwise",
};

interface ClosePageProps {
  searchParams: Promise<{ fiscalPeriodId?: string }>;
}

const MANUAL_TASK_CODES = new Set([
  "ar_aging_reviewed",
  "ap_aging_reviewed",
  "gst_tie_out_reviewed",
  "tds_tie_out_reviewed",
]);

export default async function ClosePage({ searchParams }: ClosePageProps) {
  const params = await searchParams;
  const [workspaceResult, overviewResult] = await Promise.all([
    getBooksCloseWorkspace(params.fiscalPeriodId),
    getBooksOverview(),
  ]);

  if (!workspaceResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{workspaceResult.error}</div>
      </div>
    );
  }

  const workspace = workspaceResult.data;
  const periodOptions = overviewResult.success ? overviewResult.data.periods : [workspace.period];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Financial Close Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track close blockers, review reconciliations, and reopen periods only through a direct
            admin action with reason capture and audit logging.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <AuditPackageDownloadButton fiscalPeriodId={workspace.period.id} />
          {workspace.period.status === "OPEN" ? (
            <CompleteCloseButton
              fiscalPeriodId={workspace.period.id}
              disabled={workspace.closeRun.blockerCount > 0}
            />
          ) : (
            <ReopenClosedPeriodButton periodId={workspace.period.id} />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Active period</h2>
          <p className="mt-1 text-sm text-slate-500">
            Switch between recent fiscal periods to inspect close readiness and reopen activity.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-slate-900">{workspace.period.label}</h3>
                <Badge variant={booksStatusBadgeVariant(workspace.period.status)}>{workspace.period.status}</Badge>
                <Badge variant={booksStatusBadgeVariant(workspace.closeRun.status)}>{workspace.closeRun.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {new Date(workspace.period.startDate).toLocaleDateString()} –{" "}
                {new Date(workspace.period.endDate).toLocaleDateString()}
              </p>
            </div>

            <form className="flex flex-wrap items-end gap-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Period</span>
                <select
                  name="fiscalPeriodId"
                  defaultValue={workspace.period.id}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {periodOptions.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="secondary">
                Load Period
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Blockers", value: String(workspace.closeRun.blockerCount) },
          {
            label: "Net Profit",
            value: formatBooksMoney(workspace.reports.profitLoss.totals.netProfit),
          },
          {
            label: "Cash Movement",
            value: formatBooksMoney(workspace.reports.cashFlow.actualNetCashMovement),
          },
          {
            label: "AR / AP Variance",
            value: `${formatBooksMoney(workspace.reports.arAging.variance)} / ${formatBooksMoney(
              workspace.reports.apAging.variance,
            )}`,
          },
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Close checklist</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mandatory blockers must clear before period close. Manual review tasks can be passed or
              waived with an explicit note.
            </p>
          </div>
          <Badge variant={workspace.closeRun.blockerCount === 0 ? "success" : "danger"}>
            {workspace.closeRun.blockerCount === 0 ? "Ready to close" : "Blocked"}
          </Badge>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Task</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Detail</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workspace.closeRun.tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{task.label}</div>
                      <div className="text-xs text-slate-500">{task.description ?? "—"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={task.severity === "blocker" ? "danger" : "warning"}>
                        {task.severity}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={booksStatusBadgeVariant(task.status)}>{task.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {task.blockerReason ?? "No blocker reason recorded."}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {MANUAL_TASK_CODES.has(task.code) ? (
                        <CloseTaskReviewButtons
                          fiscalPeriodId={workspace.period.id}
                          code={
                            task.code as
                              | "ar_aging_reviewed"
                              | "ap_aging_reviewed"
                              | "gst_tie_out_reviewed"
                              | "tds_tie_out_reviewed"
                          }
                        />
                      ) : (
                        <span className="text-xs text-slate-400">Auto-check</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Tie-out summary</h2>
            <p className="mt-1 text-sm text-slate-500">
              Key ledger-to-subledger checks surfaced directly in the close workspace.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-medium text-slate-900">AR aging variance</p>
              <p className="mt-1">{formatBooksMoney(workspace.reports.arAging.variance)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-medium text-slate-900">AP aging variance</p>
              <p className="mt-1">{formatBooksMoney(workspace.reports.apAging.variance)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-medium text-slate-900">GST output / input variance</p>
              <p className="mt-1">
                {formatBooksMoney(workspace.reports.gstTieOut.outputTax.variance)} /{" "}
                {formatBooksMoney(workspace.reports.gstTieOut.inputTax.variance)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-medium text-slate-900">TDS receivable variance</p>
              <p className="mt-1">{formatBooksMoney(workspace.reports.tdsTieOut.receivable.variance)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Report shortcuts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Open the supporting finance statements used during final close review.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              { href: "/app/books/reports/profit-loss", label: "Profit & Loss" },
              { href: "/app/books/reports/balance-sheet", label: "Balance Sheet" },
              { href: "/app/books/reports/cash-flow", label: "Cash Flow" },
              { href: "/app/books/reports/ar-aging", label: "AR Aging" },
              { href: "/app/books/reports/ap-aging", label: "AP Aging" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
