import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksBalanceSheet } from "../../actions";
import { ExportBooksReportButton } from "../../components/export-books-report-button";
import { formatBooksMoney } from "../../view-helpers";

export const metadata = {
  title: "Balance Sheet | Slipwise",
};

interface BalanceSheetPageProps {
  searchParams: Promise<{
    asOfDate?: string;
    compareAsOfDate?: string;
  }>;
}

function SectionTable({
  title,
  subtitle,
  sections,
  variance,
}: {
  title: string;
  subtitle: string;
  sections: Array<{
    label: string;
    rows: Array<{ id: string; code: string; name: string; amount: number }>;
  }>;
  variance: number;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{section.label}</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {section.rows.map((row) => (
                    <tr key={`${section.label}-${row.id}`}>
                      <td className="px-4 py-3 text-sm text-slate-700">{row.code}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{row.name}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-700">{formatBooksMoney(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <span className="font-medium text-slate-900">Balance sheet variance:</span>{" "}
          {formatBooksMoney(variance)}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function BalanceSheetPage({ searchParams }: BalanceSheetPageProps) {
  const params = await searchParams;
  const filters = {
    asOfDate: params.asOfDate,
    compareAsOfDate: params.compareAsOfDate,
  };
  const result = await getBooksBalanceSheet(filters);

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
            <h1 className="text-2xl font-semibold text-slate-900">Balance Sheet</h1>
            <Badge variant={Math.abs(report.current.totals.variance) <= 0.01 ? "success" : "warning"}>
              {Math.abs(report.current.totals.variance) <= 0.01 ? "Balanced" : "Variance"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Assets, liabilities, and equity as of the selected reporting date.
          </p>
        </div>

        <ExportBooksReportButton
          report="balance-sheet"
          filenamePrefix="books-balance-sheet"
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
              <span className="mb-1 block font-medium text-slate-700">As of date</span>
              <input type="date" name="asOfDate" defaultValue={params.asOfDate ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Compare as of</span>
              <input type="date" name="compareAsOfDate" defaultValue={params.compareAsOfDate ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="secondary">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Assets", value: formatBooksMoney(report.current.totals.assets) },
          { label: "Liabilities", value: formatBooksMoney(report.current.totals.liabilities) },
          { label: "Equity", value: formatBooksMoney(report.current.totals.equity) },
          { label: "Variance", value: formatBooksMoney(report.current.totals.variance) },
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

      <SectionTable
        title="Current position"
        subtitle={`As of ${report.current.asOfDate}`}
        sections={[
          { label: "Assets", rows: report.current.assets },
          { label: "Liabilities", rows: report.current.liabilities },
          { label: "Equity", rows: report.current.equity },
        ]}
        variance={report.current.totals.variance}
      />

      {report.comparison && (
        <SectionTable
          title="Comparison position"
          subtitle={`As of ${report.comparison.asOfDate}`}
          sections={[
            { label: "Assets", rows: report.comparison.assets },
            { label: "Liabilities", rows: report.comparison.liabilities },
            { label: "Equity", rows: report.comparison.equity },
          ]}
          variance={report.comparison.totals.variance}
        />
      )}
    </div>
  );
}
