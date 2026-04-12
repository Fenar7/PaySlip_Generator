import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CreateBankAccountModal } from "../components/create-bank-account-modal";
import { getBooksBankAccounts } from "../actions";

export const metadata = {
  title: "Bank Accounts | Slipwise",
};

export default async function BooksBanksPage() {
  const result = await getBooksBankAccounts();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const accounts = result.data;
  const activeCount = accounts.filter((account) => account.isActive).length;
  const primaryCount = accounts.filter((account) => account.isPrimary).length;
  const pendingTxnCount = accounts.reduce((sum, account) => sum + account.pendingTxnCount, 0);
  const importCount = accounts.reduce((sum, account) => sum + account.importCount, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bank Accounts</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage cash, bank, petty cash, and gateway-clearing accounts used by reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/app/books/reconciliation">
            <Button variant="secondary">Open Reconciliation</Button>
          </Link>
          <CreateBankAccountModal />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active Accounts", value: activeCount.toString() },
          { label: "Primary Accounts", value: primaryCount.toString() },
          { label: "Pending Bank Lines", value: pendingTxnCount.toString() },
          { label: "Statement Imports", value: importCount.toString() },
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
            <h2 className="text-lg font-semibold text-slate-900">Registered accounts</h2>
            <p className="mt-1 text-sm text-slate-500">
              Each account links to a dedicated ledger account and import profile.
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Account</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Ledger</th>
                  <th className="px-6 py-3">Currency</th>
                  <th className="px-6 py-3">Opening Balance</th>
                  <th className="px-6 py-3">Imports</th>
                  <th className="px-6 py-3">Open Items</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500">
                      No bank accounts yet. Add your first account to start importing statements.
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-slate-900">{account.name}</div>
                          {account.isPrimary && <Badge variant="success">Primary</Badge>}
                        </div>
                        <div className="text-xs text-slate-500">
                          {account.bankName ?? "Internal cash account"}
                          {account.maskedAccountNo ? ` • ${account.maskedAccountNo}` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {account.type.replaceAll("_", " ")}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {account.glAccount.code} — {account.glAccount.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{account.currency}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {account.openingBalance.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{account.importCount}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{account.pendingTxnCount}</td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/app/books/reconciliation?bankAccountId=${account.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          Reconcile
                        </Link>
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
