import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksJournalRegister, getChartOfAccounts } from "../actions";
import { ExportBooksReportButton } from "../components/export-books-report-button";
import { JournalRowActions } from "../components/journal-row-actions";

export const metadata = {
  title: "Journals | Slipwise",
};

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: "DRAFT" | "POSTED" | "REVERSED";
    source?: "MANUAL" | "INVOICE" | "INVOICE_PAYMENT" | "VOUCHER" | "SALARY_SLIP" | "GST" | "TDS" | "OPENING_BALANCE" | "SYSTEM_REVERSAL";
    startDate?: string;
    endDate?: string;
    accountId?: string;
  }>;
}) {
  const params = await searchParams;
  const [accountsResult, journalsResult] = await Promise.all([
    getChartOfAccounts(),
    getBooksJournalRegister(params),
  ]);

  if (!accountsResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{accountsResult.error}</div>
      </div>
    );
  }

  if (!journalsResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{journalsResult.error}</div>
      </div>
    );
  }

  const accounts = accountsResult.data.filter((account) => account.isActive);
  const journals = journalsResult.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Journal Register</h1>
          <p className="mt-1 text-sm text-slate-500">
            Filter journal entries by date, source, account, and posting status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportBooksReportButton
            report="journals"
            filters={params}
            filenamePrefix="books-journal-register"
            disabled={journals.length === 0}
          />
          <Link href="/app/books/journals/new">
            <Button>Manual Journal</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-5">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Status</span>
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">All</option>
                <option value="DRAFT">Draft</option>
                <option value="POSTED">Posted</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Source</span>
              <select
                name="source"
                defaultValue={params.source ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">All</option>
                {[
                  "MANUAL",
                  "INVOICE",
                  "INVOICE_PAYMENT",
                  "VOUCHER",
                  "SALARY_SLIP",
                  "GST",
                  "TDS",
                  "OPENING_BALANCE",
                  "SYSTEM_REVERSAL",
                ].map((source) => (
                  <option key={source} value={source}>
                    {source.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>

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

            <div className="md:col-span-5 flex items-center justify-end gap-3">
              <Link href="/app/books/journals" className="text-sm font-medium text-slate-500 hover:underline">
                Reset
              </Link>
              <Button type="submit">Apply Filters</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Entries</h2>
            <Badge variant="default">{journals.length} results</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Entry</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Evidence</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {journals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                      No journals match the current filters.
                    </td>
                  </tr>
                ) : (
                  journals.map((journal) => (
                    <tr key={journal.id}>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <Link
                          href={`/app/books/journals/${journal.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {journal.entryNumber}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {journal.memo || journal.sourceRef || `${journal.lineCount} lines`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {new Date(journal.entryDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {journal.source.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{journal.periodLabel}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {journal.totalDebit.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {journal.attachmentCount === 0
                          ? "No files"
                          : `${journal.attachmentCount} attachment${journal.attachmentCount === 1 ? "" : "s"}`}
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-right">
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
    </div>
  );
}
