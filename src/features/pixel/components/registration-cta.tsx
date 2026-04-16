"use client";

import Link from "next/link";

/**
 * Non-intrusive registration nudge shown on public /pixel/* pages after export.
 * Renders a subtle card below the tool — never blocks the tool flow.
 */
export function RegistrationCTA() {
  return (
    <div className="rounded-xl border border-[#e5e5e5] bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-[#1a1a1a]">
            Save your work to a workspace
          </p>
          <p className="mt-1 text-sm text-[#666]">
            Sign up free to save photos, manage clients, and unlock batch print
            sheets, invoices, and more.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/auth/signup"
            className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white hover:bg-[#333]"
          >
            Get started free
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-sm font-medium text-[#1a1a1a] hover:bg-[#f5f5f5]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
