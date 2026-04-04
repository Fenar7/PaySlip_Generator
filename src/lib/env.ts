import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 chars"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional().default("noreply@slipwise.app"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Slipwise One"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    // In production, throw. In dev, warn and continue with defaults where possible.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables");
    }
  }
  return (result.data ?? {}) as Env;
}

export const env = validateEnv();
