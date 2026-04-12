import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksTrialBalance } from "../actions";
import { ExportBooksReportButton } from "../components/export-books-report-button";

export const metadata = {
  title: "Trial Balance | Slipwise",
};

export default async function TrialBalancePage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const result = await getBooksTrialBalance(params);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const trialBalance = result.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Trial Balance</h1>
            <Badge variant={trialBalance.balanced ? "success" : "danger"}>
              {trialBalance.balanced ? "Balanced" : "Out of balance"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Posted-account balances derived from the general ledger only.
          </p>
        </div>
        <ExportBooksReportButton
          report="trial-balance"
          filters={params}
          filenamePrefix="books-trial-balance"
          disabled={trialBalance.rows.length === 0}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Start date</span>
              <input
                type="date"
                name="startDate"
                defaultValue={params.startDate ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">End date</span>
              <input
                type="date"
                name="endDate"
                defaultValue={params.endDate ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="flex items-end justify-end">
              <Button type="submit">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total debits</p>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-slate-900">
              {trialBalance.totals.debit.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total credits</p>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-slate-900">
              {trialBalance.totals.credit.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Accounts</h2>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Debits</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Debit balance</th>
                  <th className="px-4 py-3">Credit balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {trialBalance.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                      No posted balances found for the selected dates.
                    </td>
                  </tr>
                ) : (
                  trialBalance.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.code}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.accountType}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.totalDebit.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.totalCredit.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.debitBalance.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.creditBalance.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
