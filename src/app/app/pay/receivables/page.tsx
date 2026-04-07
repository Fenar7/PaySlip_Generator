import { Suspense } from "react";
import Link from "next/link";
import { getReceivablesKPIs, listReceivables } from "./actions";

export const metadata = {
  title: "Receivables | Slipwise",
};

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

async function KPICards() {
  const result = await getReceivablesKPIs();
  if (!result.success) return null;

  const kpis = [
    {
      label: "Due This Month",
      count: result.data.dueThisMonth.count,
      total: result.data.dueThisMonth.total,
      icon: (
        <svg className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      bg: "bg-yellow-50 border-yellow-200",
    },
    {
      label: "Overdue",
      count: result.data.overdue.count,
      total: result.data.overdue.total,
      icon: (
        <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: "bg-red-50 border-red-200",
    },
    {
      label: "Partially Paid",
      count: result.data.partiallyPaid.count,
      total: result.data.partiallyPaid.total,
      icon: (
        <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      bg: "bg-orange-50 border-orange-200",
    },
    {
      label: "Paid This Month",
      count: result.data.paidThisMonth.count,
      total: result.data.paidThisMonth.total,
      icon: (
        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: "bg-green-50 border-green-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {kpis.map((kpi) => (
        <div key={kpi.label} className={`rounded-lg border p-5 ${kpi.bg}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0">{kpi.icon}</div>
            <p className="text-sm font-medium text-slate-600">{kpi.label}</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{kpi.count}</p>
          <p className="text-sm text-slate-500 mt-0.5">{formatCurrency(kpi.total)}</p>
        </div>
      ))}
    </div>
  );
}

function CopyLinkButton({ token }: { token: string | null }) {
  if (!token) return <span className="text-xs text-slate-400">No link</span>;
  return (
    <button
      type="button"
      data-copy-url={`${typeof window !== "undefined" ? window.location.origin : ""}/invoice/${token}`}
      className="copy-link-btn text-xs text-blue-600 hover:text-blue-800 font-medium"
    >
      Copy Link
    </button>
  );
}

function StatusFilterChips({ current }: { current?: string }) {
  const statuses = [
    { value: "", label: "All" },
    { value: "ISSUED", label: "Issued" },
    { value: "VIEWED", label: "Viewed" },
    { value: "DUE", label: "Due" },
    { value: "OVERDUE", label: "Overdue" },
    { value: "PARTIALLY_PAID", label: "Partial" },
    { value: "PAID", label: "Paid" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((s) => (
        <Link
          key={s.value}
          href={s.value ? `?status=${s.value}` : "/app/pay/receivables"}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            current === s.value || (!current && !s.value)
              ? "bg-red-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}

async function ReceivablesTable({
  status,
  search,
  page,
}: {
  status?: string;
  search?: string;
  page: number;
}) {
  const result = await listReceivables({ status, search, page });

  if (!result.success) {
    return <p className="py-8 text-center text-red-500">{result.error}</p>;
  }

  const { invoices, total, totalPages } = result.data;

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No receivables found</h3>
        <p className="mt-1 text-sm text-slate-500">Issue invoices to see them here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Invoice #</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Customer</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Paid</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Remaining</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Last Method</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Next Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Due Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link href={`/app/docs/invoices/${inv.id}`} className="font-medium text-blue-600 hover:underline text-sm">
                  {inv.invoiceNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-slate-700">{inv.customerName}</td>
              <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">{formatCurrency(inv.totalAmount)}</td>
              <td className="px-4 py-3 text-right text-sm text-slate-700">
                {inv.amountPaid > 0 ? formatCurrency(inv.amountPaid) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {inv.remainingAmount > 0 ? (
                  <span className={inv.status === "OVERDUE" ? "text-red-600" : "text-slate-900"}>
                    {formatCurrency(inv.remainingAmount)}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {inv.lastPaymentMethod ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {inv.lastPaymentMethod.replace(/_/g, " ")}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">{inv.nextPaymentDate || "—"}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{inv.dueDate || "—"}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] || "bg-slate-100 text-slate-700"}`}>
                  {inv.status.replace("_", " ")}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <CopyLinkButton token={inv.publicToken} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}${status ? `&status=${status}` : ""}${search ? `&search=${search}` : ""}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Receivables</h1>
          <p className="mt-1 text-sm text-slate-500">Track payments and outstanding invoices</p>
        </div>

        {/* KPI Cards */}
        <Suspense fallback={<div className="grid grid-cols-4 gap-4 mb-6">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-lg bg-slate-100 animate-pulse" />)}</div>}>
          <KPICards />
        </Suspense>

        {/* Search */}
        <form method="GET" className="mb-4">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <div className="relative max-w-sm">
            <input
              type="text"
              name="search"
              defaultValue={params.search || ""}
              placeholder="Search invoices..."
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 pl-9 text-sm text-slate-700 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        {/* Status Filters */}
        <div className="mb-4">
          <StatusFilterChips current={params.status} />
        </div>

        {/* Table */}
        <Suspense fallback={<div className="py-8 text-center text-slate-500">Loading receivables...</div>}>
          <ReceivablesTable status={params.status} search={params.search} page={page} />
        </Suspense>

        {/* Copy Link Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('click', function(e) {
                var btn = e.target.closest('.copy-link-btn');
                if (!btn) return;
                var url = window.location.origin + '/invoice/' + btn.dataset.copyUrl?.split('/invoice/')[1];
                if (btn.dataset.copyUrl) url = window.location.origin + '/invoice/' + btn.dataset.copyUrl.split('/invoice/').pop();
                navigator.clipboard.writeText(btn.dataset.copyUrl ? (window.location.origin + '/invoice/' + btn.dataset.copyUrl) : '').then(function() {
                  var orig = btn.textContent;
                  btn.textContent = 'Copied!';
                  setTimeout(function() { btn.textContent = orig; }, 2000);
                });
              });
            `,
          }}
        />
      </div>
    </div>
  );
}
