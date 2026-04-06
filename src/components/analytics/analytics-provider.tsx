"use client";

import { useEffect, useState, type ReactNode } from "react";

function usePostHogInit() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

    if (!key || initialized) return;

    import("posthog-js")
      .then((mod) => {
        const posthog = mod.default;
        if (!posthog.__loaded) {
          posthog.init(key, {
            api_host: host,
            capture_pageview: true,
            capture_pageleave: true,
            persistence: "localStorage+cookie",
          });
        }
        setInitialized(true);
      })
      .catch(() => {
        // PostHog not available — analytics disabled
      });
  }, [initialized]);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  usePostHogInit();
  return <>{children}</>;
}
