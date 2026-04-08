import { notFound } from "next/navigation";
import { getPublicQuote } from "./actions";
import { QuoteActions } from "./quote-actions";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicQuote(token);

  if (!result.success) {
    notFound();
  }

  const { quote } = result.data;
  const isExpired = quote.status === "SENT" && new Date(quote.validUntil) < new Date();

  return (
    <div className="space-y-6">
      {/* Expired Banner */}
      {(quote.status === "EXPIRED" || isExpired) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg font-semibold text-amber-800">This quote has expired</span>
          </div>
          <p className="mt-1 text-sm text-amber-600">
            This quote was valid until {formatDate(quote.validUntil)}. Please contact us for a new quote.
          </p>
        </div>
      )}

      {/* Accepted Banner */}
      {quote.status === "ACCEPTED" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg font-semibold text-green-800">Quote Accepted</span>
          </div>
          {quote.acceptedAt && (
            <p className="mt-1 text-sm text-green-600">
              Accepted on {formatDate(quote.acceptedAt)}
            </p>
          )}
        </div>
      )}

      {/* Declined Banner */}
      {quote.status === "DECLINED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg font-semibold text-red-800">Quote Declined</span>
          </div>
          {quote.declinedAt && (
            <p className="mt-1 text-sm text-red-600">
              Declined on {formatDate(quote.declinedAt)}
            </p>
          )}
          {quote.declineReason && (
            <p className="mt-2 text-sm text-red-700">
              Reason: {quote.declineReason}
            </p>
          )}
        </div>
      )}

      {/* Converted Banner */}
      {quote.status === "CONVERTED" && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-lg font-semibold text-indigo-800">Quote Converted to Invoice</span>
          </div>
        </div>
      )}

      {/* Quote Card */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Accent Bar */}
        <div className="h-1.5 bg-red-600" />

        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {quote.organization.name}
              </h1>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold uppercase tracking-wide text-red-600">
                Quote
              </h2>
              <p className="mt-1 text-lg font-semibold text-slate-900">#{quote.quoteNumber}</p>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[quote.status] || "bg-slate-100 text-slate-700"}`}
              >
                {quote.status}
              </span>
            </div>
          </div>
          {quote.title && (
            <p className="mt-2 text-lg text-slate-700">{quote.title}</p>
          )}
        </div>

        {/* Meta & Client */}
        <div className="border-t border-slate-100 px-8 py-6 grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Prepared For</h3>
            <div>
              <p className="font-medium text-slate-900">{quote.customer.name}</p>
              {quote.customer.email && (
                <p className="text-sm text-slate-500">{quote.customer.email}</p>
              )}
              {quote.customer.phone && (
                <p className="text-sm text-slate-500">{quote.customer.phone}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Date: </span>
                <span className="text-sm text-slate-700">{formatDate(quote.issueDate)}</span>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Valid Until: </span>
                <span className="text-sm text-slate-700">{formatDate(quote.validUntil)}</span>
              </div>
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

      {/* Accept / Decline Actions */}
      {quote.status === "SENT" && !isExpired && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Respond to this Quote</h2>
          <p className="text-sm text-slate-500 mb-6">
            Please review the quote above and accept or decline it.
          </p>
          <QuoteActions token={token} status={quote.status} />
        </div>
      )}
    </div>
  );
}
