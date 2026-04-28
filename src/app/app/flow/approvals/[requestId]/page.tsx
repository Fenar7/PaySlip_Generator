import type { Metadata } from "next";
import Link from "next/link";
import { getApprovalDetail } from "../actions";
import { requireOrgContext } from "@/lib/auth";
import { ApprovalDetailClient } from "./approval-detail-client";

export const metadata: Metadata = { title: "Approval Detail | Slipwise" };

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ESCALATED: "bg-orange-100 text-orange-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const DOC_TYPE_BADGE: Record<string, string> = {
  invoice: "bg-blue-100 text-blue-700",
  voucher: "bg-amber-100 text-amber-700",
  "salary-slip": "bg-green-100 text-green-700",
  "vendor-bill": "bg-purple-100 text-purple-700",
  "payment-run": "bg-indigo-100 text-indigo-700",
  "fiscal-period-reopen": "bg-rose-100 text-rose-700",
};

function docTypeLabel(docType: string): string {
  switch (docType) {
    case "invoice":
      return "Invoice";
    case "voucher":
      return "Voucher";
    case "salary-slip":
      return "Salary Slip";
    case "vendor-bill":
      return "Vendor Bill";
    case "payment-run":
      return "Payment Run";
    case "fiscal-period-reopen":
      return "Fiscal Period Reopen";
    default:
      return docType;
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface PageProps {
  params: Promise<{ requestId: string }>;
}

export default async function ApprovalDetailPage({ params }: PageProps) {
  const { requestId } = await params;
  const { userId } = await requireOrgContext();
  const result = await getApprovalDetail(requestId);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <Link
            href="/app/flow/approvals"
            className="mb-4 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to Approvals
          </Link>
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-red-700">{result.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const detail = result.data;
  const isActionable = detail.status === "PENDING" || detail.status === "ESCALATED";
  const canDecide = isActionable && detail.requestedById !== userId;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/app/flow/approvals"
          className="mb-6 inline-block text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Approvals
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Approval Request
            </h1>
            <p className="mt-1 font-mono text-sm text-slate-500">
              {detail.id}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              STATUS_BADGE[detail.status] ?? "bg-slate-100 text-slate-700"
            }`}
          >
            {detail.status}
          </span>
        </div>

        <div className="space-y-6">
          {/* Request Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Request Information
            </h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Document Type
                </dt>
                <dd className="mt-1">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      DOC_TYPE_BADGE[detail.docType] ??
                      "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {docTypeLabel(detail.docType)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Requested By
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {detail.requestedByName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Submitted On
                </dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {formatDate(detail.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </dt>
                <dd className="mt-1 text-sm text-slate-900">{detail.status}</dd>
              </div>
            </dl>
          </div>

          {detail.docType === "fiscal-period-reopen" && detail.note && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-amber-900">Reopen reason</h3>
              <p className="text-sm text-amber-950">{detail.note}</p>
            </div>
          )}

          {/* Document Summary */}
          {detail.document && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Document Summary
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {detail.docType === "invoice"
                      ? "Invoice Number"
                      : detail.docType === "voucher"
                        ? "Voucher Number"
                        : detail.docType === "vendor-bill"
                          ? "Bill Number"
                      : detail.docType === "payment-run"
                            ? "Run Number"
                            : detail.docType === "fiscal-period-reopen"
                              ? "Period Label"
                             : "Slip Number"}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {detail.document.number}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {detail.docType === "invoice"
                      ? "Customer"
                      : detail.docType === "voucher"
                        ? "Vendor"
                        : detail.docType === "vendor-bill"
                          ? "Vendor"
                      : detail.docType === "payment-run"
                             ? "Payment Run"
                             : detail.docType === "fiscal-period-reopen"
                               ? "Workflow"
                             : "Employee"}
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {detail.document.entityName ?? "—"}
                  </dd>
                </div>
                {detail.docType !== "fiscal-period-reopen" && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      {detail.docType === "salary-slip" ? "Net Pay" : detail.docType === "payment-run" ? "Total Amount" : "Amount"}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-slate-900">
                      {formatCurrency(detail.document.amount)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {detail.docType === "salary-slip"
                      ? "Month / Year"
                      : "Date"}
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {detail.docType === "salary-slip" &&
                    detail.document.month &&
                    detail.document.year
                      ? `${MONTH_NAMES[detail.document.month]} ${detail.document.year}`
                      : detail.document.date}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {detail.reopenImpact && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Reopen impact</h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Journals in period</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{detail.reopenImpact.journalCount}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Posted / draft</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {detail.reopenImpact.postedJournalCount} / {detail.reopenImpact.draftJournalCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Affected accounts</dt>
                  <dd className="mt-1 text-sm text-slate-900">{detail.reopenImpact.affectedAccountCount}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Close completed at</dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {detail.reopenImpact.closeCompletedAt ? formatDate(new Date(detail.reopenImpact.closeCompletedAt)) : "Not recorded"}
                  </dd>
                </div>
              </dl>
              {detail.reopenImpact.affectedAccounts.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Sample affected accounts</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.reopenImpact.affectedAccounts.map((account) => (
                      <span key={account.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                        {account.code} - {account.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detail.reopenImpact.sampleEntries.length > 0 && (
                <div className="mt-4 rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Recent affected journals</p>
                  <div className="mt-2 space-y-2">
                    {detail.reopenImpact.sampleEntries.map((entry) => (
                      <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">{entry.entryNumber}</span>
                        <span>{entry.source}</span>
                        <span>{new Date(entry.entryDate).toLocaleDateString("en-US")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Decision Info (if already decided) */}
          {!isActionable && (
            <div
              className={`rounded-xl border p-6 ${
                detail.status === "APPROVED"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <h3
                className={`mb-4 text-lg font-semibold ${
                  detail.status === "APPROVED"
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {detail.status === "APPROVED"
                  ? "✅ Approved"
                  : "❌ Rejected"}
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Decided By
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {detail.approverName ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Decided On
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {detail.decidedAt ? formatDate(detail.decidedAt) : "—"}
                  </dd>
                </div>
                {detail.note && detail.docType !== "fiscal-period-reopen" && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Note
                    </dt>
                    <dd className="mt-1 rounded-lg bg-white/60 p-3 text-sm text-slate-900">
                      {detail.note}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Action Buttons (client component) */}
          <ApprovalDetailClient
            requestId={detail.id}
            canDecide={canDecide}
          />
        </div>
      </div>
    </div>
  );
}
