import type { Metadata } from "next";
import Link from "next/link";
import { listInvoices } from "@/app/app/docs/invoices/actions";
import { listVouchers } from "@/app/app/docs/vouchers/actions";
import { listSalarySlips } from "@/app/app/docs/salary-slips/actions";
import { createSupabaseServer } from "@/lib/supabase/server";
import { countPasskeysForUser } from "@/lib/passkey/db";
import { PasskeyAdoptionPrompt } from "./passkey-adoption-prompt";
import {
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
  Sparkles,
  Users,
  Building2,
  UserCircle,
  List,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = { title: "Home | Slipwise" };

const quickActions = [
  {
    label: "New Invoice",
    href: "/app/docs/invoices/new",
    icon: FileText,
    description: "Create a professional invoice",
  },
  {
    label: "New Voucher",
    href: "/app/docs/vouchers/new",
    icon: Receipt,
    description: "Payment or receipt voucher",
  },
  {
    label: "New Salary Slip",
    href: "/app/docs/salary-slips/new",
    icon: Banknote,
    description: "Generate salary slip",
  },
  {
    label: "Template Store",
    href: "/app/docs/templates",
    icon: Sparkles,
    description: "Browse document templates",
  },
];

const dataLinks = [
  { label: "Customers", href: "/app/data/customers", icon: Users },
  { label: "Vendors", href: "/app/data/vendors", icon: Building2 },
  { label: "Employees", href: "/app/data/employees", icon: UserCircle },
  { label: "Salary Presets", href: "/app/data/salary-presets", icon: List },
];

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "danger" | "neutral"> = {
  DRAFT: "neutral",
  ISSUED: "info",
  PAID: "success",
  OVERDUE: "danger",
  DUE: "warning",
  PARTIALLY_PAID: "warning",
  draft: "neutral",
  released: "success",
  payment: "danger",
  receipt: "success",
};

async function getCurrentUserPasskeyCount(): Promise<number> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 1;
  return countPasskeysForUser(user.id);
}

export default async function AppHomePage() {
  const [invoiceData, voucherData, salaryData, passkeyCountData] = await Promise.allSettled([
    listInvoices({ limit: 3 }),
    listVouchers({ limit: 3 }),
    listSalarySlips({ limit: 3 }),
    getCurrentUserPasskeyCount(),
  ]);

  const invoices = invoiceData.status === "fulfilled" ? invoiceData.value : { invoices: [], total: 0 };
  const vouchers = voucherData.status === "fulfilled" ? voucherData.value : { vouchers: [], total: 0 };
  const slips = salaryData.status === "fulfilled" ? salaryData.value : { salarySlips: [], total: 0 };
  const passkeyCount = passkeyCountData.status === "fulfilled" ? passkeyCountData.value : 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Good day</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">What would you like to create today?</p>
      </div>

      <PasskeyAdoptionPrompt show={passkeyCount === 0} />

      {/* Quick Actions */}
      <DashboardSection className="mb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard
              key={action.href}
              href={action.href}
              label={action.label}
              description={action.description}
              icon={action.icon}
              variant="default"
            />
          ))}
        </div>
      </DashboardSection>

      {/* Vault Panels */}
      <DashboardSection className="mb-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Invoices */}
          <ContentPanel>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Invoices
              </h3>
              <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                {invoices.total} total
              </span>
            </div>
            <ActivityList
              emptyMessage="No invoices yet"
              emptyDescription="Create your first invoice to get started"
            >
              {invoices.invoices.map((inv) => (
                <ActivityItem
                  key={inv.id}
                  href={`/app/docs/invoices/${inv.id}`}
                  title={inv.invoiceNumber ?? "Draft"}
                  meta={inv.customer?.name || "—"}
                  badge={
                    <StatusBadge variant={STATUS_VARIANTS[inv.status] ?? "neutral"}>
                      {inv.status.replace("_", " ")}
                    </StatusBadge>
                  }
                />
              ))}
            </ActivityList>
            <Link
              href="/app/docs/invoices"
              className="mt-3 inline-flex items-center text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
            >
              View all invoices
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </ContentPanel>

          {/* Vouchers */}
          <ContentPanel>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Vouchers
              </h3>
              <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                {vouchers.total} total
              </span>
            </div>
            <ActivityList emptyMessage="No vouchers yet">
              {vouchers.vouchers.map((v) => (
                <ActivityItem
                  key={v.id}
                  href={`/app/docs/vouchers/${v.id}`}
                  title={v.voucherNumber ?? "Draft"}
                  meta={v.vendor?.name || "—"}
                  badge={
                    <StatusBadge variant={STATUS_VARIANTS[v.type] ?? "neutral"}>
                      {v.type}
                    </StatusBadge>
                  }
                />
              ))}
            </ActivityList>
            <Link
              href="/app/docs/vouchers"
              className="mt-3 inline-flex items-center text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
            >
              View all vouchers
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </ContentPanel>

          {/* Salary Slips */}
          <ContentPanel>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Salary Slips
              </h3>
              <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                {slips.total} total
              </span>
            </div>
            <ActivityList emptyMessage="No slips yet">
              {slips.salarySlips.map((s) => (
                <ActivityItem
                  key={s.id}
                  href={`/app/docs/salary-slips/${s.id}`}
                  title={s.slipNumber}
                  meta={s.employee?.name || "—"}
                  badge={
                    <StatusBadge variant={STATUS_VARIANTS[s.status] ?? "neutral"}>
                      {s.status.replace("_", " ")}
                    </StatusBadge>
                  }
                />
              ))}
            </ActivityList>
            <Link
              href="/app/docs/salary-slips"
              className="mt-3 inline-flex items-center text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
            >
              View all slips
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </ContentPanel>
        </div>
      </DashboardSection>

      {/* Master Data */}
      <DashboardSection title="Master Data" subtitle="Manage your business entities">
        <ContentPanel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {dataLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--text-muted)] transition-colors group-hover:bg-[var(--surface-selected)] group-hover:text-[var(--brand-primary)]">
                  <link.icon className="h-4 w-4" />
                </span>
                {link.label}
                <ArrowRight className="ml-auto h-4 w-4 text-[var(--border-default)] transition-colors group-hover:text-[var(--brand-primary)]" />
              </Link>
            ))}
          </div>
        </ContentPanel>
      </DashboardSection>
    </div>
  );
}
