import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksPaymentRun } from "../../actions";
import { ExportBooksReportButton } from "../../components/export-books-report-button";
import { PaymentRunDetailActions } from "../../components/payment-run-detail-actions";
import { PaymentRunItemFailureButton } from "../../components/payment-run-item-failure-button";
import { booksStatusBadgeVariant, formatBooksDate, formatBooksMoney } from "../../view-helpers";

export const metadata = {
  title: "Payment Run Detail | Slipwise",
};

interface PaymentRunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentRunDetailPage({ params }: PaymentRunDetailPageProps) {
  const { id } = await params;
  const result = await getBooksPaymentRun(id);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{result.error}</div>
      </div>
    );
  }

  const run = result.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/app/books/payment-runs" className="text-sm font-medium text-blue-600 hover:underline">
            ← Back to Payment Runs
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">{run.runNumber}</h1>
            <Badge variant={booksStatusBadgeVariant(run.status)}>{run.status.replaceAll("_", " ")}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Scheduled {formatBooksDate(run.scheduledDate)} • {run.items.length} payout item
            {run.items.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportBooksReportButton
            report="payment-run-payout"
            filenamePrefix={`payment-run-${run.runNumber.toLowerCase()}`}
            paymentRunId={run.id}
            disabled={run.items.length === 0}
            label="Export Payout CSV"
          />
          <PaymentRunDetailActions paymentRunId={run.id} status={run.status} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Amount", value: formatBooksMoney(run.totalAmount) },
          { label: "Pending Items", value: String(run.items.filter((item) => item.status === "PENDING").length) },
          { label: "Paid Items", value: String(run.items.filter((item) => item.status === "PAID").length) },
          { label: "Failed Items", value: String(run.items.filter((item) => item.status === "FAILED").length) },
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
          <h2 className="text-lg font-semibold text-slate-900">Batch summary</h2>
          <p className="mt-1 text-sm text-slate-500">
            Approval state, execution timestamps, and payout notes for this batch.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Requested</p>
            <p className="mt-1 text-sm text-slate-900">{formatBooksDate(run.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Approved</p>
            <p className="mt-1 text-sm text-slate-900">{formatBooksDate(run.approvedAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Executed</p>
            <p className="mt-1 text-sm text-slate-900">{formatBooksDate(run.executedAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Notes</p>
            <p className="mt-1 text-sm text-slate-900">{run.notes || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Run items</h2>
          <p className="mt-1 text-sm text-slate-500">
            Each payout line tracks approved amount, execution evidence, and failure handling.
          </p>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Bill</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Amounts</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {run.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{item.vendorBill.billNumber}</div>
                      <div className="text-xs text-slate-500">Due {formatBooksDate(item.vendorBill.dueDate)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{item.vendorBill.vendor?.name ?? "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div>Proposed {formatBooksMoney(item.proposedAmount)}</div>
                      <div className="text-xs text-slate-500">
                        Approved {formatBooksMoney(item.approvedAmount ?? item.proposedAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={booksStatusBadgeVariant(item.status)}>{item.status}</Badge>
                        {item.executedPayment && (
                          <Badge variant={booksStatusBadgeVariant(item.executedPayment.status)}>
                            {item.executedPayment.status}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {["PENDING", "APPROVED"].includes(item.status) &&
                      ["APPROVED", "PROCESSING"].includes(run.status) ? (
                        <PaymentRunItemFailureButton
                          paymentRunId={run.id}
                          paymentRunItemId={item.id}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">No action</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Executed payments</h2>
          <p className="mt-1 text-sm text-slate-500">Payout evidence recorded against this run.</p>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Paid At</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {run.payments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                      No payments have been executed for this run yet.
                    </td>
                  </tr>
                ) : (
                  run.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatBooksDate(payment.paidAt)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatBooksMoney(payment.amount)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{payment.method ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {payment.externalReferenceId ?? payment.externalPaymentId ?? "—"}
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
