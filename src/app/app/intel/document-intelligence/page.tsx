import type { Metadata } from "next";
import Link from "next/link";
import { listExtractionReviewsAction } from "./actions";

export const metadata: Metadata = { title: "Document Intelligence — SW Intel" };

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  PROCESSING: { label: "Processing", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  NEEDS_REVIEW: { label: "Needs Review", badge: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  APPROVED: { label: "Approved", badge: "bg-green-50 text-green-700 border-green-200" },
  PROMOTED: { label: "Promoted", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  REJECTED: { label: "Rejected", badge: "bg-red-50 text-red-700 border-red-200" },
  FAILED: { label: "Failed", badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default async function DocumentIntelligencePage() {
  const result = await listExtractionReviewsAction();

  if (!result.success && result.error?.includes("plan")) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="text-5xl">📄</div>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Document Intelligence requires a Pro plan</h2>
        <p className="mt-2 text-sm text-slate-500">
          Upgrade to extract, review, and promote data from invoices, bills, and documents.
        </p>
        <Link
          href="/app/billing"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          View Plans
        </Link>
      </div>
    );
  }

  const reviews = result.success ? result.data : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Document Intelligence</h1>
          <p className="mt-1 text-sm text-slate-500">
            AI-assisted extraction from invoices, vendor bills, and documents. Review before promoting to drafts.
          </p>
        </div>
        <Link
          href="/app/intel/document-intelligence/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Extraction
        </Link>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <div className="text-4xl">📄</div>
          <p className="mt-3 text-sm font-medium text-slate-600">No extraction reviews yet</p>
          <p className="mt-1 text-xs text-slate-400">
            Start a new extraction to pull structured data from a document.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {reviews.map((review) => {
            const cfg = STATUS_CONFIG[review.status] ?? STATUS_CONFIG.FAILED;
            return (
              <Link
                key={review.id}
                href={`/app/intel/document-intelligence/${review.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {review.targetType ?? "Document"} extraction
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(review.createdAt).toLocaleString()}
                    {review.reviewedAt && ` · Reviewed ${new Date(review.reviewedAt).toLocaleDateString()}`}
                    {review.promotedAt && ` · Promoted ${new Date(review.promotedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <span className="text-xs text-slate-400">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
