"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Shield,
  KeyRound,
  Building2,
  Users,
  UserCog,
  LayoutGrid,
  FileDigit,
  History,
  Languages,
  Wallet,
  Plug,
  Webhook,
  CreditCard,
  DoorOpen,
  Eye,
  ScrollText,
  BarChart3,
  Briefcase,
  Receipt,
  Zap,
  Search,
  ChevronRight,
  FileStack,
  Star,
} from "lucide-react";
import { useState, useMemo } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const settingsGroups: NavGroup[] = [
  {
    id: "account",
    label: "Account & Security",
    items: [
      { label: "Profile", href: "/app/settings/profile", icon: User },
      { label: "Security", href: "/app/settings/security", icon: Shield },
      { label: "SSO / SAML", href: "/app/settings/security/sso", icon: KeyRound },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    items: [
      { label: "Organization", href: "/app/settings/organization", icon: Building2 },
      { label: "Team Members", href: "/app/settings/users", icon: Users },
      { label: "Roles", href: "/app/settings/roles", icon: UserCog },
      { label: "Entity Groups", href: "/app/settings/entities", icon: LayoutGrid },
    ],
  },
  {
    id: "templates",
    label: "Document Templates",
    items: [
      { label: "Template Library", href: "/app/settings/templates", icon: FileStack },
      { label: "Default Templates", href: "/app/settings/templates/defaults", icon: Star },
    ],
  },
  {
    id: "operations",
    label: "Operations & Defaults",
    items: [
      { label: "Document Numbering", href: "/app/settings/sequences", icon: FileDigit },
      { label: "Sequence History", href: "/app/settings/sequences/history", icon: History },
      { label: "Language & Currency", href: "/app/settings/i18n", icon: Languages },
      { label: "Payroll", href: "/app/settings/payroll", icon: Wallet },
    ],
  },
  {
    id: "integrations",
    label: "Integrations & Data",
    items: [
      { label: "Integrations", href: "/app/settings/integrations", icon: Plug },
      { label: "API Keys", href: "/app/settings/api", icon: Zap },
      { label: "Webhooks", href: "/app/settings/developer/webhooks/v2", icon: Webhook },
      { label: "Payment Gateway", href: "/app/settings/payments", icon: CreditCard },
      { label: "Customer Portal", href: "/app/settings/portal", icon: DoorOpen },
    ],
  },
  {
    id: "advanced",
    label: "Advanced & Admin",
    items: [
      { label: "Proxy Access", href: "/app/settings/access", icon: Eye },
      { label: "Audit Log", href: "/app/settings/audit", icon: ScrollText },
      { label: "Usage & Limits", href: "/app/settings/billing/usage", icon: BarChart3 },
      { label: "Enterprise", href: "/app/settings/enterprise", icon: Briefcase },
      { label: "E-Invoice Config", href: "/app/settings/compliance/einvoice", icon: Receipt },
    ],
  },
];

function SettingsNavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all",
        isActive
          ? "bg-[var(--surface-selected)] text-[var(--brand-primary)] font-semibold shadow-[0_0_0_1px_var(--border-brand)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
        )}
      />
      <span className="truncate">{item.label}</span>
      {item.badge && (
        <span className="ml-auto shrink-0 rounded-full bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {item.badge}
        </span>
      )}
      {isActive && (
        <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60" />
      )}
    </Link>
  );
}

function SettingsNavGroup({
  group,
  activeHref,
  searchQuery,
}: {
  group: NavGroup;
  activeHref: string;
  searchQuery: string;
}) {
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return group.items;
    const q = searchQuery.toLowerCase();
    return group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        group.label.toLowerCase().includes(q)
    );
  }, [group.items, group.label, searchQuery]);

  const hasActiveChild = useMemo(
    () => group.items.some((item) => activeHref === item.href || activeHref.startsWith(`${item.href}/`)),
    [group.items, activeHref]
  );

  const isOpen = searchQuery.trim().length > 0 || hasActiveChild;

  if (filteredItems.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="px-3 py-1.5">
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          {group.label}
        </span>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-0.5 overflow-hidden"
          >
            {filteredItems.map((item) => {
              const isActive = activeHref === item.href || activeHref.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <SettingsNavItem item={item} isActive={isActive} />
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SettingsNav() {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Find settings…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] pl-8 pr-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all"
          />
        </div>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-4">
        {settingsGroups.map((group) => (
          <SettingsNavGroup
            key={group.id}
            group={group}
            activeHref={pathname}
            searchQuery={searchQuery}
          />
        ))}
      </nav>
    </div>
  );
}

export { settingsGroups };
