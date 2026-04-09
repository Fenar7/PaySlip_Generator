"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "@/hooks/use-supabase-session";
import { signOutSupabaseBrowser } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";

import { NotificationBell } from "@/features/flow/components/notification-bell";
import { ProxyBanner } from "@/features/access/components/proxy-banner";

interface AppTopbarProps {
  orgName?: string;
}

export function AppTopbar({ orgName }: AppTopbarProps) {
  const { user, isPending } = useSupabaseSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutSupabaseBrowser();
    router.push("/");
  };

  return (
    <>
      <ProxyBanner />
      <header className="flex h-14 items-center border-b border-[var(--border-soft)] bg-white px-6 gap-4">
      {/* Breadcrumb / org name */}
      <div className="flex-1">
        {orgName && (
          <span className="text-sm text-[var(--muted-foreground)]">{orgName}</span>
        )}
      </div>

      {/* User area */}
      <div className="flex items-center gap-3">
        <NotificationBell />
        {isPending ? (
          <div className="w-8 h-8 rounded-full bg-[#333] animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2">
            <Avatar
              name={user.user_metadata.name ?? undefined}
              imageUrl={user.user_metadata.avatar_url ?? undefined}
              size="sm"
            />
            <span className="text-sm font-medium text-[var(--foreground)] hidden sm:block">
              {user.user_metadata.name}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-xl border border-[var(--border-strong)] bg-white px-3 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] transition-colors ml-1"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/auth/login"
            className="rounded-xl border border-[var(--border-strong)] bg-white px-4 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
    </>
  );
}
