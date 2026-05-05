import { Suspense } from "react";
import Link from "next/link";
import { getDocsSummary } from "@/lib/docs-vault";
import type { DocsSummary, VaultRow } from "@/lib/docs-vault";
import {
  KpiCard,
  QuickActionCard,
  DashboardSection,
  ContentPanel,
  ActivityItem,
  ActivityList,
  StatusBadge,
} from "@/components/dashboard";
import {
  FileText,
  Receipt,
  Banknote,
  FileCheck,
  LayoutGrid,
  Layers,
  FileImage,
  Plus,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export const metadata = {
  title: "Docs | Slipwise",
  description: "Document operations hub. Manage invoices, vouchers, salary slips, and quotes.",
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

const DOC_TYPE_VARIANTS: Record<string, "default" | "success" | "warning" | "info" | "neutral"> = {
  invoice: "info",
  voucher: "default",
  salary_slip: "warning",
  quote: "success",
};

const SUITE_CARDS = [
  { type: "invoice" as const, label: "Invoices", icon: FileText, href: "/app/docs/invoices", newHref: "/app/docs/invoices/new", description: "Create and manage customer invoices" },
  { type: "voucher" as const, label: "Vouchers", icon: Receipt, href: "/app/docs/vouchers", newHref: "/app/docs/vouchers/new", description: "Payment and receipt vouchers" },
  { type: "salary_slip" as const, label: "Salary Slips", icon: Banknote, href: "/app/docs/salary-slips", newHref: "/app/docs/salary-slips/new", description: "Generate employee payslips" },
  { type: "quote" as const, label: "Quotes", icon: FileCheck, href: "/app/docs/quotes", newHref: "/app/docs/quotes/new", description: "Send estimates and proposals" },
];

// ─── Server-rendered body ─────────────────────────────────────────────────────

async function DocsHomeBody() {
  const summary: DocsSummary = await getDocsSummary();

  const totalDocs = Object.values(summary.counts).reduce((a, b) => a + b, 0);
  const recentCount = summary.recentDocuments.length;

  return (
    <>
      {/* Top stats + quick create */}
      <DashboardSection>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SUITE_CARDS.map((card) => (
            <KpiCard
              key={card.type}
              label={card.label}
              value={summary.counts[card.type]}
              icon={card.icon}
            />
          ))}
        </div>
      </DashboardSection>

      {/* Main content grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Recent docs + activity (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent documents */}
          <ContentPanel padding="none">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recently Updated</h2>
                {recentCount > 0 && (
                  <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--text-muted)]">
                    {recentCount}
                  </span>
                )}
              </div>
              <Link
                href="/app/docs/vault"
                className="inline-flex items-center text-xs font-medium text-[var(--brand-primary)] hover:underline transition-colors"
              >
                Open Vault <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
            <ActivityList
              emptyMessage="No documents yet"
              emptyDescription="Create your first invoice, voucher, quote, or salary slip to get started."
              className="px-2 py-1"
            >
              {summary.recentDocuments.map((row) => (
                <ActivityItem
                  key={`${row.docType}-${row.documentId}`}
                  href={getDetailHref(row)}
                  title={row.documentNumber}
                  detail={row.titleOrSummary}
                  badge={
                    <StatusBadge variant={DOC_TYPE_VARIANTS[row.docType] ?? "neutral"}>
                      {DOC_TYPE_LABELS[row.docType] ?? row.docType}
                    </StatusBadge>
                  }
                  rightText={row.amount > 0 ? formatCurrency(row.amount, row.currency) : undefined}
                  rightSubtext={formatDate(row.updatedAt)}
                />
              ))}
            </ActivityList>
          </ContentPanel>

          {/* Quick create shortcuts */}
          <ContentPanel>
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Create New</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SUITE_CARDS.map((card) => (
                <Link
                  key={card.type}
                  href={card.newHref}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 text-center transition-all hover:border-[var(--border-default)] hover:bg-[var(--surface-selected)] hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-panel)] text-[var(--brand-primary)] shadow-sm transition-colors group-hover:bg-[var(--brand-primary)] group-hover:text-white">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{card.label}</p>
                    <p className="mt-0.5 text-[0.7rem] text-[var(--text-muted)]">{card.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </ContentPanel>
        </div>

        {/* Right column: actions + tools (1/3) */}
        <div className="flex flex-col gap-4">
          <ContentPanel>
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <QuickActionCard
                href="/app/docs/vault"
                label="Document Vault"
                description={`Browse all ${totalDocs} documents`}
                icon={LayoutGrid}
                variant="featured"
              />
              <QuickActionCard
                href="/app/docs/templates"
                label="Templates"
                description="Browse and manage document templates"
                icon={Layers}
                variant="default"
              />
              <QuickActionCard
                href="/app/docs/pdf-studio"
                label="PDF Studio"
                description="Preview, export, and print documents"
                icon={FileImage}
                variant="default"
              />
            </div>
          </ContentPanel>

          <ContentPanel>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[var(--brand-secondary)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Templates</h2>
            </div>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Start faster with pre-built templates for your organisation.
            </p>
            <Link
              href="/app/docs/templates"
              className="inline-flex items-center text-xs font-medium text-[var(--brand-primary)] hover:underline"
            >
              Browse templates <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </ContentPanel>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white">
            <FileText className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Docs</h1>
        </div>
        <p className="text-sm text-[var(--text-muted)] ml-10">
          Document operations hub — invoices, vouchers, salary slips, and quotes
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24 text-[var(--text-muted)]">
            <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-soft)] border-t-[var(--brand-primary)]" />
            Loading…
          </div>
        }
      >
        <DocsHomeBody />
      </Suspense>
    </div>
  );
}
