import { Suspense } from "react";
import Link from "next/link";
import { getArrangementAction, recordPaymentAction, cancelArrangementAction } from "../actions";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Arrangement Detail | Slipwise",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  DEFAULTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-200 text-slate-500",
};

const INSTALLMENT_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  WAIVED: "bg-slate-200 text-slate-500",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function RecordPaymentForm({
  installmentId,
  amount,
}: {
  installmentId: string;
  amount: number;
}) {
  async function handleRecordPayment(formData: FormData) {
    "use server";
    const paymentAmount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("paymentMethod") as string;
    const reference = (formData.get("reference") as string) || undefined;

    if (!paymentAmount || !paymentMethod) return;

    await recordPaymentAction(installmentId, {
      amount: paymentAmount,
      paymentMethod,
      reference,
    });
  }

  return (
    <form action={handleRecordPayment} className="inline-flex items-center gap-2">
      <input type="hidden" name="amount" value={amount} />
      <select
        name="paymentMethod"
        required
        className="rounded border border-slate-300 px-2 py-1 text-xs"
      >
        <option value="">Method...</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="upi">UPI</option>
        <option value="cash">Cash</option>
        <option value="cheque">Cheque</option>
        <option value="card">Card</option>
      </select>
      <input
        type="text"
        name="reference"
        placeholder="Ref #"
        className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
      >
        Record Payment
      </button>
    </form>
  );
}

async function CancelArrangementForm({ arrangementId }: { arrangementId: string }) {
  async function handleCancel(formData: FormData) {
    "use server";
    const reason = (formData.get("reason") as string) || undefined;
    const result = await cancelArrangementAction(arrangementId, reason);
    if (result.success) {
      redirect("/app/pay/arrangements");
    }
  }

  return (
    <form action={handleCancel} className="flex items-center gap-2">
      <input
        type="text"
        name="reason"
        placeholder="Cancellation reason (optional)"
        className="rounded border border-slate-300 px-3 py-1.5 text-sm w-64"
      />
      <button
        type="submit"
        className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        onClick={(e) => {
          if (!confirm("Are you sure you want to cancel this arrangement?")) {
            e.preventDefault();
          }
        }}
      >
        Cancel Arrangement
      </button>
    </form>
  );
}

function InstallmentTimeline({
  installments,
}: {
  installments: Array<{
    installmentNumber: number;
    dueDate: Date;
    amount: number;
    status: string;
    paidAt: Date | null;
  }>;
}) {
  const dotColors: Record<string, string> = {
    PENDING: "bg-yellow-400",
    PAID: "bg-green-500",
    OVERDUE: "bg-red-500",
    WAIVED: "bg-slate-300",
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
      <div className="space-y-4">
        {installments.map((inst) => (
          <div key={inst.installmentNumber} className="relative flex items-start gap-4 pl-10">
            <div className={`absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-white ${dotColors[inst.status] || "bg-slate-300"}`} />
            <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  Installment #{inst.installmentNumber}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${INSTALLMENT_COLORS[inst.status] || "bg-slate-100"}`}>
                  {inst.status}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                <span>Due: {formatDate(inst.dueDate)}</span>
                <span className="font-medium text-slate-700">{formatCurrency(inst.amount)}</span>
                {inst.paidAt && <span className="text-green-600">Paid: {formatDate(inst.paidAt)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function ArrangementDetail({ id }: { id: string }) {
  const result = await getArrangementAction(id);

  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">{result.error}</p>
        <Link href="/app/pay/arrangements" className="mt-2 text-sm text-blue-600 hover:underline">
          ← Back to arrangements
        </Link>
      </div>
    );
  }

  const arr = result.data;
  const paidCount = arr.installments.filter((i) => i.status === "PAID").length;
  const paidAmount = arr.installments
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* Invoice Info */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-3">Invoice</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Invoice #</p>
            <p className="text-sm font-medium text-slate-900">{arr.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Customer</p>
            <p className="text-sm font-medium text-slate-900">{arr.customerName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Invoice Total</p>
            <p className="text-sm font-medium text-slate-900">{formatCurrency(arr.invoiceTotalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Invoice Status</p>
            <p className="text-sm font-medium text-slate-900">{arr.invoiceStatus.replace(/_/g, " ")}</p>
          </div>
        </div>
      </div>

      {/* Arrangement Summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Arrangement</h2>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[arr.status] || "bg-slate-100"}`}>
            {arr.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Total Arranged</p>
            <p className="text-sm font-medium text-slate-900">{formatCurrency(arr.totalArranged)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Paid So Far</p>
            <p className="text-sm font-medium text-green-700">{formatCurrency(paidAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Installments</p>
            <p className="text-sm font-medium text-slate-900">{paidCount} / {arr.installmentCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Created By</p>
            <p className="text-sm font-medium text-slate-900">{arr.createdByName || "—"}</p>
          </div>
        </div>
        {arr.notes && (
          <div className="mt-3 rounded bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Notes</p>
            <p className="text-sm text-slate-700">{arr.notes}</p>
          </div>
        )}
      </div>

      {/* Installments Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500">Installments</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Due Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Paid Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {arr.installments.map((inst) => (
              <tr key={inst.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{inst.installmentNumber}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{formatDate(inst.dueDate)}</td>
                <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">{formatCurrency(inst.amount)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${INSTALLMENT_COLORS[inst.status] || "bg-slate-100"}`}>
                    {inst.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {inst.paidAt ? formatDate(inst.paidAt) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {(inst.status === "PENDING" || inst.status === "OVERDUE") && arr.status === "ACTIVE" ? (
                    <RecordPaymentForm installmentId={inst.id} amount={inst.amount} />
                  ) : (
                    inst.paymentMethod && (
                      <span className="text-xs text-slate-500">
                        {inst.paymentMethod.replace(/_/g, " ")}
                        {inst.paymentReference && ` • ${inst.paymentReference}`}
                      </span>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-4">Timeline</h2>
        <InstallmentTimeline installments={arr.installments} />
      </div>

      {/* Cancel button for active arrangements */}
      {arr.status === "ACTIVE" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h3 className="text-sm font-medium text-red-800 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-600 mb-3">
            Cancelling this arrangement will waive remaining installments and resume dunning on the invoice.
          </p>
          <CancelArrangementForm arrangementId={arr.id} />
        </div>
      )}
    </div>
  );
}

export default async function ArrangementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/app/pay/arrangements" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to Arrangements
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Arrangement Detail</h1>
        </div>

        <Suspense fallback={<div className="py-8 text-center text-slate-500">Loading arrangement...</div>}>
          <ArrangementDetail id={id} />
        </Suspense>
      </div>
    </div>
  );
}
