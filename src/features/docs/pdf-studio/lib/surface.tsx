"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { PdfStudioToolSurface } from "@/features/docs/pdf-studio/types";

export function getPdfStudioSurfaceFromPathname(
  pathname: string,
): PdfStudioToolSurface {
  return pathname.startsWith("/app/docs/pdf-studio") ? "workspace" : "public";
}

export function usePdfStudioSurface() {
  const pathname = usePathname();

  return useMemo(() => {
    const surface = getPdfStudioSurfaceFromPathname(pathname);

    return {
      surface,
      isPublic: surface === "public",
      isWorkspace: surface === "workspace",
    };
  }, [pathname]);
}
