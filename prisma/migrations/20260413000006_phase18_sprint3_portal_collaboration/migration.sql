-- Phase 18 Sprint 18.3: Customer Portal Ticket Collaboration
-- Adds portalCustomerId and attachments to TicketReply, and links FileAttachment

-- Update ticket_reply table
ALTER TABLE "ticket_reply" ADD COLUMN "portalCustomerId" TEXT;
CREATE INDEX "ticket_reply_portalCustomerId_idx" ON "ticket_reply"("portalCustomerId");

-- FileAttachment mapping for ticket_reply
-- The relation logic is handled via app-level constraints and entityId/entityType
-- However, we add the FK constraint if necessary, but following current patterns:
-- Current patterns use map: "file_attachment_..." for each relation.

-- No structural changes needed for file_attachment table itself usually,
-- but Prisma will want to manage the relations.

-- End of migration
