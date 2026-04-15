/**
 * scripts/check-phase20-health.ts
 *
 * Phase 20 operational health check — Sprint 20.5
 *
 * Inspects the Phase 20 subsystem data for known gap patterns that could
 * indicate missing backfills, inconsistent state, or misconfiguration.
 *
 * Usage (dry-run, no writes):
 *   npx tsx scripts/check-phase20-health.ts
 *
 * Output: structured health-check summary to stdout.
 * Exit code 0 = no critical issues found
 * Exit code 1 = one or more critical issues found
 */

import { Prisma, PrismaClient } from "@/generated/prisma/client";
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

// ─── Payout health checks ──────────────────────────────────────────────────

async function checkPayoutHealth() {
  // Check for payout runs stuck in processing (indicates interrupted execution)
  const stuckRuns = await db.marketplacePayoutRun.count({
    where: { status: "processing" },
  });
  if (stuckRuns > 0) {
    warn(
      "payout.stuck_processing",
      `${stuckRuns} payout run(s) stuck in 'processing' — may need manual resolution`,
      stuckRuns,
    );
  } else {
    pass("payout.stuck_processing", "No payout runs stuck in processing");
  }

  // Check for payout items in FAILED state without a manual review reason
  const unresolvedFailed = await db.marketplacePayoutItem.count({
    where: {
      status: "FAILED",
      manualReviewReason: null,
    },
  });
  if (unresolvedFailed > 0) {
    warn(
      "payout.unresolved_failed_items",
      `${unresolvedFailed} payout item(s) in FAILED with no manual resolution recorded`,
      unresolvedFailed,
    );
  } else {
    pass("payout.unresolved_failed_items", "No unresolved failed payout items");
  }

  // Check for beneficiaries with missing bank account details (status PENDING)
  const pendingBeneficiaries = await db.marketplacePayoutBeneficiary.count({
    where: { status: "PENDING" },
  });
  if (pendingBeneficiaries > 0) {
    warn(
      "payout.pending_beneficiaries",
      `${pendingBeneficiaries} payout beneficiar(ies) still in PENDING — payouts blocked until VERIFIED`,
      pendingBeneficiaries,
    );
  } else {
    pass("payout.pending_beneficiaries", "No unverified payout beneficiaries");
  }
}

// ─── GST filing health checks ──────────────────────────────────────────────

async function checkGstHealth() {
  // Check for filing runs stuck in intermediate states (SUBMISSION_PENDING or RECONCILING)
  const stuckFilingRuns = await db.gstFilingRun.count({
    where: { status: { in: ["SUBMISSION_PENDING", "RECONCILING"] } },
  });
  if (stuckFilingRuns > 0) {
    warn(
      "gst.stuck_runs",
      `${stuckFilingRuns} GST filing run(s) stuck in SUBMISSION_PENDING or RECONCILING`,
      stuckFilingRuns,
    );
  } else {
    pass("gst.stuck_runs", "No GST filing runs stuck in intermediate state");
  }

  // Check for submission attempts with INTENT_RECORDED (may need retry)
  const pendingSubmissions = await db.gstFilingSubmission.count({
    where: { status: "INTENT_RECORDED" },
  });
  if (pendingSubmissions > 0) {
    warn(
      "gst.pending_submissions",
      `${pendingSubmissions} GST submission(s) in INTENT_RECORDED — may need retry or manual action`,
      pendingSubmissions,
    );
  } else {
    pass("gst.pending_submissions", "No GST submissions stuck in INTENT_RECORDED");
  }

  // Check for filing runs with ERROR-severity validation issues that moved past READY
  const submittedWithIssues = await db.gstFilingRun.count({
    where: {
      status: { in: ["RECONCILING", "RECONCILED"] },
      validationIssues: { some: { severity: "ERROR" } },
    },
  });
  if (submittedWithIssues > 0) {
    warn(
      "gst.submitted_with_errors",
      `${submittedWithIssues} GST filing run(s) reconciling/reconciled despite having ERROR-severity validation issues`,
      submittedWithIssues,
    );
  } else {
    pass("gst.submitted_with_errors", "No filings reconciling with outstanding ERROR-level issues");
  }
}

// ─── SSO health checks ─────────────────────────────────────────────────────

