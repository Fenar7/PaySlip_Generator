"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface PixelToolShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export function PixelToolShell({
  title,
  description,
  children,
  className,
}: PixelToolShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6", className)}>
      <div className="mb-6">
        <Link
          href="/app/pixel"
          className="inline-flex items-center gap-1.5 text-sm text-[#666] hover:text-[#1a1a1a] transition-colors"
        >
          <span>←</span>
          <span>Back to Pixel Hub</span>
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a]">
          {title}
        </h1>
        <p className="mt-1 text-sm text-[#666]">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
