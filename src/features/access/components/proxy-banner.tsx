"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMyActiveProxy } from "@/app/app/settings/access/actions";

export function ProxyBanner() {
  const [proxy, setProxy] = useState<{
    id: string;
    representedName: string;
    scope: string[];
    expiresAt: string;
  } | null>(null);

  useEffect(() => {
    getMyActiveProxy()
      .then(setProxy)
      .catch(() => setProxy(null));
  }, []);

  if (!proxy) return null;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-amber-800">
          <span className="text-base">⚠</span>
          <span>
            You are acting as proxy for{" "}
            <strong>{proxy.representedName}</strong>. Scope:{" "}
            {proxy.scope.join(", ")}. All actions logged.
          </span>
        </div>
        <Link
          href="/app/settings/access"
          className="text-amber-700 font-medium hover:text-amber-900 underline underline-offset-2"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
