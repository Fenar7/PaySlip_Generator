-- Phase 26 Sprint 26.1: Multi-Entity Operations & Consolidation
-- Creates EntityGroup and InterCompanyTransfer models.
-- Extends Organization with entity hierarchy fields.

-- New enums
CREATE TYPE "EntityType" AS ENUM ('STANDALONE', 'HOLDING', 'SUBSIDIARY', 'BRANCH');
CREATE TYPE "InterCompanyTransferStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'CANCELLED');

-- EntityGroup: groups multiple orgs under a holding structure
CREATE TABLE "entity_group" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "admin_org_id" TEXT NOT NULL,
  "currency"    TEXT NOT NULL DEFAULT 'INR',
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "entity_group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "entity_group_admin_org_id_key" ON "entity_group"("admin_org_id");

-- InterCompanyTransfer: funds/docs moved between linked entities
CREATE TABLE "inter_company_transfer" (
  "id"                           TEXT NOT NULL,
  "entity_group_id"              TEXT NOT NULL,
  "source_org_id"                TEXT NOT NULL,
  "destination_org_id"           TEXT NOT NULL,
  "amount"                       DECIMAL(18,2) NOT NULL,
  "currency"                     TEXT NOT NULL DEFAULT 'INR',
  "description"                  TEXT NOT NULL,
  "transfer_date"                TIMESTAMP(3) NOT NULL,
  "reference_number"             TEXT,
  "status"                       "InterCompanyTransferStatus" NOT NULL DEFAULT 'DRAFT',
  "source_journal_entry_id"      TEXT,
  "destination_journal_entry_id" TEXT,
  "created_by_user_id"           UUID NOT NULL,
  "approved_by_user_id"          UUID,
  "posted_at"                    TIMESTAMP(3),
  "cancelled_at"                 TIMESTAMP(3),
  "created_at"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "inter_company_transfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inter_company_transfer_entity_group_id_status_idx"
  ON "inter_company_transfer"("entity_group_id", "status");
CREATE INDEX "inter_company_transfer_source_org_id_idx"
  ON "inter_company_transfer"("source_org_id");
CREATE INDEX "inter_company_transfer_destination_org_id_idx"
  ON "inter_company_transfer"("destination_org_id");

-- Extend Organization with multi-entity fields
ALTER TABLE "organization"
  ADD COLUMN "entity_group_id"        TEXT,
  ADD COLUMN "parent_org_id"          TEXT,
  ADD COLUMN "entity_type"            "EntityType" NOT NULL DEFAULT 'STANDALONE',
  ADD COLUMN "consolidation_currency" TEXT NOT NULL DEFAULT 'INR';

CREATE INDEX "organization_entity_group_id_idx" ON "organization"("entity_group_id");

-- Foreign keys: EntityGroup -> Organization (admin)
ALTER TABLE "entity_group"
  ADD CONSTRAINT "entity_group_admin_org_id_fkey"
  FOREIGN KEY ("admin_org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys: Organization -> EntityGroup (membership)
ALTER TABLE "organization"
  ADD CONSTRAINT "organization_entity_group_id_fkey"
  FOREIGN KEY ("entity_group_id") REFERENCES "entity_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: Organization -> Organization (parent-child)
ALTER TABLE "organization"
  ADD CONSTRAINT "organization_parent_org_id_fkey"
  FOREIGN KEY ("parent_org_id") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign keys: InterCompanyTransfer
ALTER TABLE "inter_company_transfer"
  ADD CONSTRAINT "inter_company_transfer_entity_group_id_fkey"
  FOREIGN KEY ("entity_group_id") REFERENCES "entity_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inter_company_transfer"
  ADD CONSTRAINT "inter_company_transfer_source_org_id_fkey"
  FOREIGN KEY ("source_org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inter_company_transfer"
  ADD CONSTRAINT "inter_company_transfer_destination_org_id_fkey"
  FOREIGN KEY ("destination_org_id") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
