import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksOverview } from "../actions";
import { PeriodActionButtons } from "../components/period-action-buttons";
import { booksStatusBadgeVariant, formatBooksDate } from "../view-helpers";

export const metadata = {
  title: "Books Settings | Slipwise",
};

export default async function BooksSettingsPage() {
  const result = await getBooksOverview();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const { setup, metrics, periods, trialBalance } = result.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Books Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review accounting defaults, seeded structure, and fiscal-period lock controls.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/app/books/chart-of-accounts" className="font-medium text-blue-600 hover:underline">
            Chart of Accounts
          </Link>
          <Link href="/app/books/close" className="font-medium text-blue-600 hover:underline">
            Close Center
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Seed Template", value: setup.templateKey.replaceAll("_", " ") },
          { label: "Accounts Seeded", value: String(setup.accountsCreated) },
          { label: "Periods Seeded", value: String(setup.periodsCreated) },
          { label: "Trial Balance", value: trialBalance.balanced ? "Balanced" : "Review Needed" },
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
          <h2 className="text-lg font-semibold text-slate-900">Accounting baseline</h2>
          <p className="mt-1 text-sm text-slate-500">
            Core setup generated for the Books module at organization bootstrap.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Posted journals</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{metrics.postedJournals}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Draft journals</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{metrics.draftJournals}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Open periods</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{metrics.openPeriods}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Locked periods</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{metrics.lockedPeriods}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Fiscal periods</h2>
          <p className="mt-1 text-sm text-slate-500">
            Lock and reopen periods using the same control path as financial close.
          </p>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Period</th>
                  <th className="px-6 py-3">Dates</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {periods.map((period) => (
                  <tr key={period.id}>
                    <td className="px-6 py-4 font-medium text-slate-900">{period.label}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatBooksDate(period.startDate)} – {formatBooksDate(period.endDate)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={booksStatusBadgeVariant(period.status)}>{period.status}</Badge>
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
  );
}
