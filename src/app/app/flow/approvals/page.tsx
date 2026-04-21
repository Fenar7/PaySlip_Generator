import type { Metadata } from "next";
import Link from "next/link";
import { listApprovals } from "./actions";

export const metadata: Metadata = { title: "Approvals | Slipwise" };

const DOC_TYPE_BADGE: Record<string, string> = {
  invoice: "bg-blue-100 text-blue-700",
  voucher: "bg-amber-100 text-amber-700",
  "salary-slip": "bg-green-100 text-green-700",
  "vendor-bill": "bg-purple-100 text-purple-700",
  "payment-run": "bg-indigo-100 text-indigo-700",
  "fiscal-period-reopen": "bg-rose-100 text-rose-700",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ESCALATED: "bg-orange-100 text-orange-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function ApprovalsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeStatus = params.status ?? "";
  const page = parseInt(params.page ?? "0", 10);

  const result = await listApprovals({
    status: activeStatus || undefined,
    page,
  });

  if (!result.success) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-red-600">Error: {result.error}</p>
        </div>
      </div>
    );
  }

  const { approvals, total, counts } = result.data;
  const totalPages = Math.ceil(total / 20);

  const tabs = [
    { key: "", label: "All", count: counts.all },
    { key: "PENDING", label: "Pending", count: counts.pending },
    { key: "ESCALATED", label: "Escalated", count: counts.escalated },
    { key: "APPROVED", label: "Approved", count: counts.approved },
    { key: "REJECTED", label: "Rejected", count: counts.rejected },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and manage approval requests for documents
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
          {tabs.map((tab) => {
            const isActive = activeStatus === tab.key;
            return (
              <Link
                key={tab.key}
                href={
                  tab.key
                    ? `/app/flow/approvals?status=${tab.key}`
                    : "/app/flow/approvals"
                }
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Table */}
        {approvals.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <div className="mb-3 text-4xl">📋</div>
            <h3 className="text-lg font-semibold text-slate-900">
              No approval requests
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {activeStatus
                ? `No ${activeStatus.toLowerCase()} approvals found.`
                : "When documents are submitted for approval, they will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Request ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Doc Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Doc #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Requested By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvals.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">
                      {a.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          DOC_TYPE_BADGE[a.docType] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {docTypeLabel(a.docType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {a.docNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {a.requestedByName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_BADGE[a.status] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/flow/approvals/${a.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Showing {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of{" "}
                  {total}
                </p>
                <div className="flex gap-2">
                  {page > 0 && (
                    <Link
                      href={`/app/flow/approvals?${activeStatus ? `status=${activeStatus}&` : ""}page=${page - 1}`}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalPages - 1 && (
                    <Link
                      href={`/app/flow/approvals?${activeStatus ? `status=${activeStatus}&` : ""}page=${page + 1}`}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
