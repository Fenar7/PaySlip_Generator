import { Suspense } from "react";
import Link from "next/link";
import { queryVault } from "@/lib/docs-vault";
import type { DocType, VaultRow } from "@/lib/docs-vault";

export const metadata = {
  title: "Document Vault | SW Docs | Slipwise",
  description: "Unified view of all invoices, vouchers, salary slips, and quotes across your organisation.",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Badge maps ───────────────────────────────────────────────────────────────

const DOC_TYPE_COLORS: Record<string, string> = {
  invoice: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  voucher: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  salary_slip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  quote: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  voucher: "Voucher",
  salary_slip: "Salary Slip",
  quote: "Quote",
};

const STATUS_COLORS: Record<string, string> = {
  // invoice
  DRAFT: "bg-slate-100 text-slate-600",
  ISSUED: "bg-blue-100 text-blue-700",
  VIEWED: "bg-purple-100 text-purple-700",
  DUE: "bg-yellow-100 text-yellow-700",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  DISPUTED: "bg-pink-100 text-pink-700",
  CANCELLED: "bg-slate-200 text-slate-500",
  REISSUED: "bg-indigo-100 text-indigo-700",
  // voucher / salary
  draft: "bg-slate-100 text-slate-600",
  approved: "bg-green-100 text-green-700",
  released: "bg-blue-100 text-blue-700",
  // quote
  SENT: "bg-cyan-100 text-cyan-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  EXPIRED: "bg-slate-200 text-slate-500",
  CONVERTED: "bg-indigo-100 text-indigo-700",
};

function getDetailHref(row: VaultRow): string {
  switch (row.docType as DocType) {
    case "invoice": return `/app/docs/invoices/${row.documentId}`;
    case "voucher": return `/app/docs/vouchers/${row.documentId}`;
    case "salary_slip": return `/app/docs/salary-slips/${row.documentId}`;
    case "quote": return `/app/docs/quotes/${row.documentId}`;
    default: return "#";
  }
}

// ─── Row component ────────────────────────────────────────────────────────────

function VaultTableRow({ row }: { row: VaultRow }) {
  const statusCls =
    STATUS_COLORS[row.status] ?? "bg-slate-100 text-slate-600";
  const typeCls = DOC_TYPE_COLORS[row.docType] ?? "bg-slate-100 text-slate-600";

  return (
    <tr className="group hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${typeCls}`}>
          {DOC_TYPE_LABELS[row.docType] ?? row.docType}
        </span>
      </td>
      <td className="px-4 py-3">
        <Link
          href={getDetailHref(row)}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-sm"
        >
          {row.documentNumber}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate">
        {row.titleOrSummary}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {row.counterpartyLabel ?? "—"}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex flex-col gap-1.5">
          <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCls}`}>
            {row.status.replace(/_/g, " ")}
          </span>
          {row.operationalBadges?.map((badge) => (
            <Link
              key={`${row.documentId}-${badge.kind}`}
              href={badge.href}
              className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium hover:underline ${
                badge.kind === "pending_proof"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {badge.label}
            </Link>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
        {formatDate(row.primaryDate)}
      </td>
      <td className="px-4 py-3 text-sm text-right font-medium text-slate-900 whitespace-nowrap">
        {row.amount > 0 ? formatCurrency(row.amount, row.currency) : "—"}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
        {formatDate(row.updatedAt)}
      </td>
      <td className="px-4 py-3 text-right">
        <Link
          href={getDetailHref(row)}
          className="text-xs text-slate-500 hover:text-blue-600 hover:underline"
        >
          Open →
        </Link>
      </td>
    </tr>
  );
}

// ─── Vault table ─────────────────────────────────────────────────────────────

async function VaultTable({
  docType,
  status,
  archived,
  search,
  sortBy,
  sortDir,
  page,
}: {
  docType?: string;
  status?: string;
  archived?: string;
  search?: string;
  sortBy?: string;
  sortDir?: string;
  page: number;
}) {
  const result = await queryVault({
    docType: (docType as DocType) || "all",
    status: status || "all",
    archived: (archived as "active" | "archived" | "all") || "active",
    search: search || "",
    sortBy: (sortBy as "updatedAt" | "createdAt" | "primaryDate" | "amount") || "updatedAt",
    sortDir: (sortDir as "asc" | "desc") || "desc",
    page,
    limit: 25,
  });

  const { rows, total, totalPages } = result;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-slate-900">No documents found</h3>
        <p className="mt-1 text-sm text-slate-500">
          {search ? `No results for "${search}". Try different search terms.` :
            archived === "archived" ? "No archived documents." :
            "Create an invoice, voucher, salary slip, or quote to see it here."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/app/docs/invoices/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            New Invoice
          </Link>
          <Link
            href="/app/docs/quotes/new"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            New Quote
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Number</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Title / Summary</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Counterparty</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <VaultTableRow key={`${row.docType}-${row.documentId}`} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50">
          <p className="text-sm text-slate-500">
            {total} document{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`?page=${page - 1}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ← Previous
              </Link>
            )}
            <span className="flex items-center px-3 text-sm text-slate-500">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`?page=${page + 1}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

function buildUrl(params: Record<string, string>, overrides: Record<string, string>) {
  const merged = { ...params, ...overrides, page: "1" };
  const qs = Object.entries(merged)
    .filter(([, v]) => v && v !== "all" && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return qs ? `?${qs}` : "?";
}

function TypeFilter({ current, params }: { current: string; params: Record<string, string> }) {
  const types = [
    { value: "all", label: "All Types" },
    { value: "invoice", label: "Invoices" },
    { value: "voucher", label: "Vouchers" },
    { value: "salary_slip", label: "Salary Slips" },
    { value: "quote", label: "Quotes" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {types.map((t) => {
        const active = current === t.value || (!current && t.value === "all");
        return (
          <Link
            key={t.value}
            href={buildUrl(params, { docType: t.value })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

function ArchivedFilter({ current, params }: { current: string; params: Record<string, string> }) {
  const options = [
    { value: "active", label: "Active" },
    { value: "all", label: "All" },
    { value: "archived", label: "Archived only" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
      {options.map((o) => {
        const active = current === o.value || (!current && o.value === "active");
        return (
          <Link
            key={o.value}
            href={buildUrl(params, { archived: o.value })}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              active ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

function SortSelect({ params }: { params: Record<string, string> }) {
  const sorts = [
    { value: "updatedAt", label: "Recently updated" },
    { value: "createdAt", label: "Recently created" },
    { value: "primaryDate", label: "Primary date" },
    { value: "amount", label: "Amount (high–low)" },
  ];
  const current = params.sortBy ?? "updatedAt";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Sort:</span>
      <div className="flex flex-wrap gap-1">
        {sorts.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(params, {
              sortBy: s.value,
              sortDir: s.value === "amount" ? "desc" : "desc",
            })}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              current === s.value
                ? "bg-blue-100 text-blue-700"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);

  const docType = params.docType ?? "all";
  const archived = params.archived ?? "active";
  const search = params.search ?? "";
  const sortBy = params.sortBy ?? "updatedAt";
  const sortDir = params.sortDir ?? "desc";
  const status = params.status ?? "all";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-screen-xl px-4 py-8">

        {/* ── Header ───────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <nav className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Link href="/app/docs" className="hover:text-slate-700">SW Docs</Link>
              <span>›</span>
              <span className="text-slate-700 font-medium">Vault</span>
            </nav>
            <h1 className="text-2xl font-bold text-slate-900">Document Vault</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Unified view of invoices, vouchers, salary slips, and quotes
            </p>
          </div>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <Link
              href="/app/docs/invoices/new"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Invoice
            </Link>
            <Link
              href="/app/docs/vouchers/new"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              + Voucher
            </Link>
            <Link
              href="/app/docs/quotes/new"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              + Quote
            </Link>
          </div>
        </div>

        {/* ── Controls ─────────────────────────────── */}
        <div className="mb-4 flex flex-col gap-3">

          {/* Row 1: search */}
          <form method="GET" className="flex-1">
            {/* Preserve existing filter params in hidden inputs */}
            {params.docType && <input type="hidden" name="docType" value={params.docType} />}
            {params.archived && <input type="hidden" name="archived" value={params.archived} />}
            {params.sortBy && <input type="hidden" name="sortBy" value={params.sortBy} />}
            {params.sortDir && <input type="hidden" name="sortDir" value={params.sortDir} />}

            <div className="relative max-w-md">
              <svg
                className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search number, counterparty, title…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </form>

          {/* Row 2: type filter + archived toggle + sort */}
          <div className="flex flex-wrap items-center gap-3">
            <TypeFilter current={docType} params={params} />
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <ArchivedFilter current={archived} params={params} />
              <SortSelect params={params} />
            </div>
          </div>
        </div>

        {/* ── Vault table ─────────────────────────── */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20 text-slate-400">
              <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading vault…
            </div>
          }
        >
          <VaultTable
            docType={docType}
            status={status}
            archived={archived}
            search={search}
            sortBy={sortBy}
            sortDir={sortDir}
            page={page}
          />
        </Suspense>

        {/* ── Footer nav ─────────────────────────── */}
        <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-500">
          <Link href="/app/docs" className="hover:text-slate-700">← Back to SW Docs</Link>
          <Link href="/app/docs/templates" className="hover:text-slate-700">Templates</Link>
          <Link href="/app/docs/pdf-studio" className="hover:text-slate-700">PDF Studio</Link>
        </div>
      </div>
    </div>
  );
}
