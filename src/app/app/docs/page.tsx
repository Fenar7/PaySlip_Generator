import { Suspense } from "react";
import Link from "next/link";
import { getDocsSummary } from "@/lib/docs-vault";
import type { DocsSummary, VaultRow } from "@/lib/docs-vault";

export const metadata = {
  title: "SW Docs | Slipwise",
  description: "SW Docs — document operations hub. Manage invoices, vouchers, salary slips, and quotes.",
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

function getDetailHref(row: VaultRow): string {
  switch (row.docType) {
    case "invoice":     return `/app/docs/invoices/${row.documentId}`;
    case "voucher":     return `/app/docs/vouchers/${row.documentId}`;
    case "salary_slip": return `/app/docs/salary-slips/${row.documentId}`;
    case "quote":       return `/app/docs/quotes/${row.documentId}`;
    default:            return "#";
  }
}

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  voucher: "Voucher",
  salary_slip: "Salary Slip",
  quote: "Quote",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  invoice: "bg-blue-50 text-blue-700",
  voucher: "bg-violet-50 text-violet-700",
  salary_slip: "bg-amber-50 text-amber-700",
  quote: "bg-emerald-50 text-emerald-700",
};

// ─── Summary cards ────────────────────────────────────────────────────────────

const SUITE_CARDS = [
  {
    type: "invoice" as const,
    label: "Invoices",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
      </svg>
    ),
    href: "/app/docs/invoices",
    newHref: "/app/docs/invoices/new",
    bg: "bg-blue-50",
    ring: "ring-blue-200",
    iconColor: "text-blue-600",
    countColor: "text-blue-700",
  },
  {
    type: "voucher" as const,
    label: "Vouchers",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    ),
    href: "/app/docs/vouchers",
    newHref: "/app/docs/vouchers/new",
    bg: "bg-violet-50",
    ring: "ring-violet-200",
    iconColor: "text-violet-600",
    countColor: "text-violet-700",
  },
  {
    type: "salary_slip" as const,
    label: "Salary Slips",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    href: "/app/docs/salary-slips",
    newHref: "/app/docs/salary-slips/new",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    iconColor: "text-amber-600",
    countColor: "text-amber-700",
  },
  {
    type: "quote" as const,
    label: "Quotes",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    href: "/app/docs/quotes",
    newHref: "/app/docs/quotes/new",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    iconColor: "text-emerald-600",
    countColor: "text-emerald-700",
  },
];

// ─── Action tiles ─────────────────────────────────────────────────────────────

const ACTION_TILES = [
  {
    href: "/app/docs/vault",
    label: "Document Vault",
    desc: "Unified view of all documents",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    color: "bg-slate-900 text-white hover:bg-slate-800",
    featured: true,
  },
  {
    href: "/app/docs/templates",
    label: "Templates",
    desc: "Browse and manage document templates",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    color: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    featured: false,
  },
  {
    href: "/app/docs/pdf-studio",
    label: "PDF Studio",
    desc: "Preview, export, and print documents",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    color: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    featured: false,
  },
];

// ─── Recent documents component ───────────────────────────────────────────────

function RecentDocRow({ row }: { row: VaultRow }) {
  const typeCls = DOC_TYPE_COLORS[row.docType] ?? "bg-slate-100 text-slate-600";
  return (
    <Link
      href={getDetailHref(row)}
      className="flex items-center justify-between rounded-lg p-3 hover:bg-slate-50 transition-colors group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${typeCls}`}>
          {DOC_TYPE_LABELS[row.docType] ?? row.docType}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 truncate">
            {row.documentNumber}
          </p>
          <p className="text-xs text-slate-500 truncate">{row.titleOrSummary}</p>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 ml-4">
        {row.amount > 0 && (
          <p className="text-sm font-medium text-slate-900">
            {formatCurrency(row.amount, row.currency)}
          </p>
        )}
        <p className="text-xs text-slate-400">{formatDate(row.updatedAt)}</p>
      </div>
    </Link>
  );
}

// ─── Server-rendered body ─────────────────────────────────────────────────────

async function DocsHomeBody() {
  const summary: DocsSummary = await getDocsSummary();

  return (
    <>
      {/* ── Stats grid ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SUITE_CARDS.map((card) => (
          <div
            key={card.type}
            className={`rounded-xl p-5 ring-1 ${card.bg} ${card.ring} flex flex-col gap-3`}
          >
            <div className="flex items-center justify-between">
              <div className={`${card.iconColor}`}>{card.icon}</div>
              <Link
                href={card.newHref}
                className={`text-xs font-medium ${card.iconColor} hover:underline`}
              >
                + New
              </Link>
            </div>
            <div>
              <p className={`text-3xl font-bold ${card.countColor}`}>
                {summary.counts[card.type]}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">{card.label}</p>
            </div>
            <Link
              href={card.href}
              className={`mt-auto text-xs font-medium ${card.iconColor} hover:underline flex items-center gap-1`}
            >
              View all <span aria-hidden>→</span>
            </Link>
          </div>
        ))}
      </div>

      {/* ── Action tiles + Recent documents ──────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Recent documents (2/3) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Recently Updated</h2>
            <Link
              href="/app/docs/vault"
              className="text-xs text-blue-600 hover:underline"
            >
              Open Vault →
            </Link>
          </div>
          <div className="divide-y divide-slate-50 px-2 py-1">
            {summary.recentDocuments.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No documents yet.{" "}
                <Link href="/app/docs/invoices/new" className="text-blue-600 hover:underline">
                  Create your first invoice
                </Link>
              </div>
            ) : (
              summary.recentDocuments.map((row) => (
                <RecentDocRow key={`${row.docType}-${row.documentId}`} row={row} />
              ))
            )}
          </div>
        </div>

        {/* Quick actions (1/3) */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              {ACTION_TILES.map((tile) => (
                <Link
                  key={tile.href}
                  href={tile.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${tile.color}`}
                >
                  <span className="shrink-0">{tile.icon}</span>
                  <div>
                    <p className="font-medium leading-tight">{tile.label}</p>
                    <p className="text-xs opacity-70 leading-tight mt-0.5">{tile.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Create shortcuts */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Create</h2>
            <div className="grid grid-cols-2 gap-2">
              {SUITE_CARDS.map((card) => (
                <Link
                  key={card.type}
                  href={card.newHref}
                  className={`flex flex-col items-center justify-center rounded-lg p-3 text-xs font-medium transition-colors ring-1 ${card.bg} ${card.ring} ${card.iconColor} hover:opacity-80`}
                >
                  <span className="mb-1">{card.icon}</span>
                  {card.label.replace("Salary Slips", "Salary Slip")}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-screen-xl px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">SW Docs</h1>
          </div>
          <p className="text-sm text-slate-500 ml-10">
            Document operations hub — invoices, vouchers, salary slips, and quotes
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24 text-slate-400">
              <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading…
            </div>
          }
        >
          <DocsHomeBody />
        </Suspense>
      </div>
    </div>
  );
}
