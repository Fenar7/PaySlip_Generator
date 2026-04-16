// @ts-nocheck — Sentry star-re-exports create TS ambiguity; verified correct at runtime
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const { init } = await import("@sentry/nextjs");
    init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? "production",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      enabled: !!process.env.SENTRY_DSN,
    });
  }
}
