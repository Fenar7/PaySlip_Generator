"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CashPositionSummary } from "../../actions";

interface CashPositionClientProps {
  data: CashPositionSummary;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "amber" | "slate";
}) {
  const valueColors: Record<string, string> = {
    green: "text-green-700",
    red: "text-red-700",
    amber: "text-amber-700",
    slate: "text-slate-800",
  };
  const color = valueColors[accent ?? "slate"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export function CashPositionClient({ data }: CashPositionClientProps) {
  const variance = data.totalBankBalance - data.unreconciledCreditAmount;

  return (
    <div className="space-y-6">
      {/* ── Top-line summary ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total Bank Balance"
          value={formatINR(data.totalBankBalance)}
          accent="green"
        />
        <MetricCard
          label="Unreconciled Credits"
          value={formatINR(data.unreconciledCreditAmount)}
          sub="Not yet matched to invoices"
          accent="amber"
        />
        <MetricCard
          label="This Month — In"
          value={formatINR(data.thisMonthCredits)}
          accent="green"
        />
        <MetricCard
          label="This Month — Out"
          value={formatINR(data.thisMonthDebits)}
          accent="red"
        />
      </div>

      {/* ── Receivables forecast ── */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Overdue / Due in 7 Days"
          value={formatINR(data.invoicesDueIn7Days.totalAmount)}
          sub={`${data.invoicesDueIn7Days.count} invoice${data.invoicesDueIn7Days.count !== 1 ? "s" : ""}`}
          accent={data.invoicesDueIn7Days.totalAmount > 0 ? "red" : "slate"}
        />
        <MetricCard
          label="Due in 30 Days"
          value={formatINR(data.invoicesDueIn30Days.totalAmount)}
          sub={`${data.invoicesDueIn30Days.count} invoice${data.invoicesDueIn30Days.count !== 1 ? "s" : ""}`}
          accent="slate"
        />
      </div>

      {/* ── Per-account breakdown ── */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3 pt-4">
          <h2 className="text-sm font-semibold text-slate-800">Account Balances</h2>
        </CardHeader>
        <CardContent className="p-0">
          {data.accounts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No active bank accounts found.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 text-left">Account</th>
                  <th className="px-4 py-2 text-left">Bank</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                  <th className="px-4 py-2 text-right">Last Import</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{acc.name}</td>
                    <td className="px-4 py-3 text-slate-500">{acc.bankName ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                      {acc.runningBalance !== null
                        ? formatINR(acc.runningBalance)
                        : formatINR(acc.openingBalance)}
                      {acc.runningBalance === null && (
                        <span className="ml-1 text-xs text-slate-400">(opening)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatDate(acc.lastTxnDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {formatINR(data.totalBankBalance)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Net cash position note ── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span className="font-medium">Net available (estimated):</span>{" "}
        <span className="font-mono font-semibold text-slate-800">{formatINR(variance)}</span>
        <span className="ml-2 text-xs text-slate-400">
          (total bank balance minus unreconciled credits)
        </span>
      </div>
    </div>
  );
}
