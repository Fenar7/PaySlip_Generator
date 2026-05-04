import type { Metadata } from "next";
import Link from "next/link";
import { listInvoices } from "@/app/app/docs/invoices/actions";
import { listVouchers } from "@/app/app/docs/vouchers/actions";
import { listSalarySlips } from "@/app/app/docs/salary-slips/actions";
import { createSupabaseServer } from "@/lib/supabase/server";
import { countPasskeysForUser } from "@/lib/passkey/db";
import { PasskeyAdoptionPrompt } from "./passkey-adoption-prompt";

export const metadata: Metadata = { title: "Home | Slipwise" };

const quickActions = [
  {
    label: "New Invoice",
    href: "/app/docs/invoices/new",
    icon: "📄",
    description: "Create a professional invoice",
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
  },
  {
    label: "New Voucher",
    href: "/app/docs/vouchers/new",
    icon: "🧾",
    description: "Payment or receipt voucher",
    color: "bg-green-50 border-green-200 hover:bg-green-100",
  },
  {
    label: "New Salary Slip",
    href: "/app/docs/salary-slips/new",
    icon: "💰",
    description: "Generate salary slip",
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
  },
  {
    label: "Template Store",
    href: "/app/docs/templates",
    icon: "✨",
    description: "Browse document templates",
    color: "bg-amber-50 border-amber-200 hover:bg-amber-100",
  },
];

const dataLinks = [
  { label: "Customers", href: "/app/data/customers", icon: "👥" },
  { label: "Vendors", href: "/app/data/vendors", icon: "🏢" },
  { label: "Employees", href: "/app/data/employees", icon: "👤" },
  { label: "Salary Presets", href: "/app/data/salary-presets", icon: "📋" },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ISSUED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  DUE: "bg-yellow-100 text-yellow-700",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700",
  draft: "bg-slate-100 text-slate-700",
  released: "bg-green-100 text-green-700",
  payment: "bg-red-100 text-red-700",
  receipt: "bg-green-100 text-green-700",
};

function Badge({ label }: { label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[label] || "bg-slate-100 text-slate-700"}`}>
      {label.replace("_", " ")}
    </span>
  );
}

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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Good day 👋</h1>
          <p className="mt-1 text-sm text-slate-500">What would you like to create today?</p>
        </div>

        <PasskeyAdoptionPrompt show={passkeyCount === 0} />

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex flex-col items-center rounded-xl border p-5 text-center transition-colors ${action.color}`}
            >
              <span className="mb-2 text-3xl">{action.icon}</span>
              <span className="font-semibold text-slate-800">{action.label}</span>
              <span className="mt-1 text-xs text-slate-500">{action.description}</span>
            </Link>
          ))}
        </div>

        <div className="mb-6 grid gap-6 sm:grid-cols-3">
          {/* Invoice Vault Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Invoices</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {invoices.total} total
              </span>
            </div>
            <div className="space-y-2">
              {invoices.invoices.length === 0 ? (
                <p className="text-xs text-slate-400">No invoices yet</p>
              ) : (
                invoices.invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/app/docs/invoices/${inv.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
                  >
                    <span className="font-medium text-blue-600">{inv.invoiceNumber ?? "Draft"}</span>
                    <span className="max-w-[80px] truncate text-slate-500">{inv.customer?.name || "—"}</span>
                    <Badge label={inv.status} />
                  </Link>
                ))
              )}
            </div>
            <Link href="/app/docs/invoices" className="mt-3 flex items-center text-xs text-slate-500 hover:text-slate-700">
              View all invoices
              <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Voucher Vault Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Vouchers</h2>
              <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                {vouchers.total} total
              </span>
            </div>
            <div className="space-y-2">
              {vouchers.vouchers.length === 0 ? (
                <p className="text-xs text-slate-400">No vouchers yet</p>
              ) : (
                vouchers.vouchers.map((v) => (
                  <Link
                    key={v.id}
                    href={`/app/docs/vouchers/${v.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
                  >
                    <span className="font-medium text-blue-600">{v.voucherNumber ?? "Draft"}</span>
                    <span className="max-w-[80px] truncate text-slate-500">{v.vendor?.name || "—"}</span>
                    <Badge label={v.type} />
                  </Link>
                ))
              )}
            </div>
            <Link href="/app/docs/vouchers" className="mt-3 flex items-center text-xs text-slate-500 hover:text-slate-700">
              View all vouchers
              <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Salary Slips Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Salary Slips</h2>
              <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                {slips.total} total
              </span>
            </div>
            <div className="space-y-2">
              {slips.salarySlips.length === 0 ? (
                <p className="text-xs text-slate-400">No slips yet</p>
              ) : (
                slips.salarySlips.map((s) => (
                  <Link
                    key={s.id}
                    href={`/app/docs/salary-slips/${s.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50"
                  >
                    <span className="font-medium text-blue-600">{s.slipNumber}</span>
                    <span className="max-w-[80px] truncate text-slate-500">{s.employee?.name || "—"}</span>
                    <Badge label={s.status} />
                  </Link>
                ))
              )}
            </div>
            <Link href="/app/docs/salary-slips" className="mt-3 flex items-center text-xs text-slate-500 hover:text-slate-700">
              View all slips
              <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Master Data */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Master Data</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {dataLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span>{link.icon}</span>
                {link.label}
                <svg className="ml-auto h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
