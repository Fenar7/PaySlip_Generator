import { Suspense } from "react";
import Link from "next/link";
import { listSalarySlips, archiveSalarySlip, duplicateSalarySlip } from "./actions";

export const metadata = {
  title: "Salary Slip Vault | Slipwise",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  released: "bg-green-100 text-green-700",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount);
}

async function SalarySlipTable({
  status,
  month,
  year,
  search,
  page,
}: {
  status?: string;
  month?: number;
  year?: number;
  search?: string;
  page: number;
}) {
  const { salarySlips, total, totalPages } = await listSalarySlips({
    status,
    month,
    year,
    search,
    page,
    limit: 20,
  });

  if (salarySlips.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-slate-900">No salary slips yet</h3>
        <p className="mt-1 text-sm text-slate-500">Create your first salary slip to get started.</p>
        <Link
          href="/app/docs/salary-slips/new"
          className="mt-4 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Create Salary Slip
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Slip #</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Period</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Gross Pay</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Net Pay</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {salarySlips.map((slip) => (
            <tr key={slip.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link href={`/app/docs/salary-slips/${slip.id}`} className="font-medium text-blue-600 hover:underline">
                  {slip.slipNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">
                {slip.employee?.name || "—"}
              </td>
              <td className="px-4 py-3 text-sm text-slate-500">
                {MONTHS[slip.month - 1]} {slip.year}
              </td>
              <td className="px-4 py-3 text-right text-sm text-slate-900">
                {formatCurrency(slip.grossPay)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                {formatCurrency(slip.netPay)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={slip.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <SalarySlipActions slipId={slip.id} status={slip.status} />
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
                href={`?page=${page - 1}`}
                className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}`}
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

function SalarySlipActions({ slipId, status }: { slipId: string; status: string }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/app/docs/salary-slips/${slipId}`}
        className="text-sm text-slate-600 hover:text-slate-900"
      >
        Open
      </Link>
      <form action={async () => {
        "use server";
        await duplicateSalarySlip(slipId);
      }}>
        <button type="submit" className="text-sm text-slate-600 hover:text-slate-900">
          Duplicate
        </button>
      </form>
      {status === "draft" && (
        <form action={async () => {
          "use server";
          await archiveSalarySlip(slipId);
        }}>
          <button type="submit" className="text-sm text-red-600 hover:text-red-800">
            Archive
          </button>
        </form>
      )}
    </div>
  );
}

function StatusFilterChips({ currentStatus }: { currentStatus?: string }) {
  const statuses = [
    { value: "", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "released", label: "Released" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((s) => (
        <Link
          key={s.value}
          href={s.value ? `?status=${s.value}` : "?"}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            currentStatus === s.value || (!currentStatus && !s.value)
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

export default async function SalarySlipsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const status = params.status;
  const month = params.month ? parseInt(params.month, 10) : undefined;
  const year = params.year ? parseInt(params.year, 10) : undefined;
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Salary Slip Vault</h1>
            <p className="mt-1 text-sm text-slate-500">Manage employee salary slips</p>
          </div>
          <Link
            href="/app/docs/salary-slips/new"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Create Salary Slip
          </Link>
        </div>

        {/* Search + Month/Year Filters */}
        <form method="GET" className="mb-4">
          {params.status && <input type="hidden" name="status" value={params.status} />}
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative max-w-sm flex-1">
              <input
                type="text"
                name="search"
                defaultValue={params.search || ""}
                placeholder="Search salary slips..."
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 pl-9 text-sm text-slate-700 placeholder-slate-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              name="month"
              defaultValue={params.month || ""}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            >
              <option value="">All Months</option>
              {MONTHS.map((label, i) => (
                <option key={i + 1} value={i + 1}>{label}</option>
              ))}
            </select>
            <select
              name="year"
              defaultValue={params.year || ""}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            >
              <option value="">All Years</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Filter
            </button>
            {(params.search || params.month || params.year) && (
              <a
                href={params.status ? `/app/docs/salary-slips?status=${params.status}` : "/app/docs/salary-slips"}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Clear
              </a>
            )}
          </div>
        </form>

        <div className="mb-4">
          <StatusFilterChips currentStatus={status} />
        </div>

        <Suspense fallback={<div className="py-8 text-center text-slate-500">Loading salary slips...</div>}>
          <SalarySlipTable status={status} month={month} year={year} search={params.search} page={page} />
        </Suspense>
      </div>
    </div>
  );
}
