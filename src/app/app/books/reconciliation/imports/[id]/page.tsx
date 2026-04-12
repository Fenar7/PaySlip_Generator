import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BankTransactionActions } from "../../../components/bank-transaction-actions";
import { ExportReconciliationButton } from "../../../components/export-reconciliation-button";
import { RefreshReconciliationButton } from "../../../components/refresh-reconciliation-button";
import { getBooksBankImportDetail, getBooksReconciliationWorkspace } from "../../../actions";

export const metadata = {
  title: "Bank Import Detail | Slipwise",
};

interface ImportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BankImportDetailPage({ params }: ImportDetailPageProps) {
  const { id } = await params;
  const [detailResult, workspaceResult] = await Promise.all([
    getBooksBankImportDetail(id),
    getBooksReconciliationWorkspace({ importId: id }),
  ]);

  if (!detailResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {detailResult.error}
        </div>
      </div>
    );
  }

  if (!workspaceResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {workspaceResult.error}
        </div>
      </div>
    );
  }

  const detail = detailResult.data;
  const { manualAccounts, transactions } = workspaceResult.data;
  const failedRows = Array.isArray(detail.errorRows)
    ? (detail.errorRows as Array<{ rowNumber: number; error: string; raw: Record<string, string> }>)
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/app/books/reconciliation" className="text-sm font-medium text-blue-600 hover:underline">
            ← Back to Reconciliation
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{detail.fileName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {detail.bankAccount.name} • imported on {new Date(detail.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <RefreshReconciliationButton importId={id} bankAccountId={detail.bankAccountId} />
          <ExportReconciliationButton filters={{ importId: id, bankAccountId: detail.bankAccountId }} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Imported Rows", value: String(detail.importedRows) },
          { label: "Failed Rows", value: String(detail.failedRows) },
          { label: "Transactions", value: String(detail.transactions.length) },
          { label: "Status", value: detail.status.replaceAll("_", " ") },
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

      {failedRows.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Failed rows</h2>
            <p className="mt-1 text-sm text-slate-500">
              These rows were rejected during import and need mapping or data cleanup.
            </p>
          </CardHeader>
          <CardContent className="px-0 py-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-3">Row</th>
                    <th className="px-6 py-3">Error</th>
                    <th className="px-6 py-3">Raw</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {failedRows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.error}`}>
                      <td className="px-6 py-4 text-sm text-slate-700">{row.rowNumber}</td>
                      <td className="px-6 py-4 text-sm text-red-700">{row.error}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <pre className="whitespace-pre-wrap break-words">{JSON.stringify(row.raw)}</pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Imported bank lines</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review suggestions and finalize reconciliation for the lines in this import.
            </p>
          </div>
          <Badge
            variant={
              detail.status === "PROCESSED"
                ? "success"
                : detail.status === "FAILED"
                  ? "danger"
                  : "warning"
            }
          >
            {detail.status}
          </Badge>
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
                      No transactions found for this import.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 align-top">
                        <div className="font-medium text-slate-900">
                          {new Date(transaction.txnDate).toLocaleDateString()} •{" "}
                          {transaction.reference ?? "No reference"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">{transaction.description}</div>
                      </td>
                      <td className="px-6 py-4 align-top text-sm text-slate-700">
                        {transaction.direction === "CREDIT" ? "+" : "-"}
                        {transaction.amount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
