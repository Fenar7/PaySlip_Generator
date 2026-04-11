import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksLedger, getChartOfAccounts } from "../actions";
import { ExportBooksReportButton } from "../components/export-books-report-button";

export const metadata = {
  title: "General Ledger | Slipwise",
};

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string; startDate?: string; endDate?: string }>;
}) {
  const params = await searchParams;
  const [accountsResult, ledgerResult] = await Promise.all([
    getChartOfAccounts(),
    getBooksLedger(params),
  ]);

  if (!accountsResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{accountsResult.error}</div>
      </div>
    );
  }

  if (!ledgerResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{ledgerResult.error}</div>
      </div>
    );
  }

  const accounts = accountsResult.data.filter((account) => account.isActive);
  const ledger = ledgerResult.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">General Ledger</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review posted journal lines with running balances by account.
          </p>
        </div>
        <ExportBooksReportButton
          report="ledger"
          filters={params}
          filenamePrefix="books-general-ledger"
          disabled={ledger.length === 0}
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Account</span>
              <select
                name="accountId"
                defaultValue={params.accountId ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">All accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} — {account.name}
                  </option>
                ))}
              </select>
            </label>

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

            <div className="flex items-end justify-end gap-3">
              <Button type="submit">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Ledger lines</h2>
            <Badge variant="default">{ledger.length} rows</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Entry</th>
                  <th className="px-4 py-3">Memo</th>
                  <th className="px-4 py-3">Debit</th>
                  <th className="px-4 py-3">Credit</th>
                  <th className="px-4 py-3">Running</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                      No posted ledger lines found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  ledger.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {new Date(line.entryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div className="font-medium">
                          {line.accountCode} — {line.accountName}
                        </div>
                        <div className="text-xs text-slate-500">{line.accountType}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div>{line.entryNumber}</div>
                        {line.sourceRef && (
                          <div className="text-xs text-slate-500">{line.sourceRef}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {line.description || line.memo || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {line.debit.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {line.credit.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {line.runningBalance.toLocaleString("en-IN", {
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
