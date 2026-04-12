import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksProfitLoss } from "../../actions";
import { ExportBooksReportButton } from "../../components/export-books-report-button";
import { formatBooksMoney } from "../../view-helpers";

export const metadata = {
  title: "Profit & Loss | Slipwise",
};

interface ProfitLossPageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    compareStartDate?: string;
    compareEndDate?: string;
  }>;
}

function StatementTable({
  title,
  subtitle,
  income,
  expenses,
  netProfit,
}: {
  title: string;
  subtitle: string;
  income: Array<{ id: string; code: string; name: string; amount: number }>;
  expenses: Array<{ id: string; code: string; name: string; amount: number }>;
  netProfit: number;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="px-0 py-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Section</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {income.map((row) => (
                <tr key={`${title}-income-${row.id}`}>
                  <td className="px-6 py-4 text-sm text-slate-700">Income</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{row.code}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">{row.name}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-700">{formatBooksMoney(row.amount)}</td>
                </tr>
              ))}
              {expenses.map((row) => (
                <tr key={`${title}-expense-${row.id}`}>
                  <td className="px-6 py-4 text-sm text-slate-700">Expense</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{row.code}</td>
                  <td className="px-6 py-4 text-sm text-slate-900">{row.name}</td>
                  <td className="px-6 py-4 text-right text-sm text-slate-700">{formatBooksMoney(row.amount)}</td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td className="px-6 py-4 text-sm font-medium text-slate-900" colSpan={3}>
                  Net Profit
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                  {formatBooksMoney(netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ProfitLossPage({ searchParams }: ProfitLossPageProps) {
  const params = await searchParams;
  const filters = {
    startDate: params.startDate,
    endDate: params.endDate,
    compareStartDate: params.compareStartDate,
    compareEndDate: params.compareEndDate,
  };
  const result = await getBooksProfitLoss(filters);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const report = result.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">Profit &amp; Loss</h1>
            <Badge variant={report.current.totals.netProfit >= 0 ? "success" : "warning"}>
              {report.current.totals.netProfit >= 0 ? "Profit" : "Loss"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Period income, expenses, and comparison reporting derived from posted ledger balances.
          </p>
        </div>

        <ExportBooksReportButton
          report="profit-loss"
          filenamePrefix="books-profit-loss"
          filters={filters}
          label="Export CSV"
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Start date</span>
              <input type="date" name="startDate" defaultValue={params.startDate ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">End date</span>
              <input type="date" name="endDate" defaultValue={params.endDate ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Compare start</span>
              <input type="date" name="compareStartDate" defaultValue={params.compareStartDate ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Compare end</span>
              <input type="date" name="compareEndDate" defaultValue={params.compareEndDate ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end gap-3 md:col-span-2 xl:col-span-4">
              <Button type="submit" variant="secondary">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Current Income", value: formatBooksMoney(report.current.totals.income) },
          { label: "Current Expenses", value: formatBooksMoney(report.current.totals.expenses) },
          { label: "Net Profit", value: formatBooksMoney(report.current.totals.netProfit) },
          {
            label: "Comparison Net",
            value: report.comparison ? formatBooksMoney(report.comparison.totals.netProfit) : "—",
          },
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

      <StatementTable
        title="Current period"
        subtitle={`${report.current.period.startDate} to ${report.current.period.endDate}`}
        income={report.current.income}
        expenses={report.current.expenses}
        netProfit={report.current.totals.netProfit}
      />

      {report.comparison && (
        <StatementTable
          title="Comparison period"
          subtitle={`${report.comparison.period.startDate} to ${report.comparison.period.endDate}`}
          income={report.comparison.income}
          expenses={report.comparison.expenses}
          netProfit={report.comparison.totals.netProfit}
        />
      )}
    </div>
  );
}
