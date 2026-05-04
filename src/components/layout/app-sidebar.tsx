"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/foundation/logo";
import { getNavigationContext } from "./navigation-context";
import { Settings } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { switcherItems } = getNavigationContext(pathname);

  return (
    <aside className="flex h-full w-[var(--sidebar-width,240px)] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
      {/* Logo */}
      <div className="flex h-[var(--topbar-height,56px)] items-center border-b border-[var(--sidebar-border)] px-4">
        <Logo variant="full" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        <ul className="space-y-0.5">
          {switcherItems.map((item) => {
            const isActive = item.isActive;
            const isDisabled = item.badge === "Soon";
            const Icon = item.icon;

            return (
              <li key={item.href}>
                {isDisabled ? (
                  <div className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 opacity-40">
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-[var(--sidebar-text-muted)]" />}
                    <span className="text-sm font-medium text-[var(--sidebar-text-muted)]">{item.label}</span>
                    <span className="ml-auto rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Soon
                    </span>
                  </div>
                ) : (
                  <div className="group">
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[var(--sidebar-surface-active)] text-[var(--sidebar-text-active)]"
                          : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-surface-hover)] hover:text-[var(--sidebar-text-active)]"
                      )}
                    >
                      {Icon && (
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"
                          )}
                        />
                      )}
                      <span className={cn(isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
                      {item.children && (
                        <span
                          className={cn(
                            "ml-auto h-1.5 w-1.5 rounded-full transition-colors",
                            isActive ? "bg-[var(--brand-primary)]" : "bg-[var(--border-soft)]"
                          )}
                        />
                      )}
                    </Link>
                    {isActive && item.children && (
                      <ul className="mt-0.5 ml-[26px] space-y-0.5 border-l border-[var(--border-soft)] pl-3">
                        {item.children.map((child) => {
                          const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={cn(
                                  "flex items-center rounded-md px-2.5 py-1.5 text-xs transition-colors",
                                  childActive
                                    ? "font-semibold text-[var(--brand-primary)]"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                                )}
                              >
                                {childActive && (
                                  <span className="mr-2 h-1 w-1 rounded-full bg-[var(--brand-primary)]" />
                                )}
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: Settings link */}
      <div className="border-t border-[var(--sidebar-border)] p-2.5">
        <Link
          href="/app/settings/profile"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-surface-hover)] hover:text-[var(--sidebar-text-active)] transition-colors"
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
