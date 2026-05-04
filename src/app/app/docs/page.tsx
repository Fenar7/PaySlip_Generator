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
  { type: "invoice" as const, label: "Invoices", icon: FileText, href: "/app/docs/invoices", newHref: "/app/docs/invoices/new" },
  { type: "voucher" as const, label: "Vouchers", icon: Receipt, href: "/app/docs/vouchers", newHref: "/app/docs/vouchers/new" },
  { type: "salary_slip" as const, label: "Salary Slips", icon: Banknote, href: "/app/docs/salary-slips", newHref: "/app/docs/salary-slips/new" },
  { type: "quote" as const, label: "Quotes", icon: FileCheck, href: "/app/docs/quotes", newHref: "/app/docs/quotes/new" },
];

const ACTION_TILES = [
  {
    href: "/app/docs/vault",
    label: "Document Vault",
    description: "Unified view of all documents",
    icon: LayoutGrid,
    variant: "featured" as const,
  },
  {
    href: "/app/docs/templates",
    label: "Templates",
    description: "Browse and manage document templates",
    icon: Layers,
    variant: "default" as const,
  },
  {
    href: "/app/docs/pdf-studio",
    label: "PDF Studio",
    description: "Preview, export, and print documents",
    icon: FileImage,
    variant: "default" as const,
  },
];

// ─── Server-rendered body ─────────────────────────────────────────────────────

async function DocsHomeBody() {
  const summary: DocsSummary = await getDocsSummary();

  return (
    <>
      {/* Stats grid */}
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

      {/* Action tiles + Recent documents */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent documents (2/3) */}
        <div className="lg:col-span-2">
          <ContentPanel padding="none">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recently Updated</h2>
              <Link
                href="/app/docs/vault"
                className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
              >
                Open Vault <ArrowRight className="ml-0.5 inline h-3 w-3" />
              </Link>
            </div>
            <ActivityList
              emptyMessage="No documents yet"
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
        </div>

        {/* Quick actions (1/3) */}
        <div className="flex flex-col gap-4">
          <ContentPanel>
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              {ACTION_TILES.map((tile) => (
                <QuickActionCard
                  key={tile.href}
                  href={tile.href}
                  label={tile.label}
                  description={tile.description}
                  icon={tile.icon}
                  variant={tile.variant}
                />
              ))}
            </div>
          </ContentPanel>

          {/* Create shortcuts */}
          <ContentPanel>
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Create</h2>
            <div className="grid grid-cols-2 gap-2">
              {SUITE_CARDS.map((card) => (
                <Link
                  key={card.type}
                  href={card.newHref}
                  className="group flex flex-col items-center justify-center rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-default)] hover:bg-[var(--surface-selected)] hover:text-[var(--brand-primary)]"
                >
                  <card.icon className="mb-1.5 h-4 w-4" />
                  {card.label.replace("Salary Slips", "Salary Slip")}
                </Link>
              ))}
            </div>
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
