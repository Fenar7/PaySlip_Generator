import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getProofDetail,
  acceptProof,
  rejectProof,
  PROOF_LOAD_ERROR,
  PROOF_NOT_FOUND_ERROR,
} from "../actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const REVIEW_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function isImageFile(fileName: string) {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);
}

export default async function ProofDetailPage({
  params,
}: {
  params: Promise<{ proofId: string }>;
}) {
  const { proofId } = await params;
  const result = await getProofDetail(proofId);

  if (!result.success) {
    const isMissing = result.error === PROOF_NOT_FOUND_ERROR;

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Payment Proof
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">
              {isMissing ? "This proof is no longer available." : "We could not load this proof right now."}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              {isMissing
                ? "The proof may have been removed, moved to another workspace, or the direct link is stale. Open the proof queue from the current workspace to continue the review."
                : "The proof record exists, but a supporting dependency such as storage URL generation failed. Use the queue link below and try again after the dependency issue is resolved."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/app/pay/proofs"
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Open Payment Proofs
              </Link>
              <Link
                href="/app/docs/invoices"
                className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to Invoice Vault
              </Link>
            </div>
            {!isMissing && result.error === PROOF_LOAD_ERROR && (
              <p className="mt-4 text-xs text-slate-400">
                If this keeps happening, check the proof storage configuration for the current environment.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const proof = result.data;
  const isImage = isImageFile(proof.fileName);
  const isPending = proof.reviewStatus === "PENDING";

  async function handleAccept() {
    "use server";
    await acceptProof(proofId);
    redirect("/app/pay/proofs");
  }

  async function handleReject(formData: FormData) {
    "use server";
    const reason = formData.get("reason") as string;
    if (!reason?.trim()) return;
    await rejectProof(proofId, reason.trim());
    redirect("/app/pay/proofs");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Back Link */}
        <Link
          href="/app/pay/proofs"
          className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Proofs
        </Link>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Invoice Summary */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Invoice Summary</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Invoice Number</dt>
                <dd className="text-sm font-medium text-slate-900">{proof.invoice.invoiceNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Customer</dt>
                <dd className="text-sm font-medium text-slate-900">{proof.invoice.customerName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Invoice Total</dt>
                <dd className="text-sm font-medium text-slate-900">{formatCurrency(proof.invoice.totalAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Invoice Status</dt>
                <dd className="text-sm font-medium text-slate-900">{proof.invoice.status.replace("_", " ")}</dd>
              </div>
            </dl>

            <hr className="my-5 border-slate-100" />

            <h3 className="text-sm font-semibold text-slate-900 mb-3">Payment Claimed</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Amount</dt>
                <dd className="text-sm font-bold text-slate-900">{formatCurrency(proof.amount)}</dd>
              </div>
              {proof.paymentDate && (
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Payment Date</dt>
                  <dd className="text-sm text-slate-700">{proof.paymentDate}</dd>
                </div>
              )}
              {proof.paymentMethod && (
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Method</dt>
                  <dd className="text-sm text-slate-700 capitalize">{proof.paymentMethod.replace("_", " ")}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Submitted</dt>
                <dd className="text-sm text-slate-700">
                  {new Date(proof.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-sm text-slate-500">Review Status</dt>
                <dd>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${REVIEW_STATUS_COLORS[proof.reviewStatus] || "bg-slate-100 text-slate-700"}`}>
                    {proof.reviewStatus}
                  </span>
                </dd>
              </div>
            </dl>

            {proof.reviewNote && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-100 p-3">
                <p className="text-xs font-medium text-red-800 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-700">{proof.reviewNote}</p>
              </div>
            )}
          </div>

          {/* Right: Proof File */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Proof File</h2>
            <p className="text-xs text-slate-400 mb-3">{proof.fileName}</p>

            <div className="rounded-lg border border-slate-100 bg-slate-50 overflow-hidden">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proof.fileUrl}
                  alt="Payment proof"
                  className="w-full object-contain max-h-96"
                />
              ) : (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-slate-500 mb-3">PDF Document</p>
                  <a
                    href={proof.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Open PDF
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>

            {/* Reconciliation Preview */}
            {isPending && (
              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Payment Reconciliation Preview</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Invoice Total</dt>
                    <dd className="font-medium text-slate-900">{formatCurrency(proof.invoice.totalAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Already Settled</dt>
                    <dd className="font-medium text-slate-900">{formatCurrency(proof.invoice.amountPaid)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">This Payment Amount</dt>
                    <dd className="font-medium text-slate-900">{formatCurrency(proof.amount)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <dt className="text-slate-500">Remaining After</dt>
                    <dd className="font-medium text-slate-900">
                      {formatCurrency(Math.max(0, proof.invoice.totalAmount - proof.invoice.amountPaid - proof.amount))}
                    </dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-slate-500">Result if Accepted</dt>
                    <dd>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        proof.resultingStatus === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {proof.resultingStatus.replace("_", " ")}
                      </span>
                    </dd>
                  </div>
                  {proof.plannedNextPaymentDate && (
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Customer&apos;s Next Date</dt>
                      <dd className="font-medium text-slate-900">{proof.plannedNextPaymentDate}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Actions */}
            {isPending && (
              <div className="mt-6 space-y-4">
                <form action={handleAccept}>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    ✓ Accept Proof — Mark Invoice as Paid
                  </button>
                </form>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Reject Proof</p>
                  <form action={handleReject} className="space-y-3">
                    <textarea
                      name="reason"
                      required
                      rows={2}
                      placeholder="Reason for rejection (required)..."
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="submit"
                      className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      ✗ Reject Proof
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
