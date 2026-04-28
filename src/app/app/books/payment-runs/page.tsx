import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksPaymentRunOptions, getBooksPaymentRuns } from "../actions";
import { CreatePaymentRunForm } from "../components/create-payment-run-form";
import { booksStatusBadgeVariant, formatBooksDate, formatBooksMoney } from "../view-helpers";

export const metadata = {
  title: "Payment Runs | Slipwise",
};

interface PaymentRunsPageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
}

export default async function PaymentRunsPage({ searchParams }: PaymentRunsPageProps) {
  const params = await searchParams;
  const [runsResult, optionsResult] = await Promise.all([
    getBooksPaymentRuns({
      status: params.status as never,
      page: params.page ? Number.parseInt(params.page, 10) : undefined,
    }),
    getBooksPaymentRunOptions(),
  ]);

  if (!runsResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{runsResult.error}</div>
      </div>
    );
  }

  if (!optionsResult.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{optionsResult.error}</div>
      </div>
    );
  }

  const { runs, total, page, totalPages } = runsResult.data;
  const { bills } = optionsResult.data;
  const totalScheduled = runs.reduce((sum, run) => sum + run.totalAmount, 0);
  const pendingApprovalCount = runs.filter((run) => run.status === "PENDING_APPROVAL").length;
  const processingCount = runs.filter((run) => run.status === "PROCESSING").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payment Runs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Batch approved payables, route approvals, and track payout execution outcomes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/app/books/vendor-bills">
            <Button variant="secondary">Vendor Bills</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Runs in View", value: String(runs.length) },
          { label: "Pending Approval", value: String(pendingApprovalCount) },
          { label: "Processing", value: String(processingCount) },
          { label: "Total Value", value: formatBooksMoney(totalScheduled) },
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

      <CreatePaymentRunForm bills={bills} />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Filter payment runs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review batches by lifecycle state and audit what is still waiting to be released.
          </p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4 md:flex-row md:items-end">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Status</span>
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All statuses</option>
                {[
                  "DRAFT",
                  "PENDING_APPROVAL",
                  "APPROVED",
                  "PROCESSING",
                  "COMPLETED",
                  "FAILED",
                  "CANCELLED",
                  "REJECTED",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="secondary">
                Apply
              </Button>
              <Link href="/app/books/payment-runs" className="text-sm font-medium text-slate-600 hover:underline">
                Reset
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Run history</h2>
            <p className="mt-1 text-sm text-slate-500">
              {total} payment run{total === 1 ? "" : "s"} across {totalPages} page{totalPages === 1 ? "" : "s"}.
            </p>
          </div>
          <Badge variant="default">Page {page}</Badge>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Run</th>
                  <th className="px-6 py-3">Schedule</th>
                  <th className="px-6 py-3">Items</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                      No payment runs found for the current filter.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{run.runNumber}</div>
                        <div className="text-xs text-slate-500">
                          {run.approvalRequests.length} pending approval request
                          {run.approvalRequests.length === 1 ? "" : "s"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <div>{formatBooksDate(run.scheduledDate)}</div>
                        <div className="text-xs text-slate-500">Created {formatBooksDate(run.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {run.items.length} bill{run.items.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatBooksMoney(run.totalAmount)}</td>
                      <td className="px-6 py-4">
                        <Badge variant={booksStatusBadgeVariant(run.status)}>{run.status.replaceAll("_", " ")}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/app/books/payment-runs/${run.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          View Detail
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

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-4 text-sm">
          {page > 1 && (
            <Link
              href={`/app/books/payment-runs?${new URLSearchParams({
                ...(params.status ? { status: params.status } : {}),
                page: String(page - 1),
              }).toString()}`}
              className="font-medium text-blue-600 hover:underline"
            >
              ← Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/app/books/payment-runs?${new URLSearchParams({
                ...(params.status ? { status: params.status } : {}),
                page: String(page + 1),
              }).toString()}`}
              className="font-medium text-blue-600 hover:underline"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
