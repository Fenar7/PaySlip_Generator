/**
 * scripts/backfill-phase20-payout-eligibility.ts
 *
 * Phase 20 Sprint 20.5 — Payout eligibility backfill
 *
 * Evaluates MarketplaceRevenue records that are still in 'pending' status and
 * marks them as 'eligible' when:
 *   - The associated purchase is COMPLETED
 *   - The revenue record is at least 7 days old (cooling period)
 *   - No failure reason is recorded
 *
 * This is idempotent: records already in 'eligible', 'queued', or 'paid'
 * status are skipped entirely. Running this multiple times produces the same
 * result.
 *
 * Usage:
 *   # Dry run (no writes — just report what would change)
 *   DRY_RUN=true npx tsx scripts/backfill-phase20-payout-eligibility.ts
 *
 *   # Live run
 *   npx tsx scripts/backfill-phase20-payout-eligibility.ts
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const isDryRun = process.env.DRY_RUN === "true";
const COOLING_PERIOD_DAYS = 7;

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Phase 20 — Payout Eligibility Backfill");
  console.log(`  Mode: ${isDryRun ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  const coolingCutoff = new Date();
  coolingCutoff.setDate(coolingCutoff.getDate() - COOLING_PERIOD_DAYS);

  // Find pending revenue records past the cooling period with a completed purchase
  const candidates = await db.marketplaceRevenue.findMany({
    where: {
      status: "pending",
      failureReason: null,
      createdAt: { lte: coolingCutoff },
      purchase: {
        status: "COMPLETED",
      },
    },
    select: {
      id: true,
      publisherOrgId: true,
      publisherShare: true,
      createdAt: true,
      purchase: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${candidates.length} pending revenue record(s) eligible for backfill.\n`);

  if (candidates.length === 0) {
    console.log("Nothing to backfill — all pending records are either in cooling period or not yet completed.");
    await db.$disconnect();
    return;
  }

  let updated = 0;
  let skipped = 0;
  const now = new Date();

  for (const record of candidates) {
    const ageInDays = Math.floor(
      (now.getTime() - record.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    console.log(
      `  revenue ${record.id} | publisher ${record.publisherOrgId} | share ${record.publisherShare} | age ${ageInDays}d`,
    );

    if (!isDryRun) {
      await db.marketplaceRevenue.update({
        where: { id: record.id },
        data: {
          status: "eligible",
          eligibleAt: now,
          lastEvaluatedAt: now,
        },
      });
      updated++;
    } else {
      skipped++;
    }
  }

  console.log("\n───────────────────────────────────────────────────────────────");
  if (isDryRun) {
    console.log(`  DRY RUN: would update ${candidates.length} record(s) → 'eligible'`);
  } else {
    console.log(`  Updated ${updated} record(s) → 'eligible'`);
  }
  console.log("───────────────────────────────────────────────────────────────\n");

  await db.$disconnect();
  console.log("Backfill complete.");
}

main().catch(async (err) => {
  console.error("Backfill failed:", err);
  await db.$disconnect();
  process.exit(1);
});
