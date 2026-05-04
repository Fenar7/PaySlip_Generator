"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { signOutSupabaseBrowser } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/foundation/logo";
import { OrgSwitcher } from "@/components/org/org-switcher";

import { NotificationBell } from "@/features/flow/components/notification-bell";
import { ProxyBanner } from "@/features/access/components/proxy-banner";
import { getNavigationContext } from "./navigation-context";

interface AppTopbarProps {
  orgName?: string;
  initialUser?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
}

export function AppTopbar({ orgName, initialUser }: AppTopbarProps) {
  const { user, isPending } = useSupabaseSession();
  const router = useRouter();
  const pathname = usePathname();
  const { breadcrumbs, pageTitle, suiteLabel, switcherItems } = getNavigationContext(pathname);
  const resolvedName = user?.user_metadata.name ?? initialUser?.name ?? initialUser?.email ?? undefined;
  const resolvedAvatar =
    user?.user_metadata.avatar_url ?? initialUser?.avatarUrl ?? undefined;
  const hasAuthenticatedUser = Boolean(user || initialUser);

  const handleSignOut = async () => {
    await signOutSupabaseBrowser();
    router.push("/");
  };

  return (
    <>
      <ProxyBanner />
      <header className="sticky top-0 z-20 border-b border-[var(--topbar-border)] bg-[var(--topbar-bg)] backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="flex h-[var(--topbar-height,56px)] items-center gap-4 px-4 sm:px-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <Logo variant="compact" />
          </div>

          {/* Page identity */}
          <div className="min-w-0 flex-1 hidden lg:block">
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {suiteLabel === "Home" ? "Slipwise" : suiteLabel}
              </span>
            </div>
            <h1 className="mt-0.5 truncate text-base font-semibold text-[var(--text-primary)]">
              {pageTitle}
            </h1>
          </div>

          {/* Breadcrumbs - desktop only */}
          <nav className="hidden xl:flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] min-w-0 flex-1 px-4">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.label}-${index}`} className="flex items-center gap-2 shrink-0">
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-[var(--text-primary)]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[var(--text-secondary)]">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? (
                  <span className="text-[var(--border-default)]">/</span>
                ) : null}
              </div>
            ))}
          </nav>

          {/* Right utilities */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <OrgSwitcher initialOrgName={orgName} />
            <div className="h-5 w-px bg-[var(--border-soft)] hidden sm:block" />
            <NotificationBell />
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)]" />
            ) : hasAuthenticatedUser ? (
              <div className="flex items-center gap-2">
                <Avatar name={resolvedName} imageUrl={resolvedAvatar} size="sm" />
                <span className="hidden sm:block text-sm font-medium text-[var(--text-primary)] max-w-[120px] truncate">
                  {resolvedName}
                </span>
                <button
                  onClick={handleSignOut}
                  className="ml-1 rounded-lg border border-[var(--border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-lg border border-[var(--border-default)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-subtle)]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile suite switcher */}
        <nav
          aria-label="Suite switcher"
          className="border-t border-[var(--border-soft)] px-3 py-2 lg:hidden"
        >
          <div className="flex gap-2 overflow-x-auto pb-1">
            {switcherItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    item.isActive
                      ? "border-[var(--brand-primary)] bg-[var(--surface-selected)] text-[var(--brand-primary)]"
                      : "border-[var(--border-soft)] bg-white text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
    </>
  );
}
