import Link from "next/link";
import {
  Shield,
  Building2,
  FileDigit,
  Plug,
  Eye,
  ArrowRight,
  FileStack,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsCategoryCard {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  items: { label: string; href: string }[];
}

const settingsCategories: SettingsCategoryCard[] = [
  {
    label: "Account & Security",
    description: "Your profile, password, and multi-factor authentication",
    href: "/app/settings/profile",
    icon: Shield,
    items: [
      { label: "Profile", href: "/app/settings/profile" },
      { label: "Security", href: "/app/settings/security" },
      { label: "SSO / SAML", href: "/app/settings/security/sso" },
    ],
  },
  {
    label: "Organization",
    description: "Branding, team, roles, and entity structure",
    href: "/app/settings/organization",
    icon: Building2,
    items: [
      { label: "Organization", href: "/app/settings/organization" },
      { label: "Team Members", href: "/app/settings/users" },
      { label: "Roles", href: "/app/settings/roles" },
      { label: "Entity Groups", href: "/app/settings/entities" },
    ],
  },
  {
    label: "Document Templates",
    description: "Browse, manage, and set default templates by document type",
    href: "/app/settings/templates",
    icon: FileStack,
    items: [
      { label: "Template Library", href: "/app/settings/templates" },
      { label: "Default Templates", href: "/app/settings/templates/defaults" },
      { label: "My Templates", href: "/app/docs/templates/my-templates" },
    ],
  },
  {
    label: "Operations & Defaults",
    description: "Numbering, language, currency, and payroll defaults",
    href: "/app/settings/sequences",
    icon: FileDigit,
    items: [
      { label: "Document Numbering", href: "/app/settings/sequences" },
      { label: "Sequence History", href: "/app/settings/sequences/history" },
      { label: "Language & Currency", href: "/app/settings/i18n" },
      { label: "Payroll", href: "/app/settings/payroll" },
    ],
  },
  {
    label: "Integrations & Data",
    description: "Connect apps, manage API keys, and configure webhooks",
    href: "/app/settings/integrations",
    icon: Plug,
    items: [
      { label: "Integrations", href: "/app/settings/integrations" },
      { label: "API Keys", href: "/app/settings/api" },
      { label: "Webhooks", href: "/app/settings/developer/webhooks/v2" },
      { label: "Payment Gateway", href: "/app/settings/payments" },
      { label: "Customer Portal", href: "/app/settings/portal" },
    ],
  },
  {
    label: "Advanced & Admin",
    description: "Audit, access control, billing, and compliance",
    href: "/app/settings/audit",
    icon: Eye,
    items: [
      { label: "Proxy Access", href: "/app/settings/access" },
      { label: "Audit Log", href: "/app/settings/audit" },
      { label: "Usage & Limits", href: "/app/settings/billing/usage" },
      { label: "Enterprise", href: "/app/settings/enterprise" },
      { label: "E-Invoice Config", href: "/app/settings/compliance/einvoice" },
    ],
  },
];

function CategoryCard({ category }: { category: SettingsCategoryCard }) {
  const Icon = category.icon;
  return (
    <div className="slipwise-panel flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-selected)]">
          <Icon className="h-5 w-5 text-[var(--brand-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {category.label}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
            {category.description}
          </p>
        </div>
      </div>
      <div className="flex-1 border-t border-[var(--border-soft)] bg-[var(--surface-subtle)]/40 px-3 py-2">
        <ul className="space-y-0.5">
          {category.items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
                )}
              >
                <span className="truncate">{item.label}</span>
                <ArrowRight className="ml-auto h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {settingsCategories.map((category) => (
          <CategoryCard key={category.label} category={category} />
        ))}
      </div>
    </div>
  );
}
