import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksAccountsPayableAging } from "../../actions";
import { ExportBooksReportButton } from "../../components/export-books-report-button";
import { booksStatusBadgeVariant, formatBooksMoney } from "../../view-helpers";

export const metadata = {
  title: "AP Aging | Slipwise",
};

interface AccountsPayableAgingPageProps {
  searchParams: Promise<{
    asOfDate?: string;
  }>;
}

export default async function AccountsPayableAgingPage({
  searchParams,
}: AccountsPayableAgingPageProps) {
  const params = await searchParams;
  const filters = { asOfDate: params.asOfDate };
  const result = await getBooksAccountsPayableAging(filters);

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
            <h1 className="text-2xl font-semibold text-slate-900">Accounts Payable Aging</h1>
            <Badge variant={Math.abs(report.variance) <= 0.01 ? "success" : "warning"}>
              {Math.abs(report.variance) <= 0.01 ? "Tied Out" : "Variance"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Vendor-bill aging based on open AP balances and payable control-account totals.
          </p>
        </div>

        <ExportBooksReportButton
          report="ap-aging"
          filenamePrefix="books-ap-aging"
          filters={filters}
          label="Export CSV"
        />
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">As of date</span>
              <input type="date" name="asOfDate" defaultValue={params.asOfDate ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <Button type="submit" variant="secondary">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Outstanding", value: formatBooksMoney(report.totalOutstanding) },
          { label: "GL Balance", value: formatBooksMoney(report.glBalance) },
          { label: "Variance", value: formatBooksMoney(report.variance) },
          { label: "Open Bills", value: String(report.rows.length) },
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
          <h2 className="text-lg font-semibold text-slate-900">Buckets</h2>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {report.buckets.map((bucket) => (
            <div key={bucket.label} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{bucket.label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatBooksMoney(bucket.total)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {bucket.count} bill{bucket.count === 1 ? "" : "s"} • {bucket.percentage}%
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Open payables</h2>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Bill</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Dates</th>
                  <th className="px-6 py-3">Outstanding</th>
                  <th className="px-6 py-3">Bucket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{row.number}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{row.partyName ?? "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div>Bill {row.issueDate}</div>
                      <div className="text-xs text-slate-500">Due {row.dueDate ?? "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{formatBooksMoney(row.outstandingAmount)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={booksStatusBadgeVariant(row.daysOverdue > 0 ? "OVERDUE" : "CURRENT")}>
                        {row.bucket}
                      </Badge>
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
