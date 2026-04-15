-- Phase 19 Sprint 19.2 — Normalized document lifecycle/timeline layer
-- Migration: 20260414000002_phase19_sprint2_document_events

-- ─── DocumentEvent ─────────────────────────────────────────────────────────────
-- Append-only normalized lifecycle/event history for invoices, vouchers,
-- salary slips, and quotes. Feeds the SW Docs timeline UI on all detail pages.

CREATE TABLE IF NOT EXISTS "document_event" (
    "id"          TEXT        NOT NULL,
    "orgId"       TEXT        NOT NULL,
    "docType"     TEXT        NOT NULL,
    "documentId"  TEXT        NOT NULL,
    "eventType"   TEXT        NOT NULL,
    "actorId"     TEXT,
    "actorLabel"  TEXT,
    "eventAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata"    JSONB,

    CONSTRAINT "document_event_pkey" PRIMARY KEY ("id")
);

-- Org-cascade delete: events are deleted when the org is deleted
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'document_event_orgId_fkey'
    ) THEN
        ALTER TABLE "document_event"
            ADD CONSTRAINT "document_event_orgId_fkey"
            FOREIGN KEY ("orgId")
            REFERENCES "organization"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Primary timeline query: fetch all events for a document ordered by time
CREATE INDEX IF NOT EXISTS "document_event_orgId_docType_documentId_eventAt_idx"
    ON "document_event"("orgId", "docType", "documentId", "eventAt");

-- Org-wide event type queries (analytics / admin)
CREATE INDEX IF NOT EXISTS "document_event_orgId_eventType_eventAt_idx"
    ON "document_event"("orgId", "eventType", "eventAt");

-- Org-wide doc-type event queries
CREATE INDEX IF NOT EXISTS "document_event_orgId_docType_eventAt_idx"
    ON "document_event"("orgId", "docType", "eventAt");
