// Sentry utility helpers for manual error reporting

export function captureError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  // In production with Sentry DSN, this would call Sentry.captureException
  // For now, structured logging
  console.error("[ERROR]", error, context ?? {});
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info"
): void {
  console.log(`[${level.toUpperCase()}]`, message);
}

export function setUserContext(userId: string, orgId?: string): void {
  // Will be wired to Sentry.setUser when DSN is configured
  void userId;
  void orgId;
}