async function checkSsoHealth() {
  // Check for SSO configs with metadataUrl but metadata never fetched
  const neverFetched = await db.ssoConfig.count({
    where: {
      metadataUrl: { not: null },
      metadataLastFetchedAt: null,
    },
  });
  if (neverFetched > 0) {
    warn(
      "sso.metadata_never_fetched",
      `${neverFetched} SSO config(s) have a metadataUrl but metadata has never been fetched`,
      neverFetched,
    );
  } else {
    pass("sso.metadata_never_fetched", "All SSO configs with metadataUrl have been fetched");
  }

  // Check for active SSO configs without IdP certificates
  const activeWithoutCert = await db.ssoConfig.count({
    where: {
      isActive: true,
      idpCertificates: { equals: Prisma.DbNull },
    },
  });
  if (activeWithoutCert > 0) {
    critical(
      "sso.active_without_certificate",
      `${activeWithoutCert} SSO config(s) are active but have no IdP certificates — logins will fail`,
      activeWithoutCert,
    );
  } else {
    pass("sso.active_without_certificate", "All active SSO configs have IdP certificates");
  }

  // Check for orgs with SSO enforced but SSO config not active
  const enforcedNotActive = await db.ssoConfig.count({
    where: {
      ssoEnforced: true,
      isActive: false,
    },
  });
  if (enforcedNotActive > 0) {
    critical(
      "sso.enforced_but_inactive",
      `${enforcedNotActive} SSO config(s) have ssoEnforced=true but isActive=false — users may be locked out`,
      enforcedNotActive,
    );
  } else {
    pass("sso.enforced_but_inactive", "No SSO configs have inconsistent enforce+inactive state");
  }

  // Check for SSO configs with FAILED metadata status that are still active
  const failedMetadataActive = await db.ssoConfig.count({
    where: {
      isActive: true,
      metadataStatus: "FAILED",
    },
  });
  if (failedMetadataActive > 0) {
    warn(
      "sso.active_with_failed_metadata",
      `${failedMetadataActive} SSO config(s) are active with FAILED metadata — metadata refresh required`,
      failedMetadataActive,
    );
  } else {
    pass("sso.active_with_failed_metadata", "No active SSO configs with failed metadata status");
  }
}

// ─── Payment run rejection health checks ───────────────────────────────────

async function checkPaymentRunHealth() {
  // Check for payment runs in REJECTED state without a reason (data integrity)
  const rejectedWithoutReason = await db.paymentRun.count({
    where: {
      status: "REJECTED",
      rejectionReason: null,
    },
  });
  if (rejectedWithoutReason > 0) {
    warn(
      "payment_run.rejected_without_reason",
      `${rejectedWithoutReason} payment run(s) in REJECTED state have no rejectionReason recorded`,
      rejectedWithoutReason,
    );
  } else {
    pass(
      "payment_run.rejected_without_reason",
      "All rejected payment runs have a reason recorded",
    );
  }
}

// ─── Runner ────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Phase 20 — Operational Health Check (Sprint 20.5)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    await checkPayoutHealth();
    await checkGstHealth();
    await checkSsoHealth();
    await checkPaymentRunHealth();
  } catch (err) {
    console.error("Health check failed to run:", err);
    await db.$disconnect();
    process.exit(1);
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  const warnCount = results.filter((r) => r.status === "warn").length;
  const criticalCount = results.filter((r) => r.status === "critical").length;

  for (const r of results) {
    const icon = r.status === "ok" ? "✅" : r.status === "warn" ? "⚠️ " : "🔴";
    console.log(`${icon} [${r.status.toUpperCase()}] ${r.name}`);
    console.log(`   ${r.detail}\n`);
  }

  console.log("───────────────────────────────────────────────────────────────");
  console.log(`  Summary: ${okCount} ok  |  ${warnCount} warn  |  ${criticalCount} critical`);
  console.log("───────────────────────────────────────────────────────────────\n");

  await db.$disconnect();

  if (criticalCount > 0) {
    console.error(`${criticalCount} critical issue(s) found — review before release`);
    process.exit(1);
  }

  if (warnCount > 0) {
    console.warn(`${warnCount} warning(s) found — review before release`);
  }

  console.log("Health check complete.");
}

main();
