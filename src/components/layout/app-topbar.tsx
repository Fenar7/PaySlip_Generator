"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { signOutSupabaseBrowser } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
      <header className="sticky top-0 z-20 border-b border-[var(--border-soft)] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="flex min-h-14 items-start gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
                {suiteLabel === "Home" ? "Slipwise One" : `SW> ${suiteLabel}`}
              </span>
              {orgName ? (
                <span className="slipwise-chip px-2.5 py-1 text-[0.7rem] font-medium">
                  {orgName}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 truncate text-lg font-semibold text-[var(--foreground)] sm:text-xl">
              {pageTitle}
            </h1>
            <nav className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
              {breadcrumbs.map((crumb, index) => (
                <div key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="transition-colors hover:text-[var(--foreground)]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[var(--foreground-soft)]">{crumb.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? <span>/</span> : null}
                </div>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 self-start">
            <NotificationBell />
            {isPending ? (
              <div className="h-9 w-9 animate-pulse rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)]" />
            ) : hasAuthenticatedUser ? (
              <div className="flex items-center gap-2">
                <Avatar
                  name={resolvedName}
                  imageUrl={resolvedAvatar}
                  size="sm"
                />
                <span className="hidden text-sm font-medium text-[var(--foreground)] sm:block">
                  {resolvedName}
                </span>
                <button
                  onClick={handleSignOut}
                  className="ml-1 rounded-xl border border-[var(--border-strong)] bg-white px-3 py-1 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-xl border border-[var(--border-strong)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>

        <nav
          aria-label="Suite switcher"
          className="border-t border-[var(--border-soft)] px-3 py-2 lg:hidden"
        >
          <div className="flex gap-2 overflow-x-auto pb-1">
            {switcherItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  item.isActive
                    ? "border-[var(--accent)] bg-[var(--surface-accent)] text-[var(--accent)]"
                    : "border-[var(--border-soft)] bg-white text-[var(--foreground-soft)] hover:text-[var(--foreground)]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}
