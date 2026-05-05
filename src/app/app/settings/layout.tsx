import type { Metadata } from "next";
import { SettingsNav } from "@/components/settings/settings-nav";

export const metadata: Metadata = {
  title: "Settings — Slipwise",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[var(--container-shell)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your account, organization, and workspace preferences.
        </p>
      </div>

      {/* Two-column shell */}
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar navigation */}
        <aside className="shrink-0 overflow-x-auto lg:sticky lg:top-[calc(var(--topbar-height)+1.5rem)] lg:self-start lg:max-h-[calc(100vh-var(--topbar-height)-3rem)]">
          <div className="slipwise-soft-panel overflow-hidden min-w-[260px]">
            <SettingsNav />
          </div>
        </aside>

        {/* Content area */}
        <main className="min-w-0">
          <div className="space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
