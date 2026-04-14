import { z } from "zod";

/**
 * Core app env is validated here. Feature- and integration-specific variables
 * remain optional because those modules gate themselves at use time. The full
 * runtime inventory is documented in `.env.example`.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional().default("noreply@slipwise.app"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3001"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Slipwise One"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["supabase", "s3"]).default("supabase"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_STARTER_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_STARTER_YEARLY: z.string().optional(),
  RAZORPAY_PLAN_PRO_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_PRO_YEARLY: z.string().optional(),
  RAZORPAY_PLAN_ENTERPRISE_MONTHLY: z.string().optional(),
  RAZORPAY_PLAN_ENTERPRISE_YEARLY: z.string().optional(),
  MARKETPLACE_FINANCE_USER_IDS: z.string().optional(),
  MARKETPLACE_PAYOUT_PROVIDER: z.string().optional(),
  MARKETPLACE_PAYOUT_SETTLEMENT_HOLD_DAYS: z.string().optional(),
  PAYOUT_DETAILS_ENCRYPTION_KEY: z.string().optional(),
  DUNNING_OPT_OUT_SECRET: z.string().optional(),
  CUSTOMER_PORTAL_BASE_URL: z.string().url().optional(),
  PORTAL_JWT_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  MSG91_API_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  // Phase 12
  EXCHANGE_RATE_API_KEY: z.string().optional(),
  OPEN_EXCHANGE_RATES_APP_ID: z.string().optional(),
  EXCHANGE_RATE_API_URL: z.string().url().optional(),
  FEATURE_PAYMENT_LINKS_ENABLED: z.string().optional().default("true"),
  FEATURE_SMART_COLLECT_ENABLED: z.string().optional().default("true"),
  FEATURE_API_PLATFORM_ENABLED: z.string().optional().default("true"),
  FEATURE_SSO_ENABLED: z.string().optional().default("true"),
  // Phase 13
  AWS_REGION: z.string().optional().default("ap-south-1"),
  AWS_S3_BUCKET_ASSETS: z.string().optional(),
  AWS_S3_BUCKET_PRIVATE: z.string().optional(),
  CLOUDFRONT_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  QUICKBOOKS_CLIENT_ID: z.string().optional(),
  QUICKBOOKS_CLIENT_SECRET: z.string().optional(),
  QUICKBOOKS_REDIRECT_URI: z.string().url().optional(),
  ZOHO_CLIENT_ID: z.string().optional(),
  ZOHO_CLIENT_SECRET: z.string().optional(),
  ZOHO_REDIRECT_URI: z.string().url().optional(),
  IRP_MODE: z.enum(["sandbox", "production"]).optional(),
  IRP_SANDBOX_URL: z.string().url().optional(),
  IRP_API_BASE_URL: z.string().url().optional(),
  IRP_CLIENT_ID: z.string().optional(),
  IRP_CLIENT_SECRET: z.string().optional(),
  IRP_USERNAME: z.string().optional(),
  IRP_PASSWORD: z.string().optional(),
  VERCEL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  CHROME_EXECUTABLE_PATH: z.string().optional(),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables");
    }
  }
  return (result.data ?? {}) as Env;
}

export const env = validateEnv();
