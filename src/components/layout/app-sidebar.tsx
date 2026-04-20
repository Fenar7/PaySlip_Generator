"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavigationContext } from "./navigation-context";

export function AppSidebar() {
  const pathname = usePathname();
  const { switcherItems } = getNavigationContext(pathname);

  return (
    <aside className="flex h-full w-[var(--sidebar-width,240px)] flex-col border-r border-[var(--border-soft)] bg-[#1a1a1a]">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-white/10 px-5">
        <Link href="/app/home" className="flex items-center gap-2">
          <span className="rounded-lg bg-[var(--accent)] px-2 py-1 text-[0.65rem] font-black uppercase tracking-widest text-white">
            SW
          </span>
          <span className="text-sm font-semibold text-white/80">Slipwise One</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {switcherItems.map((item) => {
            const isActive = item.isActive;
            const isDisabled = item.badge === "Soon";

            return (
              <li key={item.href}>
                {isDisabled ? (
                  <div
                    className="flex cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 opacity-40"
                  >
                    <span className="text-sm font-medium text-white/70">{item.label}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-white/50">
                      Soon
                    </span>
                  </div>
                ) : (
                  <>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-[var(--accent)] text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                    {isActive && item.children && (
                      <ul className="mt-0.5 ml-3 space-y-0.5">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                             href={child.href}
                             className={cn(
                                "flex items-center rounded-lg px-3 py-2 text-xs transition-colors",
                                pathname === child.href || pathname.startsWith(`${child.href}/`)
                                  ? "text-white font-medium"
                                  : "text-white/50 hover:text-white/80"
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: Settings link */}
      <div className="border-t border-white/10 p-3">
        <Link
          href="/app/settings/profile"
          className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-white/10 hover:text-white transition-colors"
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}
