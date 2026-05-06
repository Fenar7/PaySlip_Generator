"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthLogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function AuthLogo({ className, showWordmark = true }: AuthLogoProps) {
  const content = (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Brand mark: rounded square with stylized lightning/S */}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm"
        style={{
          background: "linear-gradient(135deg, var(--slipwise-navy) 0%, #1e3a6f 100%)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white"
        >
          <path
            d="M13 2L4.09 12.11C3.89 12.35 3.79 12.65 3.79 12.96C3.79 13.61 4.32 14.14 4.97 14.14H11V22L19.91 11.89C20.11 11.65 20.21 11.35 20.21 11.04C20.21 10.39 19.68 9.86 19.03 9.86H13V2Z"
            fill="currentColor"
          />
        </svg>
      </div>
      {showWordmark && (
        <span className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Slip<span style={{ color: "var(--brand-cta)" }}>wise</span>
        </span>
      )}
    </div>
  );

  return (
    <Link
      href="/"
      className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}
