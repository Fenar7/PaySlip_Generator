import type { Metadata } from "next";
import Link from "next/link";

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

const vaultLinks = [
  { label: "Invoice Vault", href: "/app/docs/invoices", icon: "📁" },
  { label: "Voucher Vault", href: "/app/docs/vouchers", icon: "📁" },
  { label: "Salary Slips", href: "/app/docs/salary-slips", icon: "📁" },
];

const dataLinks = [
  { label: "Customers", href: "/app/data/customers", icon: "👥" },
  { label: "Vendors", href: "/app/data/vendors", icon: "🏢" },
  { label: "Employees", href: "/app/data/employees", icon: "👤" },
  { label: "Salary Presets", href: "/app/data/salary-presets", icon: "📋" },
];

export default function AppHomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Good day 👋</h1>
          <p className="mt-1 text-sm text-slate-500">What would you like to create today?</p>
        </div>

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

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Vaults */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Document Vaults</h2>
            <div className="space-y-2">
              {vaultLinks.map((link) => (
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

          {/* Master Data */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Master Data</h2>
            <div className="space-y-2">
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
    </div>
  );
}
