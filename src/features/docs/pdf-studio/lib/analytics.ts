"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { getPdfStudioTool } from "@/features/docs/pdf-studio/lib/tool-registry";
import type {
  PdfStudioToolId,
  PdfStudioToolSurface,
} from "@/features/docs/pdf-studio/types";

type PdfStudioAnalyticsSubject = PdfStudioToolId | "hub";
type PdfStudioAnalyticsEvent =
  | "pdf_studio_entry"
  | "pdf_studio_upload"
  | "pdf_studio_start"
  | "pdf_studio_success"
  | "pdf_studio_fail"
  | "pdf_studio_upgrade_intent";

function getSurfaceFromPathname(pathname: string): PdfStudioToolSurface {
  return pathname.startsWith("/app/docs/pdf-studio") ? "workspace" : "public";
}

export function trackPdfStudioLifecycleEvent(
  eventName: PdfStudioAnalyticsEvent,
  properties: Record<string, unknown>,
) {
  void trackEvent(eventName, properties);
}

export function usePdfStudioAnalytics(subject: PdfStudioAnalyticsSubject) {
  const pathname = usePathname();
  const surface = useMemo(
    () => getSurfaceFromPathname(pathname),
    [pathname],
  );
  const trackedEntry = useRef(false);
  const tool =
    subject === "hub" ? null : getPdfStudioTool(subject);

  const baseProperties = useMemo(
    () => ({
      surface,
      subject,
      executionMode: tool?.executionMode ?? null,
      route: pathname,
    }),
    [pathname, subject, surface, tool?.executionMode],
  );

  useEffect(() => {
    if (trackedEntry.current) {
      return;
    }
    trackedEntry.current = true;
    trackPdfStudioLifecycleEvent("pdf_studio_entry", baseProperties);
  }, [baseProperties]);

  return {
    surface,
    trackUpload(properties?: Record<string, unknown>) {
      trackPdfStudioLifecycleEvent("pdf_studio_upload", {
        ...baseProperties,
        ...properties,
      });
    },
    trackStart(properties?: Record<string, unknown>) {
      trackPdfStudioLifecycleEvent("pdf_studio_start", {
        ...baseProperties,
        ...properties,
      });
    },
    trackSuccess(properties?: Record<string, unknown>) {
      trackPdfStudioLifecycleEvent("pdf_studio_success", {
        ...baseProperties,
        ...properties,
      });
    },
    trackFail(properties?: Record<string, unknown>) {
      trackPdfStudioLifecycleEvent("pdf_studio_fail", {
        ...baseProperties,
        ...properties,
      });
    },
    trackUpgradeIntent(properties?: Record<string, unknown>) {
      trackPdfStudioLifecycleEvent("pdf_studio_upgrade_intent", {
        ...baseProperties,
        ...properties,
      });
    },
  };
}
