"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import {
  getSettingsPopularTasks,
  getSettingsVisibleEntries,
  searchSettingsEntries,
  settingsGroups,
} from "@/components/settings/settings-registry";

export default function SettingsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const matchedIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return new Set(searchSettingsEntries(searchQuery).map((entry) => entry.id));
  }, [searchQuery]);

  const visibleGroups = useMemo(() => {
    return settingsGroups
      .map((group) => {
        const entries = getSettingsVisibleEntries(group.id);
        const filteredEntries = matchedIds
          ? entries.filter((entry) => matchedIds.has(entry.id))
          : entries;

        if (filteredEntries.length === 0) return null;

        return {
          ...group,
          entries: filteredEntries,
        };
      })
      .filter((group): group is NonNullable<typeof group> => Boolean(group));
  }, [matchedIds]);

  const popularTasks = getSettingsPopularTasks();

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Workspace settings overview</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            Browse account, team, billing, integration, template, and portal controls from one structured workspace.
          </p>
        </div>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search settings"
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-10 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        </div>
      </section>

      <section className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-subtle)]/45 p-5">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Popular tasks
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {popularTasks.map((task) => {
            const TaskIcon = task.icon;
            return (
              <Link
                key={task.id}
                href={task.href}
                className="group flex items-start gap-3 rounded-2xl border border-[var(--border-soft)] bg-white px-4 py-3.5 transition-colors hover:bg-[var(--surface-subtle)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--brand-primary)]">
                  <TaskIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{task.label}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                    {task.description}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div key={group.id} className="border-b border-[var(--border-soft)] pb-6 last:border-b-0 last:pb-0">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                  <GroupIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">{group.label}</h3>
                    <span className="rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {group.entries.length}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{group.description}</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.entries.map((entry) => {
                  const EntryIcon = entry.icon;
                  return (
                    <Link
                      key={entry.id}
                      href={entry.href}
                      className="group flex items-start gap-3 rounded-2xl border border-[var(--border-soft)] px-4 py-3.5 transition-colors hover:bg-[var(--surface-subtle)]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-white text-[var(--text-secondary)]">
                        <EntryIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{entry.label}</p>
                          {entry.statusBadge ? (
                            <span className="rounded-full border border-[var(--border-soft)] bg-white px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                              {entry.statusBadge}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-muted)]">
                          {entry.description}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
