/**
 * Phase 19 Sprint 19.5 — Template Revision Backfill
 * 
 * Ensures all existing MarketplaceTemplates have at least one valid
 * MarketplaceTemplateRevision to lock historical data. Any MarketplacePurchase
 * without a revisionId will be bound to the latest revision of its template.
 * 
 * Rules:
 *   - Idempotent
 *   - Creates revisions only if none exist for a template
 *   - Safely binds dangling purchases
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildMarketplaceRevisionSnapshot } from "../src/lib/marketplace-template-revisions";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL must be set to run template revision backfill");
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function backfillTemplateRevisions() {
  console.log("Starting Template Revision backfill...");
  
  const templates = await db.marketplaceTemplate.findMany({
    include: {
      publisherOrg: {
        select: { name: true },
      },
      revisions: {
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      },
    },
  });

  let newRevisionsCount = 0;
  const templateToRevisionMap = new Map<string, string>();

  for (const tpl of templates) {
    let latestRevisionId: string | null = null;
    
    if (tpl.revisions.length === 0) {
      // Create an initial stable revision from current state
      const newRev = await db.marketplaceTemplateRevision.create({
        data: {
          templateId: tpl.id,
          ...buildMarketplaceRevisionSnapshot({
            name: tpl.name,
            description: tpl.description,
            templateType: tpl.templateType,
            version: tpl.version,
            templateData: tpl.templateData,
            previewImageUrl: tpl.previewImageUrl,
            previewPdfUrl: tpl.previewPdfUrl ?? null,
            status: tpl.status,
            publisherOrgId: tpl.publisherOrgId ?? null,
            publisherName: tpl.publisherName,
            publisherOrg: tpl.publisherOrg,
            createdAt: tpl.createdAt,
            reviewedByUserId: tpl.reviewedByUserId,
            reviewedAt: tpl.reviewedAt,
            reviewNotes: tpl.reviewNotes,
            rejectionReason: tpl.rejectionReason,
            publishedAt: tpl.publishedAt,
          }),
        },
      });
      latestRevisionId = newRev.id;
      newRevisionsCount++;
    } else {
      latestRevisionId = tpl.revisions[0].id;
    }
    
    if (latestRevisionId) {
      templateToRevisionMap.set(tpl.id, latestRevisionId);
    }
  }

  console.log(`Created ${newRevisionsCount} missing template revisions.`);

  // Repair unlinked purchases
  console.log("Binding legacy purchases to stable revisions...");
  const unlinkedPurchases = await db.marketplacePurchase.findMany({
    where: {
      status: "COMPLETED",
      revisionId: null,
    },
    select: {
      id: true,
      templateId: true,
    },
  });

  let linkedCount = 0;
  const orphanedPurchases: Array<{ id: string; templateId: string }> = [];
  for (const purchase of unlinkedPurchases) {
    const revId = templateToRevisionMap.get(purchase.templateId);
    if (revId) {
      await db.marketplacePurchase.update({
        where: { id: purchase.id },
        data: { revisionId: revId },
      });
      linkedCount++;
    } else {
      orphanedPurchases.push({
        id: purchase.id,
        templateId: purchase.templateId,
      });
    }
  }
  
  console.log(`Successfully bound ${linkedCount} legacy purchases out of ${unlinkedPurchases.length} to their template revisions.`);

  if (orphanedPurchases.length > 0) {
    const orphanPreview = orphanedPurchases
      .slice(0, 5)
      .map((purchase) => `${purchase.id} (template ${purchase.templateId})`)
      .join(", ");

    throw new Error(
      `Backfill found ${orphanedPurchases.length} completed marketplace purchases whose templates could not be resolved to revisions: ${orphanPreview}`,
    );
  }

  const [
    templatesWithoutRevisions,
    completedPurchasesWithoutRevision,
    publishedTemplatesWithoutPublishedRevision,
    duplicatePublishedRevisions,
  ] = await Promise.all([
    db.marketplaceTemplate.count({
      where: {
        revisions: { none: {} },
      },
    }),
    db.marketplacePurchase.count({
      where: {
        status: "COMPLETED",
        revisionId: null,
      },
    }),
    db.marketplaceTemplate.count({
      where: {
        status: "PUBLISHED",
        revisions: {
          none: {
            status: "PUBLISHED",
          },
        },
      },
    }),
    db.$queryRaw<Array<{ templateId: string; version: string; duplicate_count: bigint }>>`
      SELECT "templateId", "version", COUNT(*)::bigint AS duplicate_count
      FROM "marketplace_template_revisions"
      WHERE "status" = 'PUBLISHED'
      GROUP BY "templateId", "version"
      HAVING COUNT(*) > 1
    `,
  ]);

  console.log("Verification summary:");
  console.log(`   Templates without revisions: ${templatesWithoutRevisions}`);
  console.log(`   Completed purchases without revision: ${completedPurchasesWithoutRevision}`);
  console.log(
    `   Published templates without published revision: ${publishedTemplatesWithoutPublishedRevision}`,
  );
  console.log(`   Duplicate published revisions: ${duplicatePublishedRevisions.length}`);

  if (
    templatesWithoutRevisions > 0 ||
    completedPurchasesWithoutRevision > 0 ||
    publishedTemplatesWithoutPublishedRevision > 0 ||
    duplicatePublishedRevisions.length > 0
  ) {
    throw new Error("Template revision backfill verification failed");
  }

  return {
    newRevisionsCount,
    linkedCount,
    templatesWithoutRevisions,
    completedPurchasesWithoutRevision,
    publishedTemplatesWithoutPublishedRevision,
    duplicatePublishedRevisions: duplicatePublishedRevisions.length,
  };
}

async function main() {
  try {
    await backfillTemplateRevisions();
    console.log("✅ Template governance backfill complete.");
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
