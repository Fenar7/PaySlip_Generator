import { notFound } from "next/navigation";
import Link from "next/link";
import { getQuote, sendQuoteAction, convertQuoteAction, duplicateQuote, deleteQuote } from "../actions";

export const metadata = {
  title: "Quote Detail | Slipwise",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-amber-100 text-amber-700",
  CONVERTED: "bg-indigo-100 text-indigo-700",
};

function formatCurrency(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) {
    notFound();
  }

  const isExpired = quote.status === "SENT" && quote.validUntil < new Date();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/app/docs/quotes"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← Back to Quotes
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {/* Actions based on status */}
            {quote.status === "DRAFT" && (
              <>
                <Link
                  href={`/app/docs/quotes/${quote.id}?edit=true`}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Edit
                </Link>
                <form action={async () => {
                  "use server";
                  await sendQuoteAction(id);
                }}>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    Send Quote
                  </button>
                </form>
                <form action={async () => {
                  "use server";
                  await deleteQuote(id);
                }}>
                  <button
                    type="submit"
                    className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </form>
              </>
            )}
            {quote.status === "ACCEPTED" && (
              <form action={async () => {
                "use server";
                await convertQuoteAction(id);
              }}>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Convert to Invoice
                </button>
              </form>
            )}
            <form action={async () => {
              "use server";
              await duplicateQuote(id);
            }}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Duplicate
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Main Content */}
          <div className="flex-1">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Accent Bar */}
              <div className="h-1.5 bg-red-600" />

              {/* Header Section */}
              <div className="px-8 pt-8 pb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{quote.org.name}</h1>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold uppercase tracking-wide text-red-600">Quote</h2>
                    <p className="mt-1 text-lg font-semibold text-slate-900">#{quote.quoteNumber}</p>
                    <span
                      className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[quote.status] || "bg-slate-100 text-slate-700"}`}
                    >
                      {quote.status}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-lg text-slate-700">{quote.title}</p>
              </div>

              {/* Meta */}
              <div className="border-t border-slate-100 px-8 py-6 grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Customer</h3>
                  <p className="font-medium text-slate-900">{quote.customer.name}</p>
                  {quote.customer.email && (
                    <p className="text-sm text-slate-500">{quote.customer.email}</p>
                  )}
                  {quote.customer.phone && (
                    <p className="text-sm text-slate-500">{quote.customer.phone}</p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Issue Date: </span>
                    <span className="text-sm text-slate-700">{formatDate(quote.issueDate)}</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Valid Until: </span>
                    <span className={`text-sm ${isExpired ? "text-red-600 font-medium" : "text-slate-700"}`}>
                      {formatDate(quote.validUntil)}
                      {isExpired && " (Expired)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="px-8 pb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-red-600">
                      <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Description</th>
                      <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Qty</th>
                      <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Unit Price</th>
                      <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Tax %</th>
                      <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quote.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 text-sm text-slate-900">{item.description}</td>
                        <td className="py-3 text-right text-sm text-slate-700">{item.quantity}</td>
                        <td className="py-3 text-right text-sm text-slate-700">{formatCurrency(item.unitPrice, quote.currency)}</td>
                        <td className="py-3 text-right text-sm text-slate-700">{item.taxRate}%</td>
                        <td className="py-3 text-right text-sm font-medium text-slate-900">{formatCurrency(item.amount, quote.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 px-8 py-6">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="text-slate-700">{formatCurrency(quote.subtotal, quote.currency)}</span>
                    </div>
                    {quote.taxAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Tax</span>
                        <span className="text-slate-700">{formatCurrency(quote.taxAmount, quote.currency)}</span>
                      </div>
                    )}
                    {quote.discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Discount</span>
                        <span className="text-slate-700">−{formatCurrency(quote.discountAmount, quote.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <span className="text-base font-semibold text-slate-900">Total</span>
                      <span className="text-base font-bold text-red-600">
                        {formatCurrency(quote.totalAmount, quote.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              {(quote.notes || quote.termsAndConditions) && (
                <div className="border-t border-slate-100 px-8 py-6 grid grid-cols-2 gap-8">
                  {quote.notes && (
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Notes</h3>
                      <p className="text-sm text-slate-600 whitespace-pre-line">{quote.notes}</p>
                    </div>
                  )}
                  {quote.termsAndConditions && (
                    <div>
                      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Terms & Conditions</h3>
                      <p className="text-sm text-slate-600 whitespace-pre-line">{quote.termsAndConditions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-80">
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
              <h3 className="font-semibold text-slate-900">Quote Details</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[quote.status] || "bg-slate-100 text-slate-700"}`}>
                    {quote.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Currency</span>
                  <span className="text-slate-900">{quote.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-900">{formatDate(quote.createdAt)}</span>
                </div>
                {quote.acceptedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Accepted</span>
                    <span className="text-green-700">{formatDate(quote.acceptedAt)}</span>
                  </div>
                )}
                {quote.declinedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Declined</span>
                    <span className="text-red-700">{formatDate(quote.declinedAt)}</span>
                  </div>
                )}
                {quote.declineReason && (
                  <div>
                    <span className="text-slate-500 block mb-1">Decline Reason</span>
                    <p className="text-sm text-red-700 bg-red-50 rounded px-2 py-1">{quote.declineReason}</p>
                  </div>
                )}
                {quote.convertedInvoiceId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice</span>
                    <Link
                      href={`/app/docs/invoices/${quote.convertedInvoiceId}`}
                      className="text-blue-600 hover:underline"
                    >
                      View Invoice →
                    </Link>
                  </div>
                )}
              </div>

              {/* Public Link */}
              {quote.publicToken && quote.status !== "DRAFT" && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Public Link</h4>
                  <p className="text-xs text-slate-500 break-all bg-slate-50 rounded p-2">
                    {process.env.NEXT_PUBLIC_APP_URL || "https://app.slipwise.app"}/quote/{quote.publicToken}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
