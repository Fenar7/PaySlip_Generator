/**
 * Sprint 1.3 — Legacy Sequence Migration
 *
 * Creates Sequence, SequenceFormat, and SequencePeriod rows from
 * legacy OrgDefaults invoicePrefix / invoiceCounter / voucherPrefix /
 * voucherCounter values.
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-sequences.ts
 *
 * Properties:
 *   - Idempotent: safe to re-run; skips orgs that already have sequences.
 *   - Batched: processes OrgDefaults in pages of 100.
 *   - Logs every created sequence ID for audit.
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { mapOrgDefaultsToSequences } from "@/features/sequences/migrations/legacy-mapper";
import { calculatePeriodBoundaries } from "@/features/sequences/engine/periodicity";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

const PAGE_SIZE = 100;

interface MigrationResult {
  orgsProcessed: number;
  sequencesCreated: number;
  formatsCreated: number;
  periodsCreated: number;
  skippedOrgs: number;
  errors: Array<{ orgId: string; error: string }>;
}

async function runMigration(): Promise<MigrationResult> {
  const result: MigrationResult = {
    orgsProcessed: 0,
    sequencesCreated: 0,
    formatsCreated: 0,
    periodsCreated: 0,
    skippedOrgs: 0,
    errors: [],
  };

  let cursor: string | undefined;

  for (;;) {
    const rows = await db.orgDefaults.findMany({
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        organizationId: true,
        invoicePrefix: true,
        invoiceCounter: true,
        voucherPrefix: true,
        voucherCounter: true,
      },
    });

    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      result.orgsProcessed++;

      // Check existing sequences for this org
      const existingSequences = await db.sequence.findMany({
        where: { organizationId: row.organizationId },
        select: { documentType: true },
      });
      const existingTypes = new Set(
        existingSequences.map((s) => s.documentType)
      );

      const seeds = mapOrgDefaultsToSequences({
        organizationId: row.organizationId,
        invoicePrefix: row.invoicePrefix,
        invoiceCounter: row.invoiceCounter,
        voucherPrefix: row.voucherPrefix,
        voucherCounter: row.voucherCounter,
      });

      let orgSkipped = true;

      for (const seed of seeds) {
        if (existingTypes.has(seed.documentType)) {
          continue; // idempotent skip
        }

        orgSkipped = false;

        try {
          await db.$transaction(async (tx) => {
            const sequence = await tx.sequence.create({
              data: {
                organizationId: seed.organizationId,
                name: seed.name,
                documentType: seed.documentType,
                periodicity: seed.periodicity,
                isActive: seed.isActive,
              },
            });

            await tx.sequenceFormat.create({
              data: {
                sequenceId: sequence.id,
                formatString: seed.format.formatString,
                startCounter: seed.format.startCounter,
                counterPadding: seed.format.counterPadding,
                isDefault: seed.format.isDefault,
              },
            });

            // Create initial period if periodicity is not NONE
            if (seed.periodicity !== "NONE") {
              const bounds = calculatePeriodBoundaries(
                new Date(),
                seed.periodicity
              );
              await tx.sequencePeriod.create({
                data: {
                  sequenceId: sequence.id,
                  startDate: bounds.startDate,
                  endDate: bounds.endDate,
                  currentCounter: seed.legacyNextCounter - 1,
                  status: "OPEN",
                },
              });
            }

            console.log(
              `Created ${seed.documentType} sequence for org ${seed.organizationId}: ${sequence.id}`
            );
          });

          result.sequencesCreated++;
          result.formatsCreated++;
          if (seed.periodicity !== "NONE") {
            result.periodsCreated++;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          result.errors.push({ orgId: row.organizationId, error: message });
          console.error(
            `Failed to create ${seed.documentType} sequence for org ${row.organizationId}:`,
            message
          );
        }
      }

      if (orgSkipped && seeds.length > 0) {
        result.skippedOrgs++;
      }
    }

    if (rows.length < PAGE_SIZE) break;
  }

  return result;
}

async function main() {
  console.log("Sprint 1.3 — Legacy Sequence Migration starting…\n");

  const result = await runMigration();

  console.log("\n───────────────────────────────────────────────────────────────");
  console.log("Migration complete:");
  console.log(`  Orgs processed:   ${result.orgsProcessed}`);
  console.log(`  Sequences created:  ${result.sequencesCreated}`);
  console.log(`  Formats created:    ${result.formatsCreated}`);
  console.log(`  Periods created:    ${result.periodsCreated}`);
  console.log(`  Skipped (existing): ${result.skippedOrgs}`);
  console.log(`  Errors:             ${result.errors.length}`);
  console.log("───────────────────────────────────────────────────────────────\n");

  if (result.errors.length > 0) {
    console.error("Some sequences failed to migrate. Review errors above.");
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
