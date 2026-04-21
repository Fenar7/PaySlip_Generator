import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksSettings } from "../actions";
import { BooksSettingsForm } from "../components/books-settings-form";
import { PeriodActionButtons } from "../components/period-action-buttons";
import { booksStatusBadgeVariant, formatBooksDate } from "../view-helpers";

export const metadata = {
  title: "Books Settings | Slipwise",
};

const FISCAL_YEAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export default async function BooksSettingsPage() {
  const result = await getBooksSettings();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const { metadata, defaultMappings, systemAccounts, accountOptions, periods } = result.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Books Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review seeded Books metadata, default posting mappings, and period controls for future finance activity.
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
          { label: "Seed Template", value: metadata.templateKey.replaceAll("_", " ") },
          { label: "Books Enabled", value: metadata.booksEnabled ? "Yes" : "No" },
          { label: "Active Accounts", value: String(metadata.activeAccountCount) },
          { label: "Base Currency", value: metadata.baseCurrency },
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
          <h2 className="text-lg font-semibold text-slate-900">Setup metadata</h2>
          <p className="mt-1 text-sm text-slate-500">
            Seeded configuration and organization defaults currently active for this Books workspace.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Country</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{metadata.country}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fiscal Year Start</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {FISCAL_YEAR_MONTHS[Math.max(0, Math.min(11, metadata.fiscalYearStart - 1))]}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Seeded At</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {metadata.seededAt ? formatBooksDate(metadata.seededAt) : "Pending"}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Available Mapping Targets</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{accountOptions.length}</p>
          </div>
        </CardContent>
      </Card>

      <BooksSettingsForm mappings={defaultMappings} accountOptions={accountOptions} />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Seeded system accounts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Finance-controlled system accounts provided by the template and used by core Books flows.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {systemAccounts.map((account) => (
            <div key={account.key} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{account.label}</p>
              <p className="mt-2 text-sm text-slate-500">{account.description}</p>
              <p className="mt-3 font-medium text-slate-900">
                {account.account ? `${account.account.code} — ${account.account.name}` : "Not seeded"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Fiscal periods</h2>
          <p className="mt-1 text-sm text-slate-500">
            Lock periods here, or request a governed reopen with a required reason, approval trail, and
            audit log.
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
