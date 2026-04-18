import { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireOrgContext } from "@/lib/auth/require-org";
import { db } from "@/lib/db";
import {
  getConsolidatedProfitAndLoss,
  getConsolidatedBalanceSheet,
} from "@/lib/multi-entity/consolidation";

export const metadata: Metadata = { title: "Consolidated Reports | Intel" };

function MoneyCell({ amount, currency = "INR" }: { amount: number; currency?: string }) {
  const formatted = Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (
    <span className={amount < 0 ? "text-red-600" : "text-slate-800"}>
      {amount < 0 ? "(" : ""}
      {currency} {formatted}
      {amount < 0 ? ")" : ""}
    </span>
  );
}

interface SearchParams {
  groupId?: string;
  startDate?: string;
  endDate?: string;
}

export default async function ConsolidationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { orgId } = await requireOrgContext();

  // Find all groups where this org is the admin
  const adminGroup = await db.entityGroup.findUnique({
    where: { adminOrgId: orgId },
    select: { id: true, name: true },
  });

  if (!adminGroup) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Consolidated Reports</h1>
        <Card className="mt-8">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            <p>
              No entity group found. This organisation must be a group admin to view consolidated
              reports.
            </p>
            <a
              href="/app/settings/entities"
              className="mt-3 inline-block text-sm font-medium text-[#dc2626] hover:underline"
            >
              Set up Entity Group →
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groupId = params.groupId ?? adminGroup.id;
  const startDate = params.startDate;
  const endDate = params.endDate;

  const [plResult, bsResult] = await Promise.all([
    getConsolidatedProfitAndLoss(groupId, { startDate, endDate }).catch((e: Error) => ({
      error: e.message,
    })),
    getConsolidatedBalanceSheet(groupId, endDate).catch((e: Error) => ({ error: e.message })),
  ]);

  const plError = "error" in plResult ? plResult.error : null;
  const bsError = "error" in bsResult ? bsResult.error : null;
  const pl = "entityGroupId" in plResult ? plResult : null;
  const bs = "entityGroupId" in bsResult ? bsResult : null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Consolidated Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Group: <strong>{adminGroup.name}</strong>
          </p>
        </div>
        <form method="GET" className="flex flex-wrap items-end gap-2 text-sm">
          <div className="flex flex-col gap-1">
            <label htmlFor="startDate" className="text-xs text-slate-500">
              Start Date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={startDate}
              className="h-8 rounded border border-slate-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="endDate" className="text-xs text-slate-500">
              End Date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={endDate}
              className="h-8 rounded border border-slate-300 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#dc2626]"
            />
          </div>
          <button
            type="submit"
            className="h-8 rounded bg-[#dc2626] px-3 text-xs font-medium text-white hover:bg-[#b91c1c]"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Consolidated P&L */}
      {plError ? (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">{plError}</CardContent>
        </Card>
      ) : pl ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">Consolidated Profit & Loss</h2>
            {(pl.period.startDate || pl.period.endDate) && (
              <p className="mt-0.5 text-xs text-slate-500">
                {pl.period.startDate} – {pl.period.endDate}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-xs text-slate-500">
                <tr>
                  <th className="pb-2 text-left font-medium">Entity</th>
                  <th className="pb-2 text-right font-medium">Income</th>
                  <th className="pb-2 text-right font-medium">Expenses</th>
                  <th className="pb-2 text-right font-medium">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pl.entityBreakdown.map((e) => (
                  <tr key={e.orgId}>
                    <td className="py-2 font-medium text-slate-800">{e.orgName}</td>
                    <td className="py-2 text-right">
                      <MoneyCell amount={e.income.reduce((s, r) => s + r.total, 0)} />
                    </td>
                    <td className="py-2 text-right">
                      <MoneyCell amount={e.expenses.reduce((s, r) => s + r.total, 0)} />
                    </td>
                    <td className="py-2 text-right font-semibold">
                      <MoneyCell amount={e.netProfit} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 font-semibold">
                <tr>
                  <td className="py-2 text-slate-900">Consolidated Total</td>
                  <td className="py-2 text-right">
                    <MoneyCell amount={pl.consolidated.totalIncome} />
                  </td>
                  <td className="py-2 text-right">
                    <MoneyCell amount={pl.consolidated.totalExpenses} />
                  </td>
                  <td className="py-2 text-right text-lg">
                    <MoneyCell amount={pl.consolidated.netProfit} />
                  </td>
                </tr>
                {pl.consolidated.interCompanyEliminations > 0 && (
                  <tr className="font-normal">
                    <td
                      colSpan={3}
                      className="py-1 text-xs text-slate-400"
                    >
                      Inter-company eliminations
                    </td>
                    <td className="py-1 text-right text-xs text-slate-400">
                      <MoneyCell amount={-pl.consolidated.interCompanyEliminations} />
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {/* Consolidated Balance Sheet */}
      {bsError ? (
        <Card>
          <CardContent className="py-6 text-sm text-red-600">{bsError}</CardContent>
        </Card>
      ) : bs ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-slate-900">
              Consolidated Balance Sheet
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">As of {bs.asOfDate}</p>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-xs text-slate-500">
                <tr>
                  <th className="pb-2 text-left font-medium">Entity</th>
                  <th className="pb-2 text-right font-medium">Total Assets</th>
                  <th className="pb-2 text-right font-medium">Total Liabilities</th>
                  <th className="pb-2 text-right font-medium">Total Equity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bs.entityBreakdown.map((e) => (
                  <tr key={e.orgId}>
                    <td className="py-2 font-medium text-slate-800">{e.orgName}</td>
                    <td className="py-2 text-right">
                      <MoneyCell amount={e.totalAssets} />
                    </td>
                    <td className="py-2 text-right">
                      <MoneyCell amount={e.totalLiabilities} />
                    </td>
                    <td className="py-2 text-right font-semibold">
                      <MoneyCell amount={e.totalEquity} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 font-semibold">
                <tr>
                  <td className="py-2 text-slate-900">Consolidated Total</td>
                  <td className="py-2 text-right">
                    <MoneyCell amount={bs.consolidated.totalAssets} />
                  </td>
                  <td className="py-2 text-right">
                    <MoneyCell amount={bs.consolidated.totalLiabilities} />
                  </td>
                  <td className="py-2 text-right text-lg">
                    <MoneyCell amount={bs.consolidated.totalEquity} />
                  </td>
                </tr>
                {bs.consolidated.interCompanyEliminations > 0 && (
                  <tr className="font-normal">
                    <td
                      colSpan={3}
                      className="py-1 text-xs text-slate-400"
                    >
                      Inter-company eliminations
                    </td>
                    <td className="py-1 text-right text-xs text-slate-400">
                      <MoneyCell amount={-bs.consolidated.interCompanyEliminations} />
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
