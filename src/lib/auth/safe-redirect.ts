const SAFE_EXACT_PATHS = new Set(["/"]);
const SAFE_PREFIXES = [
  "/app",
  "/auth",
  "/onboarding",
  "/invoice",
  "/quote",
  "/portal",
  "/share",
  "/voucher",
  "/salary-slip",
  "/pricing",
  "/privacy",
  "/terms",
];

export function getSafeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/onboarding",
): string {
  if (!candidate) {
    return fallback;
  }

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\") ||
    candidate.includes("\r") ||
    candidate.includes("\n")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "http://localhost");
    const path = parsed.pathname;
    const isAllowed =
      SAFE_EXACT_PATHS.has(path) ||
      SAFE_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );

    if (!isAllowed) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
