import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Home" };

const quickLinks = [
  { href: "/app/docs/invoices/new", label: "New Invoice", description: "Create a professional invoice", icon: "📄" },
  { href: "/app/docs/vouchers/new", label: "New Voucher", description: "Create a payment or receipt voucher", icon: "🧾" },
  { href: "/app/docs/salary-slips/new", label: "New Salary Slip", description: "Generate a salary slip", icon: "💼" },
  { href: "/app/docs/pdf-studio", label: "PDF Studio", description: "Convert and process PDF files", icon: "🖨️" },
];

export default function AppHomePage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-10">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[var(--muted-foreground)]">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Welcome to Slipwise One
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Your document operations suite. Create, export, and manage business documents.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-start gap-4 rounded-2xl border border-[var(--border-strong)] bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-lift)]"
          >
            <span className="text-3xl">{link.icon}</span>
            <div>
              <h2 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">
                {link.label}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
