import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getChartOfAccounts } from "../actions";
import { AccountRowActions } from "../components/account-row-actions";
import { CreateAccountModal } from "../components/create-account-modal";
import { ExportBooksReportButton } from "../components/export-books-report-button";

export const metadata = {
  title: "Chart of Accounts | Slipwise",
};

interface ChartAccountRow {
  id: string;
  code: string;
  name: string;
  accountType: string;
  normalBalance: string;
  parentId: string | null;
  parentName: string | null;
  isSystem: boolean;
  isProtected: boolean;
  isActive: boolean;
  entryCount: number;
  balance: number;
}

function renderAccountRows(
  accountId: string | null,
  rows: ChartAccountRow[],
  depth = 0,
): ReactNode[] {
  return rows
    .filter((row) => row.parentId === accountId)
    .flatMap((row) => [
      <tr key={row.id}>
        <td className="px-4 py-3 text-sm text-slate-700">{row.code}</td>
        <td className="px-4 py-3 text-sm text-slate-900">
          <div style={{ paddingLeft: `${depth * 16}px` }}>
            <span className="font-medium">{row.name}</span>
            {!row.isActive && <span className="ml-2 text-xs text-slate-400">(archived)</span>}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-slate-700">{row.accountType}</td>
        <td className="px-4 py-3 text-sm text-slate-700">{row.normalBalance}</td>
        <td className="px-4 py-3 text-sm text-slate-700">{row.entryCount}</td>
        <td className="px-4 py-3 text-sm text-slate-700">
          {row.balance.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </td>
        <td className="px-4 py-3">
          <Badge variant={row.isSystem ? "warning" : "default"}>
            {row.isSystem ? "System" : "Custom"}
          </Badge>
        </td>
        <td className="px-4 py-3 text-right">
          <AccountRowActions
            accountId={row.id}
            canArchive={!row.isSystem && !row.isProtected && row.entryCount === 0}
          />
        </td>
      </tr>,
      ...renderAccountRows(row.id, rows, depth + 1),
    ]);
}

export default async function ChartOfAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "list" ? "list" : "tree";
  const result = await getChartOfAccounts();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const accounts = result.data;
  const parentOptions = accounts
    .filter((account) => account.isActive)
    .map((account) => ({
      id: account.id,
      code: account.code,
      name: account.name,
    }));

  const listRows = [...accounts].sort((left, right) => left.code.localeCompare(right.code));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review seeded control accounts, create custom accounts, and inspect usage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 text-sm">
            <Link
              href="/app/books/chart-of-accounts?view=tree"
              className={`rounded-lg px-3 py-1.5 ${view === "tree" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              Tree
            </Link>
            <Link
              href="/app/books/chart-of-accounts?view=list"
              className={`rounded-lg px-3 py-1.5 ${view === "list" ? "bg-slate-900 text-white" : "text-slate-600"}`}
              >
                List
              </Link>
          </div>
          <ExportBooksReportButton
            report="chart-of-accounts"
            filenamePrefix="books-chart-of-accounts"
            disabled={accounts.length === 0}
          />
          <CreateAccountModal parentOptions={parentOptions} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Accounts</h2>
              <p className="mt-1 text-sm text-slate-500">
                {accounts.length} accounts across system and custom structures.
              </p>
            </div>
            <Badge variant="default">{view.toUpperCase()} view</Badge>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Normal</th>
                  <th className="px-4 py-3">Entries</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {view === "tree"
                  ? renderAccountRows(null, accounts)
                  : listRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.code}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          <div className="font-medium">{row.name}</div>
                          {row.parentName && (
                            <div className="text-xs text-slate-500">Parent: {row.parentName}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.accountType}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.normalBalance}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{row.entryCount}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {row.balance.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={row.isSystem ? "warning" : "default"}>
                            {row.isSystem ? "System" : "Custom"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <AccountRowActions
                            accountId={row.id}
                            canArchive={!row.isSystem && !row.isProtected && row.entryCount === 0}
                          />
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
