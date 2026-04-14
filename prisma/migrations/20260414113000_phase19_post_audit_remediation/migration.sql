-- Phase 19 post-audit remediation
-- Repair marketplace moderation metadata, revision snapshot integrity,
-- and deploy the missing revision schema safely on top of the Phase 15 marketplace tables.

-- ─── Marketplace template moderation metadata ────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'marketplace_templates'
      AND column_name = 'reviewedBy'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'marketplace_templates'
      AND column_name = 'reviewedByUserId'
  ) THEN
    ALTER TABLE "marketplace_templates"
      RENAME COLUMN "reviewedBy" TO "reviewedByUserId";
  END IF;
END $$;

ALTER TABLE "marketplace_templates"
  ADD COLUMN IF NOT EXISTS "reviewedByUserId" UUID,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- ─── Marketplace revisions schema ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "marketplace_template_revisions" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.0.0',
  "name" TEXT,
  "description" TEXT,
  "templateType" TEXT,
  "publisherDisplayName" TEXT,
  "templateData" JSONB NOT NULL,
  "previewImageUrl" TEXT NOT NULL,
  "previewPdfUrl" TEXT,
  "status" "MarketplaceTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByOrgId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedByUserId" UUID,
  "reviewedAt" TIMESTAMP(3),
  "reviewNotes" TEXT,
  "rejectionReason" TEXT,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "marketplace_template_revisions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'marketplace_template_revisions'
      AND column_name = 'createdBy'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'marketplace_template_revisions'
      AND column_name = 'createdByOrgId'
  ) THEN
    ALTER TABLE "marketplace_template_revisions"
      RENAME COLUMN "createdBy" TO "createdByOrgId";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'marketplace_template_revisions'
      AND column_name = 'reviewedBy'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'marketplace_template_revisions'
      AND column_name = 'reviewedByUserId'
  ) THEN
    ALTER TABLE "marketplace_template_revisions"
      RENAME COLUMN "reviewedBy" TO "reviewedByUserId";
  END IF;
END $$;

ALTER TABLE "marketplace_template_revisions"
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "templateType" TEXT,
  ADD COLUMN IF NOT EXISTS "publisherDisplayName" TEXT,
  ADD COLUMN IF NOT EXISTS "createdByOrgId" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedByUserId" UUID,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

ALTER TABLE "marketplace_template_revisions"
  ALTER COLUMN "createdByOrgId" TYPE TEXT USING "createdByOrgId"::TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketplace_template_revisions_templateId_fkey'
  ) THEN
    ALTER TABLE "marketplace_template_revisions"
      ADD CONSTRAINT "marketplace_template_revisions_templateId_fkey"
      FOREIGN KEY ("templateId")
      REFERENCES "marketplace_templates"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "marketplace_template_revisions_templateId_idx"
  ON "marketplace_template_revisions"("templateId");

-- ─── Marketplace purchase revision binding ───────────────────────────────────

ALTER TABLE "marketplace_purchases"
  ADD COLUMN IF NOT EXISTS "revisionId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'marketplace_purchases_revisionId_fkey'
  ) THEN
    ALTER TABLE "marketplace_purchases"
      ADD CONSTRAINT "marketplace_purchases_revisionId_fkey"
      FOREIGN KEY ("revisionId")
      REFERENCES "marketplace_template_revisions"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Backfill snapshot/provenance fields for existing revisions ──────────────

UPDATE "marketplace_template_revisions" AS revision
SET
  "createdByOrgId" = COALESCE(revision."createdByOrgId", template."publisherOrgId"),
  "name" = COALESCE(revision."name", template."name"),
  "description" = COALESCE(revision."description", template."description"),
  "templateType" = COALESCE(revision."templateType", template."templateType"),
  "publisherDisplayName" = COALESCE(
    revision."publisherDisplayName",
    NULLIF(org."name", ''),
    NULLIF(template."publisherName", ''),
    'Unknown publisher'
  )
FROM "marketplace_templates" AS template
LEFT JOIN "organization" AS org
  ON org."id" = template."publisherOrgId"
WHERE revision."templateId" = template."id";

ALTER TABLE "marketplace_template_revisions"
  ALTER COLUMN "name" SET NOT NULL,
  ALTER COLUMN "description" SET NOT NULL,
  ALTER COLUMN "templateType" SET NOT NULL,
  ALTER COLUMN "publisherDisplayName" SET NOT NULL;
