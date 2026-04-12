import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksCashFlow } from "../../actions";
import { ExportBooksReportButton } from "../../components/export-books-report-button";
import { formatBooksMoney } from "../../view-helpers";

export const metadata = {
  title: "Cash Flow | Slipwise",
};

interface CashFlowPageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function CashFlowPage({ searchParams }: CashFlowPageProps) {
  const params = await searchParams;
  const filters = {
    startDate: params.startDate,
    endDate: params.endDate,
  };
  const result = await getBooksCashFlow(filters);

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
            <h1 className="text-2xl font-semibold text-slate-900">Cash Flow</h1>
            <Badge variant={Math.abs(report.reconciliationDifference) <= 0.01 ? "success" : "warning"}>
              {Math.abs(report.reconciliationDifference) <= 0.01 ? "Reconciled" : "Difference"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Indirect cash flow built from net profit, working capital deltas, and bank-ledger balances.
          </p>
        </div>

        <ExportBooksReportButton
          report="cash-flow"
          filenamePrefix="books-cash-flow"
          filters={filters}
          label="Export CSV"
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Start date</span>
              <input type="date" name="startDate" defaultValue={params.startDate ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">End date</span>
              <input type="date" name="endDate" defaultValue={params.endDate ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="secondary">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Opening Cash", value: formatBooksMoney(report.openingCash) },
          { label: "Closing Cash", value: formatBooksMoney(report.closingCash) },
          { label: "Net Profit", value: formatBooksMoney(report.netProfit) },
          { label: "Operating Cash", value: formatBooksMoney(report.netCashFromOperating) },
          { label: "Recon Difference", value: formatBooksMoney(report.reconciliationDifference) },
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
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Working capital adjustments</h2>
          <p className="mt-1 text-sm text-slate-500">
            Changes in AR, AP, and tax control accounts that bridge accrual profit to cash movement.
          </p>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Adjustment</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.adjustments.map((row) => (
                  <tr key={row.label}>
                    <td className="px-6 py-4 text-sm text-slate-900">{row.label}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700">{formatBooksMoney(row.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">Total Adjustments</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                    {formatBooksMoney(report.totalAdjustments)}
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">Actual Net Cash Movement</td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                    {formatBooksMoney(report.actualNetCashMovement)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
