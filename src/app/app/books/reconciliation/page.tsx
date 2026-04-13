import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BankTransactionActions } from "../components/bank-transaction-actions";
import { ExportReconciliationButton } from "../components/export-reconciliation-button";
import { RefreshReconciliationButton } from "../components/refresh-reconciliation-button";
import { UploadBankStatementForm } from "../components/upload-bank-statement-form";
import { getBooksReconciliationWorkspace } from "../actions";

export const metadata = {
  title: "Reconciliation | Slipwise",
};

function parseAmount(value?: string) {
  if (!value?.trim()) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface ReconciliationPageProps {
  searchParams: Promise<{
    bankAccountId?: string;
    importId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: string;
    maxAmount?: string;
  }>;
}

export default async function BooksReconciliationPage({
  searchParams,
}: ReconciliationPageProps) {
  const params = await searchParams;
  const filters = {
    bankAccountId: params.bankAccountId,
    importId: params.importId,
    status: params.status,
    startDate: params.startDate,
    endDate: params.endDate,
    minAmount: parseAmount(params.minAmount),
    maxAmount: parseAmount(params.maxAmount),
  };

  const result = await getBooksReconciliationWorkspace(filters);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const { bankAccounts, transactions, importHistory, manualAccounts } = result.data;
  const statusCounts = {
    unmatched: transactions.filter((transaction) => transaction.status === "UNMATCHED").length,
    suggested: transactions.filter((transaction) => transaction.status === "SUGGESTED").length,
    partial: transactions.filter((transaction) => transaction.status === "PARTIALLY_MATCHED").length,
    matched: transactions.filter((transaction) => transaction.status === "MATCHED").length,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bank Reconciliation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Import statements, review suggestions, split matches, and post adjusting journals for
            unmatched cash movement.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <RefreshReconciliationButton
            bankAccountId={filters.bankAccountId}
            importId={filters.importId}
          />
          <ExportReconciliationButton filters={filters} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Unmatched", value: statusCounts.unmatched.toString() },
          { label: "Suggested", value: statusCounts.suggested.toString() },
          { label: "Partial", value: statusCounts.partial.toString() },
          { label: "Matched", value: statusCounts.matched.toString() },
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

      <UploadBankStatementForm bankAccounts={bankAccounts} />

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Filter bank lines</h2>
            <p className="mt-1 text-sm text-slate-500">
              Narrow the active reconciliation queue by account, status, date, and amount.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Bank account</span>
                <select
                  name="bankAccountId"
                  defaultValue={params.bankAccountId ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">All accounts</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Status</span>
                <select
                  name="status"
                  defaultValue={params.status ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="UNMATCHED">Unmatched</option>
                  <option value="SUGGESTED">Suggested</option>
                  <option value="PARTIALLY_MATCHED">Partially matched</option>
                  <option value="MATCHED">Matched</option>
                  <option value="IGNORED">Ignored</option>
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Start date</span>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={params.startDate ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">End date</span>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={params.endDate ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Min amount</span>
                <input
                  type="number"
                  step="0.01"
                  name="minAmount"
                  defaultValue={params.minAmount ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Max amount</span>
                <input
                  type="number"
                  step="0.01"
                  name="maxAmount"
                  defaultValue={params.maxAmount ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <label className="block text-sm md:col-span-2 xl:col-span-2">
                <span className="mb-1 block font-medium text-slate-700">Import</span>
                <select
                  name="importId"
                  defaultValue={params.importId ?? ""}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">All imports</option>
                  {importHistory.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.fileName} — {new Date(item.createdAt).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end gap-3 md:col-span-2 xl:col-span-4">
                <button
                  type="submit"
                  className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
                >
                  Apply filters
                </button>
                <Link href="/app/books/reconciliation" className="text-sm font-medium text-slate-600 hover:underline">
                  Reset
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Import history</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review recent bank imports, failed rows, and generated suggestions.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {importHistory.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                No bank imports yet.
              </div>
            ) : (
              importHistory.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  href={`/app/books/reconciliation/imports/${item.id}`}
                  className="block rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.fileName}</p>
                      <p className="text-xs text-slate-500">
                        {item.bankAccount.name} • {item.importedRows} imported / {item.failedRows} failed
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.status === "PROCESSED"
                          ? "success"
                          : item.status === "FAILED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Reconciliation queue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Confirm suggestions, split matches by editing the amount prompt, or post an adjusting
            journal for suspense and write-offs. Partially matched lines stay in review until the
            remaining balance is resolved or explicitly cleared.
          </p>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Transaction</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Matches & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                      No bank transactions match the current filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 align-top">
                        <div className="font-medium text-slate-900">{transaction.bankAccount.name}</div>
                        <div className="text-sm text-slate-700">
                          {new Date(transaction.txnDate).toLocaleDateString()} •{" "}
                          {transaction.reference ?? "No reference"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">{transaction.description}</div>
                        {transaction.import && (
                          <div className="mt-2 text-xs text-slate-500">
                            Import:{" "}
                            <Link
                              href={`/app/books/reconciliation/imports/${transaction.import.id}`}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {transaction.import.fileName}
                            </Link>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-700">
                        <div className="font-medium">
                          {transaction.direction === "CREDIT" ? "+" : "-"}
                          {transaction.amount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        {transaction.runningBalance !== null && (
                          <div className="mt-1 text-xs text-slate-500">
                            Balance {transaction.runningBalance.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <Badge
                          variant={
                            transaction.status === "MATCHED"
                              ? "success"
                              : transaction.status === "PARTIALLY_MATCHED"
                                ? "warning"
                                : transaction.status === "IGNORED"
                                  ? "default"
                                  : "danger"
                          }
                        >
                          {transaction.status.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <BankTransactionActions
                          transactionId={transaction.id}
                          status={transaction.status}
                          suggestions={transaction.matches}
                          manualAccounts={manualAccounts}
                        />
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
