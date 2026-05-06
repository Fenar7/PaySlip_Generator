"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSettingsGroup,
  getSettingsVisibleEntries,
  isSettingsHrefActive,
  searchSettingsEntries,
  settingsGroups,
  type SettingsRouteEntry,
} from "./settings-registry";

interface SettingsNavProps {
  onNavigate?: () => void;
}

function SettingsNavItem({
  item,
  isActive,
  isSecondary,
  onNavigate,
}: {
  item: SettingsRouteEntry;
  isActive: boolean;
  isSecondary: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
        isActive
          ? "bg-[var(--surface-subtle)] text-[var(--text-primary)] shadow-[inset_3px_0_0_var(--brand-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]",
        isSecondary && "pl-5"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          isActive
            ? "border-[var(--border-brand)] bg-white text-[var(--brand-primary)]"
            : "border-[var(--border-soft)] bg-white text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("truncate text-sm", isActive ? "font-semibold" : "font-medium")}>
            {item.label}
          </span>
          {item.statusBadge ? (
            <span className="rounded-full border border-[var(--border-soft)] bg-white px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {item.statusBadge}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-[var(--text-muted)]">
          {item.description}
        </p>
      </div>
      <ChevronRight
        className={cn(
          "h-4 w-4 shrink-0 transition-transform",
          isActive ? "translate-x-0 text-[var(--brand-primary)]" : "text-[var(--text-muted)] group-hover:translate-x-0.5"
        )}
      />
    </Link>
  );
}

function SettingsNavGroup({
  groupId,
  activePath,
  searchQuery,
  collapsed,
  onToggle,
  onNavigate,
}: {
  groupId: string;
  activePath: string;
  searchQuery: string;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const group = getSettingsGroup(groupId);
  const allEntries = useMemo(() => getSettingsVisibleEntries(groupId), [groupId]);
  const matchingItems = useMemo(() => {
    if (!searchQuery.trim()) return allEntries;
    const matchedIds = new Set(searchSettingsEntries(searchQuery).map((entry) => entry.id));
    return allEntries.filter((entry) => matchedIds.has(entry.id));
  }, [allEntries, searchQuery]);

  const hasActiveChild = useMemo(
    () => allEntries.some((entry) => isSettingsHrefActive(activePath, entry.href)),
    [activePath, allEntries]
  );

  if (!group || matchingItems.length === 0) return null;

  const GroupIcon = group.icon;

  const shouldForceOpen = searchQuery.trim().length > 0 || hasActiveChild;
  const isOpen = shouldForceOpen || !collapsed;

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--surface-subtle)]"
      >
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-white text-[var(--text-secondary)]">
          <GroupIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{group.label}</span>
            <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {allEntries.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">
            {group.description}
          </p>
        </div>
        <div className="mt-1 shrink-0 rounded-full border border-[var(--border-soft)] bg-white p-1 text-[var(--text-muted)]">
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen ? "rotate-180" : "rotate-0")} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.ul
            key={`${group.id}-items`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="space-y-2 overflow-hidden pl-2"
          >
            {matchingItems.map((item) => {
              const isActive = isSettingsHrefActive(activePath, item.href);
              return (
                <li key={item.id}>
                  <SettingsNavItem
                    item={item}
                    isActive={isActive}
                    isSecondary={item.navVisibility === "secondary"}
                    onNavigate={onNavigate}
                  />
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export function SettingsNav({ onNavigate }: SettingsNavProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    "organization-team": true,
    "templates-documents": true,
    "regional-operations": true,
    "integrations-platform": true,
    "payments-billing": true,
    "portal-external": true,
    "advanced-admin": true,
  });

  function toggleGroup(groupId: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border-soft)] px-4 pb-4 pt-4">
        <div className="mb-3">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Settings navigation
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Search and move between every account, workspace, portal, and admin page.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search settings"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-10 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {settingsGroups.map((group) => (
          <SettingsNavGroup
            key={group.id}
            groupId={group.id}
            activePath={pathname}
            searchQuery={searchQuery}
            collapsed={Boolean(collapsedGroups[group.id])}
            onToggle={() => toggleGroup(group.id)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
}
