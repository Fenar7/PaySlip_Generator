"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { PanelLeft, Settings2, X } from "lucide-react";
import { SettingsNav } from "./settings-nav";
import { getSettingsContext } from "./settings-registry";

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { entry, group } = useMemo(() => getSettingsContext(pathname), [pathname]);
  const GroupIcon = group?.icon;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {group?.label ?? "Workspace settings"}
          </p>
          <h1 className="truncate text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            {entry?.label ?? "Settings"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)]"
        >
          {mobileNavOpen ? <X className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          {mobileNavOpen ? "Close" : "Menu"}
        </button>
      </div>

      {mobileNavOpen ? (
        <div className="mb-4 overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)] lg:hidden">
          <SettingsNav onNavigate={() => setMobileNavOpen(false)} />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden shrink-0 lg:block lg:sticky lg:top-[calc(var(--topbar-height)+1rem)] lg:self-start lg:max-h-[calc(100vh-var(--topbar-height)-2rem)]">
          <div className="overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <SettingsNav />
          </div>
        </aside>

        <main className="min-w-0">
          <div className="overflow-hidden rounded-[28px] border border-[var(--border-soft)] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <div className="border-b border-[var(--border-soft)] px-6 py-5 sm:px-7">
              <div className="flex items-start gap-4">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] sm:flex">
                  {GroupIcon ? <GroupIcon className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {group?.label ?? "Workspace settings"}
                  </p>
                  <h1 className="mt-1 text-[2rem] font-semibold tracking-tight text-[var(--text-primary)]">
                    {entry?.label ?? "Settings"}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-secondary)]">
                    {entry?.description ?? "Manage your account, organization, templates, billing, integrations, and admin controls from a single operational workspace."}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 sm:px-7">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
