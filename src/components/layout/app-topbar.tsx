"use client";

import Link from "next/link";

// Placeholder — will be wired to real session in Slice 1.1.2
interface AppTopbarProps {
  userName?: string;
  userImage?: string;
  orgName?: string;
}

export function AppTopbar({ userName, orgName }: AppTopbarProps) {
  return (
    <header className="flex h-14 items-center border-b border-[var(--border-soft)] bg-white px-6 gap-4">
      {/* Breadcrumb / org name */}
      <div className="flex-1">
        {orgName && (
          <span className="text-sm text-[var(--muted-foreground)]">{orgName}</span>
        )}
      </div>

      {/* User area */}
      <div className="flex items-center gap-3">
        {userName ? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-[var(--foreground)] hidden sm:block">
              {userName}
            </span>
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
  );
}
