"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthLogoProps {
  className?: string;
}

export function AuthLogo({ className }: AuthLogoProps) {
  const content = (
    <div className={cn("inline-flex items-center", className)}>
      <Image
        src="/images/slipwise-logo.png"
        alt="Slipwise"
        width={140}
        height={27}
        className="h-auto w-[120px] sm:w-[140px] object-contain"
        priority
      />
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
