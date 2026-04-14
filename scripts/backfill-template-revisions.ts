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

import { PrismaClient } from "../src/generated/prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new (PrismaClient as any)();

async function backfillTemplateRevisions() {
  console.log("Starting Template Revision backfill...");
  
  const templates = await db.marketplaceTemplate.findMany({
    include: {
      revisions: true,
    }
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
          version: tpl.version || "1.0.0",
          templateData: typeof tpl.templateData === "object" && tpl.templateData !== null ? tpl.templateData : {},
          previewImageUrl: tpl.previewImageUrl || "",
          previewPdfUrl: tpl.previewPdfUrl,
          status: tpl.status,
          createdBy: tpl.publisherOrgId,
          reviewedBy: tpl.reviewedBy,
          reviewedAt: tpl.reviewedAt,
          publishedAt: tpl.publishedAt,
          createdAt: tpl.createdAt,
        }
      });
      latestRevisionId = newRev.id;
      newRevisionsCount++;
    } else {
      // Sort and grab latest
      const revs = [...tpl.revisions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      latestRevisionId = revs[0].id;
    }
    
    if (latestRevisionId) {
      templateToRevisionMap.set(tpl.id, latestRevisionId);
    }
  }

  console.log(`Created ${newRevisionsCount} missing template revisions.`);

  // Repair unlinked purchases
  console.log("Binding legacy purchases to stable revisions...");
  const unlinkedPurchases = await db.marketplacePurchase.findMany({
    where: { revisionId: null }
  });

  let linkedCount = 0;
  for (const purchase of unlinkedPurchases) {
    const revId = templateToRevisionMap.get(purchase.templateId);
    if (revId) {
      await db.marketplacePurchase.update({
        where: { id: purchase.id },
        data: { revisionId: revId }
      });
      linkedCount++;
    }
  }
  
  console.log(`Successfully bound ${linkedCount} legacy purchases out of ${unlinkedPurchases.length} to their template revisions.`);
  return { newRevisionsCount, linkedCount };
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
