import { notFound } from "next/navigation";
import { getPublicInvoice, markAsViewed } from "./actions";
import { ProofUploadForm } from "@/features/pay/components/proof-upload-form";
import { PublicPayButton } from "./pay-button";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ISSUED: "bg-blue-100 text-blue-700",
  VIEWED: "bg-purple-100 text-purple-700",
  DUE: "bg-yellow-100 text-yellow-700",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  DISPUTED: "bg-pink-100 text-pink-700",
  CANCELLED: "bg-slate-200 text-slate-500",
  REISSUED: "bg-indigo-100 text-indigo-700",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const PAID_STATUSES = ["PAID"];

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicInvoice(token);

  if (!result.success) {
    notFound();
  }

  const { invoice } = result.data;

  // Extract and type formData fields
  const rawFormData = invoice.formData as Record<string, unknown> | null;
  const branding = (rawFormData?.branding ?? null) as {
    companyName?: string;
    address?: string;
    email?: string;
    phone?: string;
    logoDataUrl?: string;
    accentColor?: string;
  } | null;
  const visibility = (rawFormData?.visibility ?? null) as Record<string, boolean> | null;

  const accentColor = branding?.accentColor || "#dc2626";
  const notes = typeof rawFormData?.notes === "string" ? rawFormData.notes : "";
  const terms = typeof rawFormData?.terms === "string" ? rawFormData.terms : "";
  const bankName = typeof rawFormData?.bankName === "string" ? rawFormData.bankName : "";
  const bankAccountNumber = typeof rawFormData?.bankAccountNumber === "string" ? rawFormData.bankAccountNumber : "";
  const bankIfsc = typeof rawFormData?.bankIfsc === "string" ? rawFormData.bankIfsc : "";
  const extraCharges = Number(rawFormData?.extraCharges) || 0;
  const invoiceLevelDiscount = Number(rawFormData?.invoiceLevelDiscount) || 0;
  const isPaid = PAID_STATUSES.includes(invoice.status);
  const isPartiallyPaid = invoice.status === "PARTIALLY_PAID";
  const hasPendingProof = invoice.proofs.some((p) => p.reviewStatus === "PENDING");
  const canUploadPaymentProof = invoice.paymentProof.canUpload;

  // Mark as viewed on first render
  await markAsViewed(token);

  return (
    <div className="space-y-6">
      {/* Payment Confirmed Banner */}
      {isPaid && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-lg font-semibold text-green-800">Payment Confirmed</span>
          </div>
          {invoice.paidAt && (
            <p className="mt-1 text-sm text-green-600">
              Paid on {new Date(invoice.paidAt).toLocaleDateString("en-IN")}
            </p>
          )}
        </div>
      )}

      {/* PARTIALLY_PAID Banner */}
      {isPartiallyPaid && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠</span>
            <div>
              <p className="font-semibold text-orange-800">
                Partial payment received.{" "}
                {invoice.amountPaid > 0 && <>{formatCurrency(invoice.amountPaid)} has been paid. </>}
                {invoice.remainingAmount > 0 && <>{formatCurrency(invoice.remainingAmount)} remains outstanding.</>}
              </p>
              {invoice.paymentPromiseDate && (
                <p className="mt-1 text-sm text-orange-700">
                  Next payment expected: {invoice.paymentPromiseDate}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PENDING_PROOF Banner */}
      {hasPendingProof && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <p className="text-sm font-medium text-yellow-800">
              Your payment proof has been submitted and is awaiting review.
            </p>
          </div>
        </div>
      )}

      {/* Invoice Card */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Accent Bar */}
        <div className="h-1.5" style={{ backgroundColor: accentColor }} />

        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {branding?.logoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logoDataUrl}
                  alt="Company logo"
                  className="h-14 w-14 rounded-lg object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {branding?.companyName || invoice.organization.name}
                </h1>
                {branding?.address && (
                  <p className="mt-1 text-sm text-slate-500 whitespace-pre-line">{branding.address}</p>
                )}
                {branding?.email && (
                  <p className="text-sm text-slate-500">{branding.email}</p>
                )}
                {branding?.phone && (
                  <p className="text-sm text-slate-500">{branding.phone}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold uppercase tracking-wide" style={{ color: accentColor }}>
                Invoice
              </h2>
              <p className="mt-1 text-lg font-semibold text-slate-900">#{invoice.invoiceNumber}</p>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[invoice.status] || "bg-slate-100 text-slate-700"}`}
              >
                {invoice.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Meta & Client */}
        <div className="border-t border-slate-100 px-8 py-6 grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Bill To</h3>
            {invoice.customer ? (
              <div>
                <p className="font-medium text-slate-900">{invoice.customer.name}</p>
                {invoice.customer.email ? (
                  <p className="text-sm text-slate-500">{invoice.customer.email}</p>
                ) : null}
                {invoice.customer.phone ? (
                  <p className="text-sm text-slate-500">{invoice.customer.phone}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Date: </span>
                <span className="text-sm text-slate-700">{invoice.invoiceDate}</span>
              </div>
              {invoice.dueDate && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Due: </span>
                  <span className="text-sm text-slate-700">{invoice.dueDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="px-8 pb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b-2" style={{ borderColor: accentColor }}>
                <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Description</th>
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Qty</th>
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Unit Price</th>
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Tax %</th>
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 text-sm text-slate-900">{item.description}</td>
                  <td className="py-3 text-right text-sm text-slate-700">{item.quantity}</td>
                  <td className="py-3 text-right text-sm text-slate-700">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 text-right text-sm text-slate-700">{item.taxRate}%</td>
                  <td className="py-3 text-right text-sm font-medium text-slate-900">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-200 px-8 py-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              {extraCharges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Extra Charges</span>
                  <span className="text-slate-700">{formatCurrency(extraCharges)}</span>
                </div>
              )}
              {invoiceLevelDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-slate-700">−{formatCurrency(invoiceLevelDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-base font-semibold text-slate-900">Total</span>
                <span className="text-base font-bold" style={{ color: accentColor }}>
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status Summary */}
        {(invoice.amountPaid > 0 || invoice.status === "PARTIALLY_PAID" || isPaid) && (
          <div className="border-t border-slate-100 px-8 py-5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Payment Status</h3>
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1.5 text-sm">
                <div className="flex gap-4">
                  <span className="text-slate-500 w-32">Total Amount</span>
                  <span className="font-medium text-slate-900">{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {invoice.amountPaid > 0 && (
                  <div className="flex gap-4">
                    <span className="text-slate-500 w-32">Amount Paid</span>
                    <span className="font-medium text-green-700">{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                )}
                {invoice.remainingAmount > 0 && (
                  <div className="flex gap-4">
                    <span className="text-slate-500 w-32">Remaining</span>
                    <span className="font-medium text-orange-700">{formatCurrency(invoice.remainingAmount)}</span>
                  </div>
                )}
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[invoice.status] || "bg-slate-100 text-slate-700"}`}>
                {invoice.status.replace("_", " ")}
              </span>
            </div>
          </div>
        )}

        {/* Notes & Terms */}
        {((notes && visibility?.showNotes !== false) || (terms && visibility?.showTerms !== false)) && (
          <div className="border-t border-slate-100 px-8 py-6 grid grid-cols-2 gap-8">
            {notes && visibility?.showNotes !== false && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Notes</h3>
                <p className="text-sm text-slate-600 whitespace-pre-line">{notes}</p>
              </div>
            )}
            {terms && visibility?.showTerms !== false && (
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Terms & Conditions</h3>
                <p className="text-sm text-slate-600 whitespace-pre-line">{terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Bank Details */}
        {visibility?.showBankDetails !== false && bankName && (
          <div className="border-t border-slate-100 px-8 py-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Payment Instructions</h3>
            <div className="rounded-lg bg-slate-50 p-4 space-y-1">
              <p className="text-sm text-slate-700">
                <span className="font-medium">Bank:</span> {bankName}
              </p>
              {bankAccountNumber && (
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Account No:</span> {bankAccountNumber}
                </p>
              )}
              {bankIfsc && (
                <p className="text-sm text-slate-700">
                  <span className="font-medium">IFSC:</span> {bankIfsc}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pay Online — Razorpay Payment Link */}
      {canUploadPaymentProof && invoice.razorpayPaymentLinkUrl && (
        <PublicPayButton
          paymentLinkUrl={invoice.razorpayPaymentLinkUrl}
          paymentLinkStatus={invoice.paymentLinkStatus}
          paymentLinkExpiresAt={invoice.paymentLinkExpiresAt}
          remainingAmount={invoice.remainingAmount || invoice.totalAmount}
        />
      )}

      {/* Upload Payment Proof Section */}
      {canUploadPaymentProof && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Upload Payment Proof</h2>
          <p className="text-sm text-slate-500 mb-6">
            Already made a payment? Upload your proof of payment for quick verification.
          </p>
          <ProofUploadForm token={token} invoiceTotal={invoice.totalAmount} remainingAmount={invoice.remainingAmount} />
        </div>
      )}

      {/* Existing Proofs */}
      {invoice.proofs.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-8">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Submitted Proofs</h3>
          <div className="space-y-2">
            {invoice.proofs.map((proof) => (
              <div key={proof.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium text-slate-700">{formatCurrency(proof.amount)}</span>
                  <span className="ml-2 text-slate-400">{new Date(proof.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    proof.reviewStatus === "ACCEPTED"
                      ? "bg-green-100 text-green-700"
                      : proof.reviewStatus === "REJECTED"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {proof.reviewStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raise a Query */}
      <div className="text-center">
        <a
          href={`/invoice/${token}/ticket`}
          className="text-sm text-slate-500 hover:text-slate-700 underline"
        >
          Have a question? Raise a Query
        </a>
      </div>
    </div>
  );
}
