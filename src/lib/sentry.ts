// Sentry utility helpers for manual error reporting

type SentryLevel = "info" | "warning" | "error" | "fatal" | "debug";

async function getSentry() {
  try {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) {
      return null;
    }
    const Sentry = await import("@sentry/nextjs");
    return Sentry;
  } catch {
    return null;
  }
}

export async function captureError(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const Sentry = await getSentry();
  if (Sentry) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error("[ERROR]", error, context ?? {});
  }
}

export async function captureMessage(
  message: string,
  level: SentryLevel = "info"
): Promise<void> {
  const Sentry = await getSentry();
  if (Sentry) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`[${level.toUpperCase()}]`, message);
  }
}

export async function setUserContext(
  userId: string,
  email?: string,
  orgId?: string
): Promise<void> {
  const Sentry = await getSentry();
  if (Sentry) {
    Sentry.setUser({
      id: userId,
      email: email ?? undefined,
      ...(orgId ? { organization: orgId } : {}),
    });
  }
}

export async function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, unknown>
): Promise<void> {
  const Sentry = await getSentry();
  if (Sentry) {
    Sentry.addBreadcrumb({
      message,
      category: category ?? "app",
      data,
      level: "info",
    });
  }
}

export async function clearUserContext(): Promise<void> {
  const Sentry = await getSentry();
  if (Sentry) {
    Sentry.setUser(null);
  }
}
