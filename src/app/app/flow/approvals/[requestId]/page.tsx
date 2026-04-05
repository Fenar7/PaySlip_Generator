import type { Metadata } from "next";
import Link from "next/link";
import { getApprovalDetail } from "../actions";
import { requireOrgContext } from "@/lib/auth";
import { ApprovalDetailClient } from "./approval-detail-client";

export const metadata: Metadata = { title: "Approval Detail | Slipwise" };

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const DOC_TYPE_BADGE: Record<string, string> = {
  invoice: "bg-blue-100 text-blue-700",
  voucher: "bg-amber-100 text-amber-700",
  "salary-slip": "bg-green-100 text-green-700",
};

function docTypeLabel(docType: string): string {
  switch (docType) {
    case "invoice":
      return "Invoice";
    case "voucher":
      return "Voucher";
    case "salary-slip":
      return "Salary Slip";
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
  const isPending = detail.status === "PENDING";
  const canDecide = isPending && detail.requestedById !== userId;

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
                        : "Employee"}
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {detail.document.entityName ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {detail.docType === "salary-slip" ? "Net Pay" : "Amount"}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">
                    {formatCurrency(detail.document.amount)}
                  </dd>
                </div>
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

          {/* Decision Info (if already decided) */}
          {!isPending && (
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
                {detail.note && (
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
