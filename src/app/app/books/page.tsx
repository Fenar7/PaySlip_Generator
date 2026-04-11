import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksOverview } from "./actions";
import { JournalRowActions } from "./components/journal-row-actions";
import { PeriodActionButtons } from "./components/period-action-buttons";

export const metadata = {
  title: "SW Books | Slipwise",
};

export default async function BooksOverviewPage() {
  const result = await getBooksOverview();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const { metrics, setup, recentJournals, periods, trialBalance } = result.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">SW Books</h1>
            <Badge variant={trialBalance.balanced ? "success" : "danger"}>
              {trialBalance.balanced ? "Balanced" : "Out of balance"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Accounting foundation, journals, fiscal periods, and core finance controls.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/app/books/journals/new">
            <Button>Manual Journal</Button>
          </Link>
          <Link href="/app/books/trial-balance">
            <Button variant="secondary">Trial Balance</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Template", value: setup.templateKey.replaceAll("_", " ") },
          { label: "Accounts", value: metrics.totalAccounts.toString() },
          { label: "Posted journals", value: metrics.postedJournals.toString() },
          { label: "Open periods", value: metrics.openPeriods.toString() },
          { label: "Locked periods", value: metrics.lockedPeriods.toString() },
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

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent journals</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest journal activity across manual and operational postings.
              </p>
            </div>
            <Link href="/app/books/journals" className="text-sm font-medium text-blue-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3">Entry</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Source</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {recentJournals.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                        No journals posted yet.
                      </td>
                    </tr>
                  ) : (
                    recentJournals.map((journal) => (
                      <tr key={journal.id}>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{journal.entryNumber}</div>
                          {journal.sourceRef && (
                            <div className="text-xs text-slate-500">{journal.sourceRef}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {new Date(journal.entryDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {journal.source.replaceAll("_", " ")}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {journal.totalDebit.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              journal.status === "POSTED"
                                ? "success"
                                : journal.status === "REVERSED"
                                  ? "warning"
                                  : "default"
                            }
                          >
                            {journal.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <JournalRowActions journalEntryId={journal.id} status={journal.status} />
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Fiscal periods</h2>
              <p className="mt-1 text-sm text-slate-500">
                Lock and reopen periods with an explicit audit trail.
              </p>
            </div>
            <Badge variant="default">
              TB {trialBalance.debit.toFixed(2)} / {trialBalance.credit.toFixed(2)}
            </Badge>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3">Period</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {periods.map((period) => (
                    <tr key={period.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{period.label}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(period.startDate).toLocaleDateString()} -{" "}
                          {new Date(period.endDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            period.status === "OPEN"
                              ? "success"
                              : period.status === "LOCKED"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {period.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <PeriodActionButtons periodId={period.id} status={period.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
