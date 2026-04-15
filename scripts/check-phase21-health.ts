/**
 * scripts/check-phase21-health.ts
 *
 * Phase 21 operational health check — SW Intel AI and Intelligence Layer
 *
 * Verifies Phase 21 subsystem readiness: AI provider config, schema migration
 * state, insight/anomaly service health, extraction backfill, usage metering,
 * and release-time environment validation.
 *
 * Usage:
 *   npx tsx scripts/check-phase21-health.ts
 *
 * Exit code 0 = no critical issues found
 * Exit code 1 = one or more critical issues found
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

interface CheckResult {
  name: string;
  status: "ok" | "warn" | "critical";
  detail: string;
  count?: number;
}

const results: CheckResult[] = [];

function pass(name: string, detail: string, count?: number) {
  results.push({ name, status: "ok", detail, count });
}

function warn(name: string, detail: string, count?: number) {
  results.push({ name, status: "warn", detail, count });
}

function critical(name: string, detail: string, count?: number) {
  results.push({ name, status: "critical", detail, count });
}

// ─── Environment validation ────────────────────────────────────────────────────

function checkEnvironment() {
  const aiKey = process.env.OPENAI_API_KEY;
  const aiDisabled = process.env.AI_DISABLED;
  const aiModel = process.env.OPENAI_MODEL;

  if (aiDisabled === "true") {
    warn(
      "env.ai_disabled",
      "AI_DISABLED=true — all AI provider calls are globally suppressed. Set AI_DISABLED=false or remove to enable.",
    );
  } else if (!aiKey) {
    warn(
      "env.openai_key_missing",
      "OPENAI_API_KEY is not set — AI features will degrade gracefully but will not function. Set key or set AI_DISABLED=true.",
    );
  } else {
    pass("env.openai_key", `OPENAI_API_KEY is configured. Model: ${aiModel ?? "gpt-4o-mini (default)"}`);
  }
}

// ─── Schema migration checks ───────────────────────────────────────────────────

async function checkPhase21Schema() {
  // Verify Phase 21 tables exist by attempting a count on each
  const checks: Array<{ name: string; fn: () => Promise<number> }> = [
    { name: "intel_insight", fn: () => db.intelInsight.count() },
    { name: "insight_event", fn: () => db.insightEvent.count() },
    { name: "ai_job", fn: () => db.aiJob.count() },
    { name: "ai_job_event", fn: () => db.aiJobEvent.count() },
    { name: "extraction_review", fn: () => db.extractionReview.count() },
    { name: "extraction_field", fn: () => db.extractionField.count() },
    { name: "customer_health_snapshot", fn: () => db.customerHealthSnapshot.count() },
    { name: "anomaly_detection_run", fn: () => db.anomalyDetectionRun.count() },
    { name: "anomaly_rule", fn: () => db.anomalyRule.count() },
    { name: "ai_usage_record", fn: () => db.aiUsageRecord.count() },
  ];

  for (const check of checks) {
    try {
      const count = await check.fn();
      pass(`schema.${check.name}`, `Table '${check.name}' exists (${count} rows)`);
    } catch (err) {
      critical(
        `schema.${check.name}`,
        `Table '${check.name}' missing or inaccessible: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

// ─── Insight service health ───────────────────────────────────────────────────

async function checkInsightHealth() {
  const staleCount = await db.intelInsight.count({
    where: {
      expiresAt: { lte: new Date() },
      status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
    },
  });

  if (staleCount > 100) {
    warn(
      "insights.stale_expired",
      `${staleCount} insights have passed their expiresAt but are still ACTIVE/ACKNOWLEDGED. Consider running expireStaleInsights().`,
      staleCount,
    );
  } else {
    pass("insights.stale_expired", `${staleCount} stale insights (within acceptable range)`, staleCount);
  }

  const criticalActiveCount = await db.intelInsight.count({
    where: { severity: "CRITICAL", status: "ACTIVE" },
  });

  if (criticalActiveCount > 0) {
    warn(
      "insights.critical_active",
      `${criticalActiveCount} CRITICAL severity insights currently active and unacknowledged.`,
      criticalActiveCount,
    );
  } else {
    pass("insights.critical_active", "No unacknowledged CRITICAL insights");
  }
}

// ─── AI job health ────────────────────────────────────────────────────────────

async function checkAiJobHealth() {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const stuckJobs = await db.aiJob.count({
    where: {
      status: "RUNNING",
      startedAt: { lte: twoHoursAgo },
    },
  });

  if (stuckJobs > 0) {
    critical(
      "ai_jobs.stuck_running",
      `${stuckJobs} AI job(s) stuck in RUNNING state for >2 hours. These may need manual recovery.`,
      stuckJobs,
    );
  } else {
    pass("ai_jobs.stuck_running", "No AI jobs stuck in RUNNING state");
  }

  const failedLast24h = await db.aiJob.count({
    where: {
      status: "FAILED",
      completedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
  });

  if (failedLast24h > 20) {
    warn(
      "ai_jobs.failure_rate",
      `${failedLast24h} AI jobs failed in the last 24 hours — elevated failure rate. Check provider health.`,
      failedLast24h,
    );
  } else {
    pass("ai_jobs.failure_rate", `${failedLast24h} AI job failures in last 24h (within normal range)`, failedLast24h);
  }
}

// ─── Extraction review health ─────────────────────────────────────────────────

async function checkExtractionHealth() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const stuckReviews = await db.extractionReview.count({
    where: {
      status: { in: ["NEEDS_REVIEW", "PROCESSING"] },
      createdAt: { lte: sevenDaysAgo },
    },
  });

  if (stuckReviews > 0) {
    warn(
      "extraction.stuck_reviews",
      `${stuckReviews} extraction review(s) stuck in NEEDS_REVIEW or PROCESSING for >7 days.`,
      stuckReviews,
    );
  } else {
    pass("extraction.stuck_reviews", "No long-stuck extraction reviews");
  }
}

// ─── Anomaly detection health ─────────────────────────────────────────────────

async function checkAnomalyHealth() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Check if anomaly detection has run recently for any org
  const recentRun = await db.anomalyDetectionRun.findFirst({
    where: { startedAt: { gte: twentyFourHoursAgo } },
    orderBy: { startedAt: "desc" },
  });

  if (!recentRun) {
    warn(
      "anomaly.no_recent_run",
      "No anomaly detection run in the last 24 hours. Consider triggering a run via the Intel → Anomaly Detection page or cron job.",
    );
  } else {
    pass(
      "anomaly.recent_run",
      `Last anomaly run: ${recentRun.startedAt.toISOString()} (status: ${recentRun.status}, rules: ${recentRun.rulesEvaluated})`,
    );
  }

  const failedRuns = await db.anomalyDetectionRun.count({
    where: { status: "PARTIAL", startedAt: { gte: twentyFourHoursAgo } },
  });

  if (failedRuns > 0) {
    warn(
      "anomaly.partial_runs",
      `${failedRuns} anomaly run(s) completed with PARTIAL status (some rules failed). Check anomalyDetectionRun.errorMessage.`,
      failedRuns,
    );
  }
}

// ─── Usage metering health ────────────────────────────────────────────────────

async function checkUsageHealth() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalUsage = await db.aiUsageRecord.count({
    where: { createdAt: { gte: startOfMonth } },
  });

  const failedUsage = await db.aiUsageRecord.count({
    where: { createdAt: { gte: startOfMonth }, success: false },
  });

  const failureRate = totalUsage > 0 ? failedUsage / totalUsage : 0;

  if (failureRate > 0.3 && totalUsage >= 10) {
    warn(
      "usage.high_failure_rate",
      `AI provider failure rate is ${(failureRate * 100).toFixed(1)}% this month (${failedUsage}/${totalUsage} calls failed). Check provider health.`,
    );
  } else {
    pass(
      "usage.failure_rate",
      `AI usage this month: ${totalUsage} calls, ${(failureRate * 100).toFixed(1)}% failure rate`,
      totalUsage,
    );
  }
}

// ─── Release readiness gates ──────────────────────────────────────────────────

function checkReleaseReadiness() {
  const requiredEnvVars = [
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      critical("release.missing_env", `Required environment variable ${envVar} is not set`);
    }
  }

  const optionalButRecommended = ["OPENAI_API_KEY", "CRON_SECRET"];
  for (const envVar of optionalButRecommended) {
    if (!process.env[envVar]) {
      warn(
        "release.missing_optional_env",
        `Recommended environment variable ${envVar} is not set. AI features will degrade or cron jobs will be unprotected.`,
      );
    }
  }
}

// ─── Main runner ──────────────────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Phase 21 Health Check — Slipwise One SW Intel");
  console.log("═══════════════════════════════════════════════════════════\n");

  console.log("Checking environment...");
  checkEnvironment();

  console.log("Checking release readiness...");
  checkReleaseReadiness();

  console.log("Checking Phase 21 schema migrations...");
  await checkPhase21Schema();

  console.log("Checking insight service health...");
  await checkInsightHealth();

  console.log("Checking AI job health...");
  await checkAiJobHealth();

  console.log("Checking extraction review health...");
  await checkExtractionHealth();

  console.log("Checking anomaly detection health...");
  await checkAnomalyHealth();

  console.log("Checking usage metering health...\n");
  await checkUsageHealth();

  // ─── Print results ──────────────────────────────────────────────────────────
  const okCount = results.filter((r) => r.status === "ok").length;
  const warnCount = results.filter((r) => r.status === "warn").length;
  const criticalCount = results.filter((r) => r.status === "critical").length;

  for (const result of results) {
    const icon = result.status === "ok" ? "✓" : result.status === "warn" ? "⚠" : "✗";
    const color =
      result.status === "ok" ? "\x1b[32m" : result.status === "warn" ? "\x1b[33m" : "\x1b[31m";
    const reset = "\x1b[0m";
    console.log(`${color}${icon}${reset} [${result.name}] ${result.detail}`);
  }

  console.log("\n───────────────────────────────────────────────────────────");
  console.log(
    `  Summary: ${okCount} passed · ${warnCount} warnings · ${criticalCount} critical`,
  );
  console.log("───────────────────────────────────────────────────────────\n");

  await db.$disconnect();

  if (criticalCount > 0) {
    console.error("Phase 21 health check FAILED — resolve critical issues before release.");
    process.exit(1);
  }

  if (warnCount > 0) {
    console.log("Phase 21 health check passed with warnings. Review warnings before production release.");
  } else {
    console.log("Phase 21 health check PASSED. All checks OK.");
  }
}

main().catch((err) => {
  console.error("Health check error:", err);
  process.exit(1);
});
