import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExtractionReviewDetailAction } from "../actions";

export const metadata: Metadata = { title: "Review Extraction — SW Intel" };

const VALIDATION_CONFIG: Record<string, string> = {
  valid: "text-green-700 bg-green-50 border-green-200",
  invalid: "text-red-700 bg-red-50 border-red-200",
  warning: "text-yellow-700 bg-yellow-50 border-yellow-200",
  unverified: "text-slate-500 bg-slate-50 border-slate-200",
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500">{pct}%</span>
    </div>
  );
}

export default async function ExtractionReviewDetailPage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  const result = await getExtractionReviewDetailAction(reviewId);

  if (!result.success) {
    if (result.error?.includes("plan")) {
      return (
        <div className="mx-auto max-w-xl py-20 text-center">
          <p className="text-sm text-slate-500">{result.error}</p>
          <Link href="/app/billing" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
            Upgrade plan
          </Link>
        </div>
      );
    }
    return notFound();
  }

  const review = result.data;
  if (!review) return notFound();

  const isReviewable = review.status === "NEEDS_REVIEW";
  const canPromote = review.status === "APPROVED";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/app/intel/document-intelligence" className="text-xs text-slate-400 hover:text-slate-600">
          ← Back to Document Intelligence
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="flex-1 text-xl font-semibold text-slate-900">
            {review.targetType ?? "Document"} Extraction Review
          </h1>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500">
            {review.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">Review ID: {review.id}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {isReviewable && (
          <form action={`/api/intel/extraction/${reviewId}/approve`} method="POST">
            <button
              type="submit"
              className="rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100"
            >
              Approve Review
            </button>
          </form>
        )}
        {canPromote && (
          <form action={`/api/intel/extraction/${reviewId}/promote`} method="POST">
            <button
              type="submit"
              className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-100"
            >
              Promote to Draft
            </button>
          </form>
        )}
        {(isReviewable || review.status === "APPROVED") && (
          <form action={`/api/intel/extraction/${reviewId}/reject`} method="POST">
            <button
              type="submit"
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Reject
            </button>
          </form>
        )}
      </div>

      {/* Important notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Human review required.</strong> Review all extracted fields before approving. AI extraction
        may be incorrect. Promotion creates a <strong>draft only</strong> — no automatic submission, payment,
        or filing occurs.
      </div>

      {/* Fields */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Extracted Fields ({review.fields.length})</h2>
        </div>
        {review.fields.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No fields extracted.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {review.fields.map((field) => {
              const vCfg = VALIDATION_CONFIG[field.validationStatus ?? "unverified"] ?? VALIDATION_CONFIG.unverified;
              return (
                <div key={field.id} className="flex flex-wrap items-start gap-4 px-5 py-3">
                  <div className="w-40 flex-shrink-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{field.fieldKey}</p>
                    <ConfidenceBar value={field.confidence ?? 0} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-900">
                      {field.correctedValue ?? field.proposedValue ?? (
                        <span className="italic text-slate-400">empty</span>
                      )}
                    </p>
                    {field.validationError && (
                      <p className="mt-0.5 text-xs text-red-600">{field.validationError}</p>
                    )}
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${vCfg}`}
                  >
                    {field.validationStatus}
                  </span>
                  {field.accepted && (
                    <span className="flex-shrink-0 text-xs text-green-600">✓ Accepted</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Original AI output */}
      {review.originalOutput && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Original AI Output</h2>
          <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(review.originalOutput, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
