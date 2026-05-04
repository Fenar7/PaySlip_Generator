"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Profile", href: "/app/settings/profile" },
  { label: "Security", href: "/app/settings/security" },
  { label: "SSO / SAML", href: "/app/settings/security/sso" },
  { label: "Organization", href: "/app/settings/organization" },
  { label: "Team Members", href: "/app/settings/users" },
  { label: "Roles", href: "/app/settings/roles" },
  { label: "Proxy Access", href: "/app/settings/access" },
  { label: "API Keys", href: "/app/settings/api" },
  { label: "Webhooks", href: "/app/settings/developer/webhooks/v2" },
  { label: "Payment Gateway", href: "/app/settings/payments" },
  { label: "Customer Portal", href: "/app/settings/portal" },
  { label: "Usage & Limits", href: "/app/settings/billing/usage" },
  { label: "Language & Currency", href: "/app/settings/i18n" },
  { label: "Enterprise", href: "/app/settings/enterprise" },
  { label: "Entity Groups", href: "/app/settings/entities" },
  { label: "Audit Log", href: "/app/settings/audit" },
  { label: "Document Numbering", href: "/app/settings/sequences" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-8 text-2xl font-semibold text-[#1a1a1a]">Settings</h1>
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
        <nav className="shrink-0 lg:sticky lg:top-6 lg:self-start">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block px-3 py-2 rounded-md text-sm transition-colors",
                    pathname === item.href
                      ? "bg-[#dc2626] text-white font-medium"
                      : "text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
