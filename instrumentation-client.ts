// @ts-nocheck — Sentry's star-re-exports from client/server/edge create TS ambiguity
// Client-side Sentry initialization (Next.js instrumentation-client convention)
import { init } from "@sentry/nextjs";

init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? "production",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
